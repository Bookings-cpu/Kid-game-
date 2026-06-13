# Rail Rascals — Art Direction Master (Visual Constitution)

> The single source of truth for how Rail Rascals looks. Every screen, prop and
> effect must trace back to this document. Updated alongside `tokens.css`.

## 0. Game context (source of truth)

- **Title:** Rail Rascals!
- **Genre / loop:** 3-lane endless runner — dodge trains, jump hurdles, roll
  under bars/drones, grab coins, chase distance; meta loop of heroes, pets,
  gear, missions, worlds.
- **Platform / stack:** Web + installable PWA. Vanilla HTML5 + CSS + JS.
  Real-time **3D via Three.js (r149)** with an automatic 2D-canvas fallback.
- **Camera:** Third-person chase cam, slightly high, looking down the track.
- **Audience:** Kids (and the casual-runner crowd). Touch-first, also keyboard.
- **Mood:** Bright, friendly, energetic, "sunny-Saturday-cartoon". Cute, never
  scary; punchy, never cluttered.
- **Monetisation:** Simulated rewarded-ads + gated coin-pack IAP flow (demo).

## 1. Visual identity

**One sentence:** A sunlit, chunky toon railway where rounded little rascals
sprint toward the horizon and everything glows like fresh candy.

**One paragraph:** Rail Rascals reads as a premium mobile toon-runner: bold
rounded silhouettes, cel-shaded surfaces with confident dark outlines, warm
key-lit forms against cool skies, and gold that genuinely glows. The world is
legible at a glance — a clear ribbon of track, generous negative space ahead for
reaction time, and friendly props that telegraph each biome. It is colourful but
disciplined: a controlled palette, one accent gold for reward, one red for
danger, and bloom reserved for things that matter (coins, fever, the sun).

**Quality benchmark (principles only, never copied):** the readable chunky
charm of Crossy Road and Brawl Stars; the clean cel silhouettes of Sable; the
warm poster-colour composition of Firewatch; Subway-style chase framing and
reward feedback.

**Never look like:** flat grey web-app UI, random blue-purple gradients, emoji
soup, a physics sandbox tech-demo, washed-out pastel mush, or "AI placeholder".

## 2. Shape language

- **Primary:** the circle/capsule. Heroes are rounded balls; coins are discs;
  buttons and pills are fully rounded. Friendliness = roundness.
- **Secondary:** the soft-cornered rectangle (panels, cards, signs) — radius
  18–26px UI, generous.
- **Silhouette rule:** every gameplay object must be recognisable as a black
  silhouette. Heroes, trains, drones, coins all read in one shape.
- **Danger shapes:** trains are big blunt blocks; drones are wide sweeping
  ovals; warning chevrons are sharp triangles. Sharpness = threat.
- **Reward shapes:** discs, stars, soft bursts. Roundness + radial = good.
- **Outlines:** characters and trains carry a dark toon outline (inflated
  back-side shell). This is the signature "crafted, not cheap" cue.

## 3. Colour system → see `tokens.css`

Anchor roles (full hex list in tokens):
- **Brand sky blue** `#3e8ef7` — menu/brand, theme color, water of the world.
- **Reward gold** `#ffd23e` (glow `#ffe14d`) — coins, XP, "good", the one
  colour allowed to bloom. Never use gold for danger or chrome.
- **Action orange** `#ff7a00→#ffb52e` — the PLAY button and primary CTAs only.
- **Danger red** `#ff5e5e / #e8443a` — trains, guard, crash, the red edge-pulse.
- **Success green** `#5ad845` — confirms, mission complete, "owned".
- **Hero purple** `#5232d0→#7c5cff` — panel screens & secondary buttons.
- **Neutral dark** `#1a103c` (bg), panel `#2b1a6e`, text white `#ffffff`.
- **World grounds** are per-biome (meadow green, desert sand, snow white,
  candy pink, volcano ember) — see THEMES in `game.js`.

Rules: one accent gold, one danger red, success green only for positive state.
Glow is reserved for gold/fever/sun. No more than ~3 saturated hues on screen
at once outside the gameplay world.

## 4. Typography

- **Family:** **Baloo 2** (rounded, friendly, free, Google Fonts) for
  everything, with `"Comic Sans MS"` then system rounded as offline fallback.
- **Title:** Baloo 2 800, heavy orange stroke + drop shadow, slight bounce.
- **Numbers/score:** Baloo 2 900, white, hard drop shadow for in-world contrast.
- **Body/buttons:** Baloo 2 800, sentence or ALL-CAPS for CTAs.
- **Min sizes:** mobile body ≥13px, buttons ≥16px (scaled down only under the
  `<375px` / `<660px` media queries). In-canvas banners auto-fit to ≤92% width.
- **Never:** decorative/serif/condensed fonts, more than one family.

## 5. Material & lighting language (3D)

- **Shading:** `MeshToonMaterial` with a 4-band gradient ramp — banded cel light,
  never smooth plastic PBR. Tone mapping: ACES filmic, exposure 1.0.
- **Key light:** warm directional sun `#fff0d0`, intensity ~1.55, high-right,
  casts 2048 soft shadows. **Rim light:** cool `#9fc4ff` back-light to pop the
  hero off the background. **Ambient:** cool hemisphere fill ~0.5.
- **Glow/bloom:** real bloom via a blurred bright-pass composited additively on
  the FX overlay. Reserved for coins, fever, the sun. Disabled on weak devices.
- **Surfaces:** procedural speckle on grass & gravel for grain; metallic-look
  gold coins (dark rim, glowing face, embossed star).
- **Fog:** distance fog in the sky colour — props fade in, never pop.

## 6. UI style

- **HUD:** minimal, top-anchored. Score centre, coins top-right pill, pause
  top-left. Power-up chips stack under the coin pill. Bottom-left thumb zone =
  hoverboard. Nothing covers the lower-centre play space.
- **Panels (shop/heroes/missions/settings):** purple gradient screens, white
  rounded header with back chevron + coin pill, scrollable card body.
- **Cards:** translucent white-on-purple, emoji/icon left, info middle (wraps,
  `min-width:0`), action button right (never shrinks).
- **Buttons:** chunky, 5px bottom "press" shadow, translate-down on active.
  Primary = orange (shine sweep), green = confirm, blue = secondary, grey =
  neutral/owned, red = danger, yellow = currency cost.
- **Modals:** centred `.dialog`, pop-scale entrance, dark blurred scrim.
- **Consistency:** every screen shares the same radius, shadow depth, font and
  colour roles. One game.

## 7. Motion

- Menu hero bobs; PLAY pulses + shine-sweeps; title bounces gently.
- Press = translateY(4px) + shadow collapse. Reward = pop-scale + confetti.
- Coins fly to the wallet counter; counter bumps on receipt.
- Restraint: no random bounces; motion always serves feedback or hierarchy.

## 8. VFX

- Coin pickup: gold burst + flying coin + rising-pitch chime + glow halo.
- Fever: rainbow border, white flash, sparkle aura, screen warm-wash.
- Crash: red+gold burst, screen shake, slow-zoom, noise impact.
- Guard close: red radial edge-pulse + heartbeat audio.
- Milestones/new-best: confetti rain + banner (queued, never stacked).

## 9. What "done" means
A screenshot of any screen should look like it belongs in a real store listing,
be readable at 320px width, and share one consistent identity with every other
screen. Judged in motion with sound, not only as a still.
