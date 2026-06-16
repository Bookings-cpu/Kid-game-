# 🚂 RAIL RASCALS — FULL LAUNCH HANDOVER (Google Play)

You are taking over as the lead agent to get my kids' Android game **Rail Rascals!**
live on Google Play. A previous agent (Claude Code) built the whole app and
prepared every asset; your job is to drive the remaining browser/Console work and
any code/build iterations through to launch. I (the human) am present to sign in,
pay, pick files from disk, and supply tester emails. Work autonomously; pause only
for those human-only steps and anything irreversible. **Never guess on the kids
compliance forms — use the exact values in this document.**

---

## MISSION
Take Rail Rascals! from "not yet created in Play Console" → **live on Google Play**:
finish Console setup → upload the signed bundle to closed testing → run the
mandatory 12-tester / 14-day closed test → apply for production → ship the
production build.

## REALITY CHECK (hard constraints — don't fight them)
- A **new personal Play account must run a closed test with ≥12 testers for 14
  continuous days** before production unlocks. "Live to everyone" is therefore
  **≥14 days away**. Immediate goal = "everything done + closed test running."
- Real ads/billing only fully function in a Play-distributed build with the
  Console products + license testers set up. **Test ads** are used until production.

## THE APP — facts
- Display name: **Rail Rascals!** · applicationId: **com.bdjofficial.railrascals** (permanent).
- Free, child-directed (under-13) endless-runner. Monetisation: opt-in **AdMob
  rewarded ads** + consumable **coin packs** (real Google Play Billing). Has a
  Mystery Box (randomised, coin-buyable) that already shows its odds in-app.
- Tech: HTML5/JS game wrapped with **Capacitor 8** as a native Android app.
  Plugins: `@capacitor-community/admob@8` (rewarded, child-directed) and
  `cordova-plugin-purchase@13.16.1` (direct Play Billing 8.3.0, no third-party backend).

## WHERE EVERYTHING LIVES
- GitHub repo **Bookings-cpu/Kid-game-**, working branch
  **claude/kids-game-monetization-5jjqfz** (there is no `main` — this branch is the
  source of truth).
- Repo files that matter:
  - `game.js` — game logic + native bridge (AdMob/Billing). Holds the `Native.PROD`
    switch and the AdMob unit id.
  - `app/` — the Capacitor Android project (`app/android/` is the Gradle project;
    `app/sync-www.sh` copies the web assets in).
  - `STORE_LISTING_CONTENT.md` — **every Play Console form answer** (paste from here).
  - `PLAY_STORE_RUNBOOK.md` — step-by-step publishing guide.
  - `PRIVACY.md` / `privacy.html` — privacy policy (page ready to host).
  - `icon-512.png`, `feature-graphic.png` (1024×500), `screenshot-1-menu.png`,
    `screenshot-2-run.png`, `screenshot-3-run.png` — listing graphics.
- Bundle to upload: **railrascals-v2.aab** (on the human's machine; versionCode 2,
  real AdMob app id, TEST ads, odds disclosure).
- **Signing keystore** `railrascals-upload.keystore` + password in
  `KEYSTORE-SECRET.txt` are on the human's machine — IRREPLACEABLE, needed for every
  future build. NEVER commit or share them; ask the human for them when rebuilding.

## IDs & VALUES (use exactly)
- AdMob App ID: `ca-app-pub-5989955866748326~2245560977` (already wired into the app).
- AdMob real Rewarded unit: `ca-app-pub-5989955866748326/7306315960` (used when `Native.PROD=true`).
- In-app products (must match the app SKUs exactly), all **consumable / Active**:
  `coins_1000` £0.99 "Pile of Coins" · `coins_6000` £3.99 "Bag of Coins" ·
  `coins_20000` £9.99 "Chest of Coins".
- Contact email: `Bookings@bdjofficial.com`
- Privacy URL (once hosted): `https://bookings-cpu.github.io/kid-game-/privacy.html`
- Category Game → **Arcade**. Free. Contains ads: **Yes**. Designed for Families:
  **Yes**. Target ages: **under-13 (5–8, 9–12)**.

## CURRENT STATE (where we are right now)
- ✅ Google Play account verified. ✅ AdMob verified; app + rewarded unit created.
- ✅ Native app builds clean; signed AAB v2 is on the human's machine.
- ⏳ Play Console: app likely NOT yet created (a browser agent may be partway —
  **check the live state first**). Listing, products, content forms still to do.
- ❌ Privacy URL 404s — **GitHub Pages not enabled yet** (fix in Task 1).

---

## YOUR TASKS

### TASK 0 — Assess
Open play.google.com/console and the repo; report what already exists (app? listing?
products? bundle uploaded? privacy URL live?) and do only what's missing.

### TASK 1 — Publish the privacy policy (fix the 404)
`privacy.html` is at the repo root on the working branch. Enable GitHub Pages:
github.com/Bookings-cpu/Kid-game- → Settings → (if Private) Danger Zone → Change
visibility → **Public** (this exposes the source — confirm with the human first) →
then Settings → **Pages** → Deploy from a branch → Branch
`claude/kids-game-monetization-5jjqfz` → Folder `/ (root)` → Save. Wait ~1–2 min;
verify `https://bookings-cpu.github.io/kid-game-/privacy.html` loads. *(Alternative:
host `privacy.html` on the human's bdjofficial.com and use that URL.)*

### TASK 2 — Finish the Play Console (bulk)
Use the exact answers in `STORE_LISTING_CONTENT.md`. Pause for the human to sign in,
pick files (graphics + AAB), and give tester emails.
- Create the app (Rail Rascals!, English (US), Game, Free) if needed.
- Main store listing: short + full description (from the doc); upload icon-512.png,
  feature-graphic.png, and the 3 screenshots.
- App content checklist: Privacy policy (Task 1 URL); Ads = Yes; App access = all
  functionality open (no login); Content rating questionnaire (violence/sexual/
  language/drugs/gambling/discrimination = No; digital purchases = Yes; loot boxes =
  Yes; location = No → PEGI 3 / Everyone); Target audience = ages 5–8 & 9–12,
  appeals to children = Yes → Designed for Families.
- **DATA SAFETY (the nuanced one):** the GAME collects no personal data; the only
  processor is AdMob serving NON-personalised ads to children with the advertising-ID
  permission REMOVED. Fill per Google's current "AdMob data safety" guidance for a
  child-directed/non-personalised setup; if unsure on a toggle pick the most
  conservative accurate option and **tell the human exactly what you selected**.
  Don't over-declare data the app doesn't collect.
- Other declarations (news, COVID, government, financial, health) = No.
- Monetise → in-app products: create the 3 coin packs above, Active (needs a bundle
  uploaded first — do the Task 3 upload before this if blocked). Setup → License
  testing → add the human's Google email.

### TASK 3 — Closed testing (starts the 14-day clock)
Test and release → Testing → **Closed testing** → create track → Create new release →
accept Play App Signing (Google-managed) → upload **railrascals-v2.aab** (human picks
the file) → notes "First closed-test build" → add **≥12 testers** (ask the human) →
roll out to **closed testing (NOT production)**. Confirm the 14-day clock is running.

### TASK 4 — During the 14 days
Help keep ≥12 testers opted in and active; clear any pre-launch report warnings.

### TASK 5 — Production build + go live (after the 14-day test passes)
- Apply for production access (Dashboard → readiness questions).
- Build the PRODUCTION bundle: in `game.js` set `Native.PROD = true` (real rewarded
  unit + AdMob test mode off); in `app/android/app/build.gradle` bump `versionCode` to
  **3** and `versionName` to "1.0.2". Then in `app/`:
  `bash sync-www.sh` then
  `npx cap build android --keystorepath <railrascals-upload.keystore> --keystorepass <pw> --keystorealias railrascals --keystorealiaspass <pw> --androidreleasetype AAB`
  → output `app/android/app/build/outputs/bundle/release/app-release-signed.aab`.
  *(Requires JDK 21 + Android SDK 36 + the keystore. If you don't have the Android
  toolchain, the human can ask the original Claude Code build environment to generate
  this production AAB, or run the commands locally — the source change is committed
  regardless.)*
- Upload the production AAB to the **Production** track, complete the release, submit
  for review. Once approved → **LIVE**. 🎉

## RULES
- Pause for the human at: sign-in/2FA, payments, file pickers, tester emails, and any
  irreversible action (making the repo public, any rollout).
- Never roll out to production before the 14-day closed test is complete and
  production access is granted.
- Use exact IDs/SKUs — they must match the app.
- Keep the keystore + password secret; never commit them.
- Report status + blockers after each task.
