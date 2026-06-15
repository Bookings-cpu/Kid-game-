/* FRONT-END player — plays the real game through the real stack:
   real KeyboardEvent input -> the game's real keydown handler -> doLane/doJump/
   doSlide, and the real frame() loop (update + 3D render) every frame. The rAF
   loop + performance.now are decoupled from wall-clock (init script) so we can
   run many full sessions fast while STILL rendering each frame.
   Usage: node frontend-play.js [sessions] [stepCap] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const N = parseInt(process.argv[2] || '1000', 10);
const CAP = parseInt(process.argv[3] || '4000', 10);

(async () => {
  const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:412,height:824}, deviceScaleFactor:2 });

  // override the frame clock BEFORE the game loads so we can pump frames fast
  await ctx.addInitScript(() => {
    const cbs = [];
    window.__raf = cbs;
    window.requestAnimationFrame = (cb) => { cbs.push(cb); return cbs.length; };
    window.cancelAnimationFrame = () => {};
    window.__t = 0;
    try { Object.defineProperty(window.performance, 'now', { value: () => window.__t, configurable: true }); } catch (e) {}
    window.__pump = (dtMs) => {
      window.__t += dtMs;
      const due = cbs.splice(0, cbs.length);
      for (const cb of due) cb(window.__t); // real frame(): update + render3D
    };
  });

  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(t)) errs.push('CONSOLE: ' + t); });

  await page.goto('file:///home/user/Kid-game-/play.html');
  await page.waitForTimeout(800);

  const out = await page.evaluate(async ([N, CAP]) => {
    const clampLane = (l) => Math.max(-1, Math.min(1, l));
    const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    function trainZ(L){ let nz=Infinity; for(const o of G.obstacles){ if(o.kind!=='train')continue; if(Math.round(o.lane)!==L)continue; if(o.z<-10||o.z>700)continue; if(o.z<nz)nz=o.z; } return nz; }
    function blocked(L,h){ for(const o of G.obstacles){ if(o.kind!=='train')continue; if(Math.round(o.lane)!==L)continue; const r=G.speed+(o.vz||0)+1; const tf=(o.z-22)/r, tb=(o.z+o.len+12)/r; if(tf<h&&tb>0)return true; } return false; }
    function botKeys(){
      const cur = clampLane(Math.round(G.laneTarget));
      if (blocked(cur, 0.95)) {
        let dir=0,bz=-1;
        for(const d of [-1,1]){ const L=clampLane(cur+d); if(L===cur)continue; if(blocked(L,0.55))continue; const z=trainZ(L); if(z>bz){bz=z;dir=d;} }
        if(dir<0) key('ArrowLeft'); else if(dir>0) key('ArrowRight');
      } else {
        const z={'-1':trainZ(-1),'0':trainZ(0),'1':trainZ(1)}; let bL=cur;
        for(const L of [-1,0,1]){ if(z[L]>z[bL]+140 && !blocked(L,0.55)) bL=L; }
        if(bL<cur) key('ArrowLeft'); else if(bL>cur) key('ArrowRight');
      }
      for(const o of G.obstacles){
        if(o.kind==='ramp'||Math.round(o.lane)!==cur)continue;
        const t=(o.z-22)/(G.speed+(o.vz||0)+1);
        if(o.kind==='hurdle'&&t>0.05&&t<0.36&&G.jumpT<0) key('ArrowUp');
        else if((o.kind==='bar'||o.kind==='drone')&&t>0.05&&t<0.42&&G.slideT<0) key('ArrowDown');
      }
    }

    const lengths=[], scores=[]; const cause={guard:0,train:0,timeout:0};
    let maxObstacles=0, maxCoins=0, maxParts=0, maxFloats=0, thrown=0;
    let renderErrors=0;

    document.querySelectorAll('[id^="mod-"],[id^="ovl-"]').forEach(e=>e.classList.add('hidden'));
    for(let s=0;s<N;s++){
      startRun();
      let steps=0;
      while(G.state==='playing' && steps<CAP){
        botKeys();
        try { window.__pump(16); } catch(e){ renderErrors++; }
        // leak watch: pooled arrays must stay bounded
        if(G.obstacles.length>maxObstacles)maxObstacles=G.obstacles.length;
        if(G.coins.length>maxCoins)maxCoins=G.coins.length;
        if(G.parts.length>maxParts)maxParts=G.parts.length;
        if(G.floats.length>maxFloats)maxFloats=G.floats.length;
        if(!Number.isFinite(G.score)||!Number.isFinite(G.speed)||!Number.isFinite(G.laneF)) thrown++;
        steps++;
      }
      let c='timeout'; if(G.state!=='playing') c=G.caught?'guard':'train'; cause[c]++;
      lengths.push(+(steps/60).toFixed(1)); scores.push(Math.round(G.score));
      G.state='menu';
    }
    const stat=a=>{const b=a.slice().sort((x,y)=>x-y);const sum=b.reduce((s,v)=>s+v,0);return{min:b[0],p25:b[(b.length*0.25)|0],median:b[(b.length/2)|0],p75:b[(b.length*0.75)|0],max:b[b.length-1],mean:Math.round(sum/b.length)};};
    return { N, lengths:stat(lengths), scores:stat(scores), cause, maxObstacles, maxCoins, maxParts, maxFloats, nanFrames:thrown, renderErrors };
  }, [N, CAP]);

  console.log(JSON.stringify(out, null, 1));
  console.log('page/console errors:', errs.length ? '\n  ' + errs.slice(0,8).join('\n  ') : '(none)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
