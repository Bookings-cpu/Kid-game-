/* Functional smoke test — loads play.html headless, drives gameplay and the
   new settings, and asserts no errors plus correct economy/save behaviour. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

let failures = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) failures++; };

(async () => {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });
  const page = await browser.newContext({ viewport: { width: 412, height: 820 }, deviceScaleFactor: 2 })
    .then(c => c.newPage());

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text()); });

  await page.goto('file://' + path.join(__dirname, 'play.html'));
  await page.waitForTimeout(1200);

  // 1. boots cleanly, 3D on
  const boot = await page.evaluate(() => ({ use3d: typeof USE3D !== 'undefined' && USE3D, reduce: typeof REDUCE !== 'undefined' }));
  ok(boot.use3d, '3D renderer active on boot');
  ok(boot.reduce, 'REDUCE flag defined');

  // 2. save has the new fields with correct defaults
  const sv = await page.evaluate(() => ({ haptics: S.haptics, reduceFx: S.reduceFx, souv: S.souvenirs.length, hunt: S.wordHunt.got.length, spinChain: typeof spinChain }));
  ok(sv.haptics === true, 'S.haptics defaults true');
  ok(sv.reduceFx === false, 'S.reduceFx defaults false');
  ok(sv.souv === 7, 'souvenirs length matches THEMES (7), got ' + sv.souv);
  ok(sv.hunt === 6, 'wordHunt.got length matches RASCAL (6), got ' + sv.hunt);
  ok(sv.spinChain === 'number', 'spinChain counter exists');

  // 3. start a run and confirm it advances + scores
  await page.evaluate(() => { document.querySelectorAll('[id^="mod-"],[id^="ovl-"]').forEach(e=>e.classList.add('hidden')); startRun(); });
  await page.waitForTimeout(150);
  const s0 = await page.evaluate(() => ({ state: G.state, score: G.score }));
  ok(s0.state === 'playing', 'run started (state=playing)');
  await page.waitForTimeout(900);
  const s1 = await page.evaluate(() => G.score);
  ok(s1 > s0.score, 'score advances during play (' + s0.score + ' -> ' + s1 + ')');

  // 4. spin chain cap: simulate landing +SPIN many times
  const spinTest = await page.evaluate(() => {
    spinChain = 0; spinFreebie = false;
    const plus = SPIN_PRIZES.find(p => p.label === '+SPIN');
    const results = [];
    for (let i = 0; i < 5; i++) results.push(plus.apply());
    return { results, chain: spinChain };
  });
  const freebies = spinTest.results.filter(r => /FREE/.test(r)).length;
  ok(freebies === 2, '+SPIN grants at most 2 chained freebies, got ' + freebies);
  ok(spinTest.chain === 2, 'spinChain caps at 2');

  // 5. settings toggles flip and persist
  const tgl = await page.evaluate(() => {
    showScreen('settings');
    document.getElementById('tgl-haptics').click();
    document.getElementById('tgl-reduce').click();
    return { haptics: S.haptics, reduceFx: S.reduceFx, reduceFlag: REDUCE, bodyClass: document.body.classList.contains('reduce-motion') };
  });
  ok(tgl.haptics === false, 'haptics toggle off works');
  ok(tgl.reduceFx === true, 'reduceFx toggle on works');
  ok(tgl.reduceFlag === true, 'REDUCE flag follows reduceFx');
  ok(tgl.bodyClass === true, 'body.reduce-motion class applied');

  // 6. font self-hosted (loaded, no network)
  const font = await page.evaluate(async () => { try { await document.fonts.ready; return document.fonts.check('800 30px "Baloo 2"'); } catch(e){ return false; } });
  ok(font, 'Baloo 2 self-hosted font loaded');

  ok(errors.length === 0, 'no page/console errors (' + errors.slice(0,3).join(' | ') + ')');

  await browser.close();
  console.log(failures === 0 ? '\nALL SMOKE CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
