# Rail Rascals — Asset Manifest

Rail Rascals is **code-generated**: nearly every visual is drawn procedurally
(Three.js meshes + Canvas2D), so there are very few binary assets. This is a
deliberate pipeline choice — zero external art dependencies, infinitely
scalable, tiny download. The manifest below reflects that.

Legend — Source: `code` (generated at runtime) · `file` (binary in repo) ·
`webfont` (CDN with offline fallback). Status: ✅ done · 🔶 partial · ⬜ todo.

## Branding
| Asset | Type | Source | File / location | Status |
|---|---|---|---|---|
| Game logo (RAIL RASCALS) | CSS text + stroke | code | `index.html .game-title` | ✅ |
| App icon 192/512 | PNG (maskable) | file | `icon-192.png`, `icon-512.png` | ✅ |
| PWA manifest | JSON | file | `manifest.json` | ✅ |
| Loading/splash | — (instant boot) | — | n/a (no loader needed) | ✅ |
| Store capsule / key art | PNG | — | generate from in-game shots | ⬜ |
| Social preview (og:image) | PNG 1200×630 | — | marketing | ⬜ |

## Menus & screens (all CSS/DOM)
| Screen | Source | File | Status |
|---|---|---|---|
| Main menu | code | `index.html #scr-menu` + `style.css` | ✅ |
| Shop (gear/pets/upgrades/packs) | code | `#scr-shop` | ✅ |
| Heroes | code | `#scr-chars` (3D-drawn portraits) | ✅ |
| Missions (+word hunt, souvenirs) | code | `#scr-missions` | ✅ |
| Settings / stats | code | `#scr-settings` | ✅ |
| Pause / Continue / Game-over | code | `#ovl-*` dialogs | ✅ |
| Mystery box / Daily / Gate / Ad | code | `#mod-*` modals | ✅ |

## HUD
| Element | Source | Status |
|---|---|---|
| Score, coins pill, pause, power-up chips | code (DOM) | ✅ |
| Hoverboard button, board count | code | ✅ |
| Danger edge-pulse, fever border, combo banners | code (Canvas fx) | ✅ |
| XP bar + level badge | code | ✅ |

## Icons
Currently emoji glyphs for menu/HUD affordances (🪙 🎁 🛹 🐾 🎯 etc.) — fast and
universally legible. 🔶 **Upgrade path:** replace with a custom SVG icon set
(`game-art/PROMPTS/icons.md`) for a fully bespoke identity. Currency, shop,
heroes, missions, settings, lock, alert, rarity = priority set.

## World / characters / props (3D, all code)
| Asset | Source | File | Status |
|---|---|---|---|
| 6 heroes (rigged toon, outlined) | code | `renderer3d.js makeChar` | ✅ |
| Guard chaser | code | `makeChar` (grey) | ✅ |
| 3 pets | code (emoji sprite) | 🔶 (could be meshes) | 🔶 |
| Trains / hurdles / bars / drones / ramps | code | `renderer3d.js` factories | ✅ |
| Coins (rim+face+star+glow) | code | `makeCoin` | ✅ |
| 5 biomes of scenery (tree/cactus/pine/lolly/lava…) | code | `makeDecor` | ✅ |
| Sky, sun, clouds, mountains, gantries, poles, fences | code | `renderer3d.js init` | ✅ |

## VFX (all code)
Particles, coin-fly, fever sparkle, confetti, crash burst, smoke, dust, **bloom
(bright-pass composite)**, vignette, speed-lines, danger pulse — ✅.

## Audio-visual sync
WebAudio SFX synced to: coin (rising pitch w/ combo), jump, slide, crash
(+noise), power-up, fever, mission, level-up, guard heartbeat. Music = generated
chiptune w/ kick/hats/bass. ✅
