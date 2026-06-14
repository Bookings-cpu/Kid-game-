/* Autonomous player — a competent bot drives the REAL input functions
   (doLane/doJump/doSlide) through full sessions on a stepped clock, so we can
   "play" the game many times and measure whether it's fair, winnable and fun.
   Usage: node playbot.js [sessions]  (default 1000) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const N = parseInt(process.argv[2] || '1000', 10);
const CAP = parseInt(process.argv[3] || '6000', 10); // per-session step cap

(async () => {
  const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
  const page = await browser.newContext({ viewport:{width:412,height:824}, deviceScaleFactor:2 }).then(c=>c.newPage());
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///home/user/Kid-game-/play.html');
  await page.waitForTimeout(1000);

  const out = await page.evaluate(([N, CAP]) => {
    const clampLane = (l) => Math.max(-1, Math.min(1, l));
    // z of the nearest *train* in lane L (for pre-positioning preference)
    function trainZ(L) {
      let nz = Infinity;
      for (const o of G.obstacles) {
        if (o.kind !== 'train') continue;
        if (Math.round(o.lane) !== L) continue;
        if (o.z < -10 || o.z > 700) continue;
        if (o.z < nz) nz = o.z;
      }
      return nz;
    }
    // will lane L's hit zone be blocked by a train within `horizon` seconds?
    function blocked(L, horizon) {
      for (const o of G.obstacles) {
        if (o.kind !== 'train') continue;
        if (Math.round(o.lane) !== L) continue;
        const rate = G.speed + (o.vz || 0) + 1;
        const tFront = (o.z - 22) / rate;          // front enters hit zone
        const tBack = (o.z + o.len + 12) / rate;   // back clears hit zone
        if (tFront < horizon && tBack > 0) return true;
      }
      return false;
    }

    function bot() {
      const cur = clampLane(Math.round(G.laneTarget));
      // must vacate the current lane if a train will block it soon
      if (blocked(cur, 0.95)) {
        // step toward the safest lane, but only INTO a lane that's clear long
        // enough to cross (this is the timing a good player uses)
        let dir = 0, bestZ = -1;
        for (const d of [-1, 1]) {
          const L = clampLane(cur + d);
          if (L === cur) continue;
          if (blocked(L, 0.55)) continue;           // don't cross into a train
          const z = trainZ(L);
          if (z > bestZ) { bestZ = z; dir = d; }
        }
        if (dir !== 0) doLane(dir);
      } else {
        // pre-position toward the lane that stays clear longest (hysteresis)
        const z = { '-1': trainZ(-1), '0': trainZ(0), '1': trainZ(1) };
        let bestL = cur;
        for (const L of [-1, 0, 1]) { if (z[L] > z[bestL] + 140 && !blocked(L, 0.55)) bestL = L; }
        if (bestL !== cur) doLane(bestL > cur ? 1 : -1);
      }
      // jump/slide for hurdle/bar/drone in the committed lane
      for (const o of G.obstacles) {
        if (o.kind === 'ramp') continue;
        if (Math.round(o.lane) !== cur) continue;
        const t = (o.z - 22) / (G.speed + (o.vz || 0) + 1);
        if (o.kind === 'hurdle' && t > 0.05 && t < 0.36 && G.jumpT < 0) doJump();
        else if ((o.kind === 'bar' || o.kind === 'drone') && t > 0.05 && t < 0.42 && G.slideT < 0) doSlide();
      }
    }

    const scores = [], dists = [], lengths = [], coinsArr = [];
    const cause = { guard: 0, train: 0, timeout: 0 };
    const unfair = [];
    let totalStumbles = 0;
    const deathShots = [];
    let blockedDeaths = 0; // died with ALL three lanes train-blocked in the danger zone

    for (let s = 0; s < N; s++) {
      // fresh run; give a stock hoverboard so board mechanic is exercised occasionally
      startRun();
      G.state = 'playing';
      let steps = 0, lastGuard = G.guardD, stumbles = 0;
      let deathObs = null;
      while (G.state === 'playing' && steps < CAP) {
        bot();
        const beforeLane = Math.round(G.laneF);
        update(1 / 60);
        // detect a fresh stumble (guardD jumped up by ~0.4 without a crash)
        if (G.guardD > lastGuard + 0.3) stumbles++;
        lastGuard = G.guardD;
        steps++;
      }
      // classify death
      let c = 'timeout';
      if (G.state !== 'playing') c = G.caught ? 'guard' : 'train';
      cause[c]++;
      // on a train death, snapshot the danger zone to judge avoidability
      if (c === 'train') {
        const near = G.obstacles.filter(o => o.z > -30 && o.z < 160).map(o => ({ k: o.kind[0], lane: Math.round(o.lane), z: Math.round(o.z), len: Math.round(o.len) }));
        // which lanes have a train overlapping the immediate hit zone (z in [-20,40])?
        const trainLanes = new Set(G.obstacles.filter(o => o.kind === 'train' && o.z < 45 && o.z + o.len > -15).map(o => Math.round(o.lane)));
        const allBlocked = [-1, 0, 1].every(L => trainLanes.has(L));
        if (allBlocked) blockedDeaths++;
        if (deathShots.length < 12) deathShots.push({ dist: Math.round(G.dist), speed: Math.round(G.speed), laneF: +G.laneF.toFixed(2), trainLanes: [...trainLanes], allBlocked, near });
      }
      scores.push(Math.round(G.score));
      dists.push(Math.round(G.dist));
      lengths.push(+(steps / 60).toFixed(1));
      coinsArr.push(G.runCoins);
      totalStumbles += stumbles;
      // flag suspiciously short deaths (died very early — possible unfairness)
      if (steps < 240 && c !== 'timeout') unfair.push({ steps, cause: c, score: Math.round(G.score) });
      G.state = 'menu';
    }

    const stat = (a) => {
      const b = a.slice().sort((x, y) => x - y);
      const sum = b.reduce((s, v) => s + v, 0);
      return { min: b[0], p25: b[Math.floor(b.length*0.25)], median: b[Math.floor(b.length/2)], p75: b[Math.floor(b.length*0.75)], max: b[b.length-1], mean: Math.round(sum/b.length) };
    };
    return {
      N, scores: stat(scores), dists: stat(dists), lengths: stat(lengths), coins: stat(coinsArr),
      cause, avgStumblesPerRun: +(totalStumbles / N).toFixed(2),
      earlyDeaths: unfair.length, earlyDeathSamples: unfair.slice(0, 8),
      blockedDeaths, blockedPct: +(100 * blockedDeaths / Math.max(1, cause.train)).toFixed(1),
      deathShots: deathShots.slice(0, 10),
    };
  }, [N, CAP]);

  console.log(JSON.stringify(out, null, 1));
  console.log('page errors:', errs.length ? errs.slice(0,3).join(' | ') : '(none)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
