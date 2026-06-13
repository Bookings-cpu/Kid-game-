# Rail Rascals — Visual Quality Review

Brutally honest audit (0–10) of the current build, against the art brief.

## Scores
| Area | Score | Note |
|---|---:|---|
| 3D world art | 7 | Cohesive toon style, outlines, bloom, 5 biomes. Ceiling is below a studio's 3D-artist pipeline (primitive-built meshes). |
| UI quality | 8 | Consistent, tokenised, readable to 320px, all states designed. |
| Colour discipline | 8 | One gold accent, one danger red, controlled palette. |
| Typography | 8 | Single family (Baloo 2), auto-fit banners, no overflow. |
| Iconography | 5 | Emoji glyphs — universal & fast but not bespoke. Upgrade to SVG set. |
| HUD clarity | 8 | Minimal, thumb-zoned, never covers play space. |
| Lighting | 7 | Warm key + cool rim + real bloom; sharp shadows. |
| VFX | 8 | Rich, synced to audio, restrained where it matters. |
| Composition/framing | 8 | Classic runner cam, track readable ahead, hero focal. |
| Motion | 8 | Purposeful, no random bounce, satisfying press/reward. |
| Performance | 7 | Pooled, adaptive quality; heavy on weak GPUs without it. |
| Identity/brand | 7 | Has its own look; logo is CSS text, not a crafted mark yet. |

## Passes completed
- **P1 Layout:** dialogs compacted for short screens; PLAY always visible;
  automated bleed audit at 4 viewports → 0 real overflows.
- **P2 Colour/contrast:** tokenised palette; white-on-world contrast; night
  tint + vignette discipline.
- **P3 Icons:** emoji baseline consistent; SVG upgrade specced (not yet built).
- **P4 Motion/VFX:** coin-fly, fever, confetti, danger pulse, bloom; banner
  queue stops popup stacking.
- **P5 Premium polish:** toon outlines on hero+trains, glowing coins, filmic
  grade, rim light, camera reframe, fixed gantry slab & sign overflow.

## Honest remaining weaknesses
1. **Bespoke icon set** — biggest cheap win for identity (emoji → SVG).
2. **Crafted logo mark** — replace CSS text title with a designed wordmark.
3. **Hero/prop fidelity** — primitives read as "nice toon", not "studio 3D".
   True parity needs sculpted/textured models (Blender) — out of scope for a
   single vanilla-JS file.
4. **Pets as meshes** (currently emoji sprites).
5. **Marketing assets** (store capsule, key art, trailer card) not yet made.

## Next production steps (prioritised)
1. Custom SVG icon set + designed wordmark (identity).
2. Per-biome lighting/fog tints so each world *feels* distinct.
3. Pet meshes; 1–2 more obstacle types.
4. Marketing key art from in-game shots.
5. (If going to stores) Unity/Godot port with sculpted assets — this doc set is
   the spec for that.
