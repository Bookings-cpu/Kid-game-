/* One-off asset generator: a full-bleed padded maskable icon + real PWA
   manifest screenshots. Run with: node tools-gen-assets.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const dir = __dirname;

(async () => {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });

  /* ---- 1. maskable icon: brand-blue full-bleed + existing icon centred in the
     safe zone, so Android's adaptive mask never crops the character ---- */
  {
    const page = await browser.newPage();
    const b64 = fs.readFileSync(path.join(dir, 'icon-512.png')).toString('base64');
    await page.setContent('<canvas id="c" width="512" height="512"></canvas>');
    const dataUrl = await page.evaluate(async (src) => {
      const c = document.getElementById('c'), x = c.getContext('2d');
      // full-bleed brand gradient (edge to edge — the mask supplies the shape)
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, '#6cc4ff'); g.addColorStop(1, '#3e8ef7');
      x.fillStyle = g; x.fillRect(0, 0, 512, 512);
      // draw the existing icon scaled to ~82% and centred (safe-zone is the
      // central 80% circle); its own blue blends into the gradient
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + src; });
      const s = 512 * 0.82, o = (512 - s) / 2;
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, o, o, s, s);
      return c.toDataURL('image/png');
    }, b64);
    fs.writeFileSync(path.join(dir, 'icon-512-maskable.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('wrote icon-512-maskable.png');
    await page.close();
  }

  /* ---- 2. manifest screenshots: clean menu + two gameplay frames ---- */
  const shots = [
    { name: 'screenshot-1-menu.png', setup: () => {
        document.querySelectorAll('[id^="mod-"],[id^="ovl-"]').forEach(e => e.classList.add('hidden'));
        if (typeof G !== 'undefined') G.state = 'menu';
        const m = document.getElementById('scr-menu'); if (m) m.classList.remove('hidden');
        const gm = document.getElementById('scr-game'); if (gm) gm.classList.add('hidden');
        if (typeof S !== 'undefined') { S.coins = 2450; S.piggy = 760; S.best = 8120; }
        if (typeof showScreen === 'function') showScreen('menu');
      } },
    { name: 'screenshot-2-run.png', biome: 0 },
    { name: 'screenshot-3-run.png', biome: 5 },
  ];
  const page = await browser.newContext({ viewport: { width: 412, height: 824 }, deviceScaleFactor: 2 })
    .then(c => c.newPage());
  await page.goto('file://' + path.join(dir, 'play.html'));
  await page.waitForTimeout(1200);
  for (const sh of shots) {
    if (sh.setup) {
      await page.evaluate(sh.setup);
    } else {
      await page.evaluate(() => { document.querySelectorAll('[id^="mod-"],[id^="ovl-"]').forEach(e => e.classList.add('hidden')); if (typeof startRun === 'function') startRun(); });
      await page.evaluate((idx) => {
        G.themeIdx = idx; G.dist = idx * 2500 + 600; G.score = idx * 2000 + 1500;
        G.speed = 360; G.boardT = 0; G.state = 'playing';
        G.annQ = []; G.annT = 0; G.tutorIdx = 99; G.rushWarn = 0;
        // a couple of coins/obstacle for a lively frame
        for (let z = 120; z < 700; z += 90) G.coins.push({ laneF: (z % 3) - 1, z, spin: 0, h: 0 });
      }, sh.biome);
    }
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(dir, sh.name) });
    console.log('wrote', sh.name);
  }
  await browser.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
