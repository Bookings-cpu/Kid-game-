/* Chaos/stress harness — runs many fast simulated sessions with random input
   and a stepped clock, asserting no crashes, NaNs, or save corruption. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const SESSIONS = parseInt(process.argv[2] || '300', 10);

(async () => {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const page = await browser.newContext({ viewport: { width: 412, height: 820 }, deviceScaleFactor: 2 })
    .then(c => c.newPage());

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.goto('file://' + path.join(__dirname, 'play.html'));
  await page.waitForTimeout(1000);

  const result = await page.evaluate((N) => {
    // deterministic PRNG so failures reproduce
    let s = 1234567;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pick = (a) => a[Math.floor(rnd() * a.length)];

    const problems = [];
    const finite = (v) => typeof v === 'number' && Number.isFinite(v);
    const keyActions = ['left', 'right', 'up', 'down'];
    const apply = (k) => {
      if (k === 'left') G.laneTarget = Math.max(-1, Math.round(G.laneF) - 1);
      else if (k === 'right') G.laneTarget = Math.min(1, Math.round(G.laneF) + 1);
      else if (k === 'up') { G.queueJump = true; if (G.jumpT < 0) G.jumpT = 0; }
      else if (k === 'down') { if (G.slideT < 0) G.slideT = 0; }
    };

    for (let n = 0; n < N; n++) {
      // fresh-ish run
      document.querySelectorAll('[id^="mod-"],[id^="ovl-"]').forEach(e => e.classList.add('hidden'));
      try { startRun(rnd() < 0.15); } catch (e) { problems.push('startRun: ' + e.message); break; }
      let steps = 0;
      while (G.state === 'playing' && steps < 900) {
        if (rnd() < 0.4) apply(pick(keyActions));
        // sometimes grab a powerup / board
        if (rnd() < 0.02 && typeof G.pu === 'object') G.pu.shield = 2;
        try { update(0.016 + rnd() * 0.02); } catch (e) { problems.push('update: ' + e.message); break; }
        // invariants
        if (!finite(G.score) || !finite(G.speed) || !finite(G.dist) || !finite(G.laneF)) {
          problems.push(`NaN at run ${n} step ${steps}: score=${G.score} speed=${G.speed} dist=${G.dist} laneF=${G.laneF}`);
          break;
        }
        if (G.runCoins < 0 || S.coins < 0 || S.piggy < 0) {
          problems.push(`negative balance run ${n}: runCoins=${G.runCoins} coins=${S.coins} piggy=${S.piggy}`);
          break;
        }
        steps++;
      }
      // force a game over to exercise banking/save
      try { if (G.state === 'playing' || G.state === 'dying') { G.score = G.score || 0; gameOver(); } } catch (e) { problems.push('gameOver: ' + e.message); }
      // piggy never exceeds cap; save round-trips
      if (S.piggy > PIGGY_CAP) problems.push('piggy over cap: ' + S.piggy);
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        const parsed = JSON.parse(raw);
        if (!finite(parsed.coins) || !finite(parsed.best) || !finite(parsed.piggy)) problems.push('save corrupt run ' + n);
      } catch (e) { problems.push('save parse: ' + e.message); }
      if (problems.length > 8) break;
    }
    return { problems, coins: S.coins, best: S.best, piggy: S.piggy, runs: S.stats.runs };
  }, SESSIONS);

  console.log(`=== ${SESSIONS} chaos sessions ===`);
  console.log('final: coins=%d best=%d piggy=%d runs=%d', result.coins, result.best, result.piggy, result.runs);
  console.log('problems:', result.problems.length ? result.problems.slice(0, 10).join('\n  ') : '(none)');
  console.log('page errors:', errors.length ? errors.slice(0, 5).join('\n  ') : '(none)');
  await browser.close();
  const failed = result.problems.length > 0 || errors.length > 0;
  console.log(failed ? '\nCHAOS FAILED ❌' : '\nCHAOS CLEAN ✅');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
