# 🌟 Rail Rascals!

A fast, colourful **endless-runner game for kids**, inspired by the most-downloaded
mobile game of all time (Subway Surfers, 3B+ downloads) and the monetization model
shared by the world's top casual games (Candy Crush, Talking Tom, Minion Rush).

**Zero dependencies. No build step. Works offline.** Just open `index.html` in any
browser — phone, tablet or computer.

## ▶ How to play

| Action | Touch | Keyboard |
|---|---|---|
| Change lane | Swipe left / right | ⬅ ➡ or A / D |
| Jump | Swipe up or tap | ⬆, W or Space |
| Roll | Swipe down | ⬇ or S |
| Pause | ⏸ button | P or Esc |

Dodge the trains, **jump** the hurdles, **roll** under the DUCK! bars, grab every
coin — and run as far as you can. It gets faster forever.

## 🎮 Features

- **Pseudo-3D three-lane runner** with day → sunset → night → dawn sky cycle,
  scenery, particles, screen shake, floating score popups and squash-and-stretch
  character animation — all rendered on canvas.
- **4 power-ups** — 🧲 Coin Magnet, ⭐ Score x2, 🚀 Super Boost, 🛡️ Bubble Shield —
  each upgradeable to level 5 in the shop.
- **6 unlockable heroes**, each with a gameplay perk (more coins, longer power-ups,
  free starting shield, cheaper continues, bonus score).
- **Continue system** — when you crash you get 9 seconds to keep your run alive:
  spend coins (price doubles each time, like the original) **or watch a rewarded
  ad for a free continue**.
- **Monetization demo**, exactly like the top-grossing kids games:
  - 💎 Coin packs (£0.99 / £3.99 / £9.99) behind a **parental gate**
    ("ask a grown-up" maths check, as required for kids' apps). Purchases are
    simulated — in a store build this is where the platform billing API plugs in.
  - 🎬 Rewarded ads (simulated 5-second ad) for free coins, free continues and
    end-of-run coin doubling — so players who can't pay can still progress.
- **Retention loop**: 3 rotating missions with scaling targets and rewards,
  daily login gifts with a 7-day streak, best-score chasing, lifetime stats.
- **Chiptune music & sound effects** generated with WebAudio (no audio files),
  with separate sound/music toggles.
- **Progress saves automatically** to localStorage.

## 🧪 Tested

A headless smoke test (jsdom) drives the real game through the entire loop —
boot, daily gift, tutorial, running, crashing, ad-revive, game over, shop,
parental gate purchase, hero unlock, upgrades, missions and save persistence —
29 checks, all passing.

## 📁 Files

- `index.html` — all screens & dialogs
- `style.css` — kid-friendly UI theme
- `game.js` — engine, gameplay, economy, audio, save system
