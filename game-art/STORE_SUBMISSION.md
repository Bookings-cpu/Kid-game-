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
verification. `manifest.json` already declares name, icons (192/512 maskable),
theme/background colour, portrait, fullscreen. iOS App Store does **not** accept
PWAs/TWAs — that needs a Capacitor/WKWebView wrapper or a native port.

## Store listing assets (to produce)
| Asset | Spec | Source |
|---|---|---|
| App icon | 512×512 (have 192 + 512) | `icon-*.png` ✅ |
| Feature graphic | 1024×500 | from in-game shots + wordmark |
| Phone screenshots | ≥3, 1080×1920 | menu, gameplay (curved world), fever, shop, spin |
| Short description | ≤80 chars | "Dash, dodge trains & spin to win in this endless toon runner for kids!" |
| Full description | — | worlds, heroes, pets, daily spin, missions; note ads + parental-gated IAP |
| Privacy policy | URL | required (kids category → COPPA/age flags) |

## Compliance notes (kids category)
- **Parental gate** before any purchase ✅ (maths challenge).
- Mark as directed to children → enables Play "Designed for Families" / Apple
  Kids Category rules: certified ad SDKs only, no behavioural ads, data-safety
  form. Our IAP is parent-gated and the ads are rewarded/opt-in by design.
- No external links, chat, or personal-data collection in-game ✅.
- A real **trademark search** (UK IPO/EUIPO/USPTO) for "Rail Rascals" is advised
  before commercial launch (app-store name check already done — no collision).

## Verified engineering readiness
- 10,000-session swarm: 0 problems / 0 errors / 0 violations.
- 40-device layout/lifecycle/store panel: clean (only GPU-less frame timing).
- Offline service worker + installable manifest.
- Save sanitization survives corrupted/old saves.
