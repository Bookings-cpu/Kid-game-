/* Headless screenshot harness — loads play.html with software WebGL and
   captures the menu plus in-run frames across every biome. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT = '/tmp/shots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox',
    ],
  });
  const page = await browser.newContext({
    viewport: { width: 412, height: 820 }, deviceScaleFactor: 2,
  }).then(c => c.newPage());

  const logs = [];
  page.on('console', m => logs.push('[console] ' + m.text()));
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));

  await page.goto('file://' + path.join(__dirname, 'play.html'));
  await page.waitForTimeout(1200);

  const mode = await page.evaluate(() => ({
    use3d: typeof USE3D !== 'undefined' ? USE3D : null,
    lowGfx: window.__lowGfx || false,
    themes: (typeof THEMES !== 'undefined' ? THEMES : []).map(t => t.name),
  }));
  console.log('renderer:', JSON.stringify(mode));

  // dismiss any open modal/overlay, then start a fresh run
  await page.evaluate(() => {
    document.querySelectorAll('.modal, .overlay, [id^="mod-"], [id^="ovl-"]').forEach(e => e.classList.add('hidden'));
    if (typeof startRun === 'function') startRun();
  });
  await page.waitForTimeout(600);

  for (let i = 0; i < 7; i++) {
    await page.evaluate((idx) => {
      if (typeof G !== 'undefined') {
        G.themeIdx = idx;
        G.dist = idx * 2500 + 120;   // cyc = idx + 0.05 → squarely on biome idx
        G.score = idx * 2000 + 400;
        G.speed = 360;
        G.boardT = 0;
        G.state = 'playing';
        // clear UI banners that would cover the scene
        G.annQ = []; G.annT = 0; G.tutorIdx = 99; G.rushWarn = 0;
        if (window.__clearToast) window.__clearToast();
      }
    }, i);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `biome-${i}.png`) });
  }

  // back to menu for a clean wordmark shot
  await page.evaluate(() => {
    document.querySelectorAll('.modal, .overlay, [id^="mod-"], [id^="ovl-"]').forEach(e => e.classList.add('hidden'));
    if (typeof G !== 'undefined') G.state = 'menu';
    const m = document.getElementById('scr-menu'); if (m) m.classList.remove('hidden');
    const g = document.getElementById('scr-game'); if (g) g.classList.add('hidden');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '0-menu.png') });

  console.log('--- logs (first 30) ---');
  console.log(logs.slice(0, 30).join('\n'));
  await browser.close();
  console.log('done -> ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
