# Rail Rascals — Store / Distribution Readiness

How to get Rail Rascals in front of real players. Two viable routes; both are
realistic for a vanilla-JS PWA and require no rewrite.

## Route A — Web game portals (fastest, biggest reach)
HTML5 portals host games exactly like this one and bring 100M+ monthly players.

| Portal | Notes |
|---|---|
| **Poki** (sdk.poki.com) | Hand-curated. Integrate the Poki SDK: `gameplayStart/Stop`, `commercialBreak()` for rewarded/interstitial ads. Our simulated ad points map 1:1. |
| **CrazyGames** (docs.crazygames.com) | ≤50MB initial download (we're ~0.8MB), Chrome/Edge/Safari + Chromebook support, relative paths only, resume `AudioContext` on user gesture (already done). |
| **GameDistribution / GamePix** | Drop-in HTML5 hosting + ad SDK. |

**Readiness vs their bars:** download size ✅ (≪20MB mobile bar), portrait+touch ✅,
keyboard ✅, offline ✅, audio-on-gesture ✅, no absolute paths in `play.html` ✅,
focus-loss pause ✅. **To do before submit:** swap the simulated `openAd()` /
`Ad` module for the portal's rewarded-ad call; swap the demo coin-pack flow for
the portal's IAP or remove it.

## Route B — Google Play (and Microsoft Store) via PWA → TWA
Wrap the installed PWA in a Trusted Web Activity with **Bubblewrap**:
```
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<your-pages-url>/manifest.json
bubblewrap build      # produces a signed .aab for Play
```
Prereqs: host the repo (GitHub Pages — make repo public, Settings → Pages →
deploy branch), a $25 Play developer account, and `assetlinks.json` for domain
verification. `manifest.json` declares name/short_name, `id`/`scope`/`start_url`
(relative, so they work at any host path), `lang`/`dir`/`categories`,
`standalone` display with a `fullscreen` override, portrait, theme/background
colour, three icons (192 `any`, 512 `any`, and a dedicated **padded 512
maskable** so Android's adaptive mask never crops the character), and three real
phone `screenshots`. iOS App Store does **not** accept PWAs/TWAs — that needs a
Capacitor/WKWebView wrapper or a native port.

## Store listing assets
| Asset | Spec | Status |
|---|---|---|
| App icon (PWA/TWA) | 192 + 512 `any` + padded 512 `maskable` | ✅ `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` |
| App Store icon | 1024×1024, no alpha | ⏳ developer to export (iOS hard requirement) |
| Phone screenshots | ≥3, ≥1080-tall | ✅ `screenshot-1-menu.png`, `screenshot-2-run.png`, `screenshot-3-run.png` (824×1648, also wired into `manifest.json`) — upscale/add more in console as desired |
| Feature graphic | 1024×500 | ⏳ developer (Play listing) |
| Short description | ≤80 chars | "Dash, dodge trains & spin to win in this endless toon runner for kids!" |
| Full description | — | worlds, heroes, pets, daily spin, missions; note ads + parental-gated IAP |
| Privacy policy | hosted URL | ✅ drafted in `PRIVACY.md` — host at a public HTTPS URL and link it in both consoles |

## Compliance notes (kids category)
- **Parental gate** before any purchase ✅ (maths challenge).
- Mark as directed to children → enables Play "Designed for Families" / Apple
  Kids Category rules: certified ad SDKs only, no behavioural ads, data-safety
  form. Our IAP is parent-gated and the ads are rewarded/opt-in by design.
- No external links, chat, or personal-data collection in-game ✅.
- A real **trademark + app-store name search** (UK IPO/EUIPO/USPTO and the
  App Store / Play listings) for "Rail Rascals" is advised before commercial
  launch. This has not been formally cleared.

## Engineering readiness (reproducible in-repo)
Run these from the repo root (Node + the bundled Playwright; software WebGL):
- `node smoke.js` — functional checks (boot, save defaults, gameplay, spin cap,
  piggy accrual/cap/smash, near-win, settings toggles, self-hosted font, zero
  console errors). Currently passes.
- `node chaos.js 1000` — 1000 random-input stress sessions assert no crashes,
  NaNs, save corruption, negative balances, or piggy-cap overflow. Currently
  clean.
- `node shot.js` — headless screenshots across all 7 biomes + menu.
- `node build.js` — rebuilds the single-file `play.html` from source.
- Offline service worker (network-first HTML) + installable manifest.
- Save sanitization survives corrupted/old saves (see the `defaultSave()` /
  sanitizer in `game.js`).
