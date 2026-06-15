const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
  const page = await browser.newContext({ viewport:{width:412,height:824}, deviceScaleFactor:2 }).then(c=>c.newPage());
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///home/user/Kid-game-/play.html');
  await page.waitForTimeout(1000);

  const out = await page.evaluate(() => {
    const R = {};

    // ---- 1. spawnChunk fairness: instrument the corridor logic by monkeypatching ----
    // We re-implement the candidate logic by calling spawnChunk many times across a
    // sweep of G.lastSafe values and dist values, and record:
    //   - how often candidate set is empty at each fallback level
    //   - max jump distance forced (|safeLane - prevSafe|)
    const PATTERNS_local = (() => { try { return PATTERNS; } catch(e){ return null; } })();
    function patSafe(p){ const s=[]; p.forEach((k,i)=>{ if(!k||k!=='train') s.push(i-1); }); return s; }

    // Corridor analysis: for every lastSafe in [-1,0,1] and easy/hard, count candidate sizes
    const corridor = {};
    for (const easy of [true,false]) {
      for (const lastSafe of [-1,0,1]) {
        let cand = PATTERNS.filter(p => {
          if (easy && p.filter(k=>k==='train').length>1) return false;
          return patSafe(p).some(l => Math.abs(l-lastSafe)<=1);
        });
        const fb1 = (!cand.length) ? PATTERNS.filter(p => patSafe(p).some(l => Math.abs(l-lastSafe)<=1)) : null;
        const fb2 = (fb1 && !fb1.length);
        corridor[`easy=${easy},lastSafe=${lastSafe}`] = {
          candCount: cand.length,
          fellToFb1: !cand.length,
          fb1Count: fb1?fb1.length:null,
          fellToRandom: fb2,
        };
      }
    }
    R.corridor = corridor;

    // Now actually RUN spawnChunk in a controlled way to measure forced jumps.
    // Drive a real run but record G.lastSafe transitions each spawn.
    let maxJump = 0, jumpHist = {0:0,1:0,2:0};
    let emptyCandHits = 0, randomFallbackHits = 0;
    // wrap spawnChunk to observe lastSafe before/after AND detect fallback
    const origPick = window.pick;
    // monkeypatch PATTERNS filter detection by wrapping spawnChunk
    const origSpawn = spawnChunk;
    window.spawnChunk = function(){
      const prev = G.lastSafe;
      // replicate candidate computation to detect fallback level
      const easy = G.dist < 900;
      let cand = PATTERNS.filter(p => {
        if (easy && p.filter(k=>k==='train').length>1) return false;
        return patSafe(p).some(l => Math.abs(l-prev)<=1);
      });
      if (!cand.length){ emptyCandHits++; cand = PATTERNS.filter(p => patSafe(p).some(l=>Math.abs(l-prev)<=1)); }
      if (!cand.length){ randomFallbackHits++; }
      origSpawn();
      const jump = Math.abs(G.lastSafe - prev);
      if (jump>maxJump) maxJump=jump;
      jumpHist[jump] = (jumpHist[jump]||0)+1;
    };

    // run a long session without dying (god mode): set invinc high, ignore collisions
    startRun(); G.state='playing';
    const profile=[]; // sample speed/density vs dist
    let spawnsInWindow=0, lastSampleDist=0;
    // count spawns by overriding again to also tally density
    const spawnCounter = ()=>{ spawnsInWindow++; };
    for (let i=0;i<60000 && G.state==='playing';i++){
      G.invinc = 5; // never die
      G.guardD = 0;
      const before = G.spawnAt;
      update(1/60);
      if (G.spawnAt > before) spawnsInWindow++; // a spawn reset spawnAt upward
      if (G.dist - lastSampleDist >= 500){
        profile.push({ dist: Math.round(G.dist), speed: Math.round(G.speed),
          spawnGapTarget: Math.round(G.spawnAt), nObs: G.obstacles.length,
          spawns500: spawnsInWindow });
        spawnsInWindow=0; lastSampleDist=G.dist;
      }
      if (G.dist>16000) break;
    }
    R.maxForcedJump = maxJump;
    R.jumpHist = jumpHist;
    R.emptyCandHits = emptyCandHits;
    R.randomFallbackHits = randomFallbackHits;
    R.profile = profile;
    R.finalSanity = {
      dist: G.dist, speed: G.speed, score: G.score, runCoins: G.runCoins,
      distFinite: Number.isFinite(G.dist), speedFinite: Number.isFinite(G.speed),
      scoreFinite: Number.isFinite(G.score), nObs: G.obstacles.length, nCoins: G.coins.length,
    };
    window.spawnChunk = origSpawn;

    return R;
  });

  console.log(JSON.stringify(out, null, 1));
  console.log('page errors:', errs.length ? errs.slice(0,5).join(' | ') : '(none)');
  await browser.close();
})().catch(e=>{ console.error(e); process.exit(1); });
