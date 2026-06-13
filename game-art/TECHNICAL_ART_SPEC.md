# Rail Rascals — Technical Art Spec

## Targets
- **Primary:** mobile portrait, browser + installed PWA. Also desktop/tablet.
- **Orientation:** portrait-locked. Landscape phones show a "rotate" overlay.
- **Resolutions verified:** 320×568 → 1920×1080, portrait & landscape, across a
  40-device test matrix (`devpanel-big.js`).
- **Aspect:** full-bleed canvas; UI uses `max-width` rails (430/520px) centred.

## Scaling & safe zones
- Canvas: `width=innerWidth*DPR`, DPR capped at 2 (1 on weak GPUs).
- UI scale breakpoints: base; `≤740px` & `≤660px` height (compact dialogs/menu);
  `≤374px` width (typography down-scale). All defined in `style.css`.
- Min touch target ≈ 52–74px (round nav buttons), CTAs ≥ 48px tall.
- Safe area: HUD top padding 12px; bottom-left hoverboard at 26px inset.

## Typography sizes
- Title `min(13.5vw,62px)`; score 30px/900; body 14–19px; buttons 16–23px;
  in-canvas banners auto-fit to ≤92% screen width (measureText shrink loop).

## 3D render budget
- One `WebGLRenderer`, `antialias:true`, `preserveDrawingBuffer:true` (for the
  bloom sample), ACES tone mapping, PCFSoft shadows (2048 map).
- **Object pooling** for all spawned entities (trains/coins/pickups/decor) —
  zero per-frame allocation in steady state.
- **Adaptive quality:** measures avg frame cost over first 90 frames; if
  >26ms, disables shadows, drops pixelRatio to 1, and sets `window.__lowGfx`
  (which also disables the canvas bloom pass).
- Single directional sun + hemisphere + rim light. Fog near/far 21/44 world u.

## Bloom (post)
- Implemented as a Canvas2D bright-pass: the WebGL frame is drawn into the FX
  overlay with `filter:'blur(8px) brightness(.62) contrast(3.4) saturate(1.5)'`
  and `globalCompositeOperation:'lighter'`, alpha 0.34 — only the brightest
  pixels (coins, fever, sun) survive and glow. GPU-accelerated; skipped on
  `__lowGfx`.

## File / naming conventions
- Working code: `index.html`, `style.css`, `game.js`, `renderer3d.js`,
  `three.min.js`, `sw.js`, `manifest.json`, `icon-*.png`.
- Standalone build: `play.html` (everything inlined, offline, single file).
- Art system: `game-art/` (this folder).
- Future binary assets follow `ui_button_primary_default.svg`,
  `ui_icon_currency_gold.svg`, `vfx_*` naming per the brief.

## Performance / memory budgets
- Download (standalone): ≤ ~800KB (Three.js minified dominates). Meets the
  ≤20MB mobile-homepage bar of web-game portals with huge headroom.
- Memory: pooled meshes, shared materials/geometries cached by colour.
- Target 60fps on mid-range phones; graceful degradation via adaptive quality.

## Accessibility
- High-contrast white text with hard shadows over the world.
- Sound and music independently toggleable.
- Parental gate (maths) before any purchase flow.
- No flashing beyond brief fever flash; danger conveyed by colour + motion +
  audio + haptics (redundant channels).
