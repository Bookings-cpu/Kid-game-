#!/usr/bin/env node
/* Bundles index.html + style.css + three.min.js + renderer3d.js + game.js
   into the single standalone play.html. Re-run after editing any source. */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

let html = read('index.html');

// play.html is a self-contained single file — strip PWA-install links that
// only make sense for the served index.html (manifest + app icons).
html = html
  .replace('<link rel="manifest" href="manifest.json">', '')
  .replace('<link rel="icon" href="icon-192.png">', '')
  .replace('<link rel="apple-touch-icon" href="icon-192.png">', '');

const inlineScript = (file) =>
  '<script>\n' + read(file) + '\n</script>';

// inline CSS, then embed the self-hosted font as a data-URI so the single-file
// play.html needs no sidecar files and still works fully offline
let css = read('style.css');
const fontB64 = fs.readFileSync(path.join(dir, 'fonts/baloo2-latin.woff2')).toString('base64');
css = css.replace(
  'url("fonts/baloo2-latin.woff2") format("woff2")',
  `url("data:font/woff2;base64,${fontB64}") format("woff2")`
);
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>');
html = html.replace('<script src="three.min.js"></script>', inlineScript('three.min.js'));
html = html.replace('<script src="renderer3d.js"></script>', inlineScript('renderer3d.js'));
html = html.replace('<script src="game.js"></script>', inlineScript('game.js'));

fs.writeFileSync(path.join(dir, 'play.html'), html);
console.log('built play.html (' + html.length + ' bytes)');
