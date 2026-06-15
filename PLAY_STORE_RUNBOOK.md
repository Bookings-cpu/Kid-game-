# Rail Rascals — Google Play publishing runbook

This is the exact path to get Rail Rascals live on Google Play. **I (Claude Code)
build everything technical; you do the Console steps** (sign in, pay, click) —
or paste the steps into your Chrome-Claude side panel to have it drive the
Console for you.

Legend:  🔧 = I do it · 🧑 = you do it in the browser · 🔁 = we hand off (you get
an ID/value, I wire it in and rebuild)

---

## 0. ⚠️ FIRST — back up the signing key (do this immediately)

I generated your app's **upload keystore**. Whoever holds it controls updates to
the app forever; **lose it and you can never update Rail Rascals on Play.**

- 🧑 Save **`railrascals-upload.keystore`** and **`KEYSTORE-SECRET.txt`** (I'll
  send both) into at least two safe places (password manager + offline backup).
- 🧑 During the first upload, **enrol in Google Play App Signing** (default, and
  recommended). Then Google holds the real signing key and this file is only the
  *upload* key — which Google can reset if it's ever lost. Belt and braces.

---

## 1. Google Play Developer account  🧑  (~$25, one-time)

1. Go to **play.google.com/console** → sign in with the Google account you want
   to own the app → **Create developer account** → choose **Personal**.
2. Pay the **$25** one-time fee.
3. Complete **identity verification** (government ID, address). This can take a
   few hours to a couple of days — start it now; everything else can proceed in
   parallel.

> Note: a new *personal* account must run a **closed test with ≥12 testers for 14
> continuous days** before it can publish to production. That 14-day clock is the
> real bottleneck — we start it as soon as the app is uploaded to a test track.

---

## 2. AdMob account → real ad IDs  🔁

The app currently uses Google's **test** ad IDs (so ads show during development
without policy risk). For the real app you need your own:

1. 🧑 Go to **admob.google.com** → sign up (free) with the same Google account.
2. 🧑 **Add app** → Android → "Rail Rascals" (you can add it before it's on Play).
   → copy the **App ID** (looks like `ca-app-pub-XXXX~YYYY`, note the `~`).
3. 🧑 **Ad units → Add ad unit → Rewarded** → name it "Rail Rascals Rewarded" →
   copy the **ad unit ID** (`ca-app-pub-XXXX/ZZZZ`, note the `/`).
4. 🧑 In AdMob **App settings**, set the app as **directed to children / mixed
   audience** and tag it under the **Families** programme.
5. 🔁 Send me both IDs → I drop them into the app, flip the ad config to
   production, and rebuild.

> Compliance is already wired: child-directed treatment, G-rated ads only,
> non-personalised, and the advertising-ID permission is stripped out. Rewarded
> (opt-in) ads are permitted for kids; that's the only ad type we use.

---

## 3. Create the app in Play Console  🧑

Play Console → **Create app**:
- App name: **Rail Rascals!**
- Default language: **English (United States)** (or en-GB)
- App or game: **Game** · Free or paid: **Free**
- Confirm the declarations (it's free, follows policies).

---

## 4. In-app products (so coin packs work)  🔁

Billing only functions once the products exist in Console with **exactly these
IDs** (the app is hard-wired to them):

| Product ID | Suggested name | Suggested price |
|---|---|---|
| `coins_1000`  | Pile of Coins (1,000)  | £0.99 |
| `coins_6000`  | Bag of Coins (6,000)   | £3.99 |
| `coins_20000` | Chest of Coins (20,000)| £9.99 |

1. 🧑 **Monetise → Products → In-app products → Create product** for each, using
   the **exact** product IDs above, set **Active**.
2. 🧑 **Monetise → Setup → License testing** → add your own Google account as a
   license tester (lets you test purchases with no real charge).

(There's no "consumable" toggle — the app already consumes them so they're
re-buyable.)

---

## 5. Store listing  🧑  (assets are ready in the repo)

**Main store listing:**
- **App icon:** `icon-512.png` (512×512) — already in the repo.
- **Feature graphic (1024×500):** ⏳ I can generate this on request.
- **Phone screenshots:** `screenshot-1-menu.png`, `screenshot-2-run.png`,
  `screenshot-3-run.png` — already in the repo (add more if you like).
- **Short description (≤80 chars):**
  > Dash, dodge trains & spin to win in this endless toon runner for kids!
- **Full description:** worlds, heroes, pets, daily spin, missions, piggy bank;
  mention "opt-in rewarded ads" and "parent-gated coin packs".
- **Privacy policy URL:** host `PRIVACY.md` publicly (GitHub Pages works) and
  paste the link. 🔧 I'll set up the Pages hosting.

---

## 6. Content rating (IARC)  🧑
Policy → **App content → Content rating** → start questionnaire → category
**Game** → answer honestly (no violence/sex/gambling/etc.) → it'll come back
**PEGI 3 / ESRB Everyone**. Submit.

## 7. Target audience & content  🧑
App content → **Target audience and content** → select age groups **including
under 13** → this enrols the app in **Designed for Families** (the ads config is
already compliant). Answer the Families questions.

## 8. Data safety  🧑
App content → **Data safety**. The game itself collects **no personal data**
(all on-device). You **do** need to declare what the **ad SDK** may access — for
a child-directed AdMob app that's essentially none beyond what's needed to serve
non-personalised ads (no advertising ID — we removed it). I'll give you the exact
answers to tick once your AdMob setup is confirmed.

---

## 9. Upload + start the 14-day test  🔁🧑

1. 🔧 I produce the **final signed AAB** (with your real ad IDs).
2. 🧑 **Test → Closed testing → Create track** → upload the AAB → add your ≥12
   testers (an email list / Google Group) → roll out.
3. 🧑 Keep ≥12 testers opted in for **14 continuous days** (they just need to
   install and open it occasionally).
4. 🧑 After 14 days, **Dashboard → apply for production access**, answer the
   readiness questions, and submit for review.

---

## What I (Claude) still do on my side
- 🔧 Host `PRIVACY.md` (and optionally a web demo) on free GitHub Pages.
- 🔁 Swap your real AdMob App ID + rewarded unit ID into the app, set ads to
  production mode, and rebuild the signed AAB.
- 🔧 Generate the 1024×500 feature graphic if you want one.
- 🔧 Give you the exact Data-safety answers and the full-description text.

## Final pre-publish checklist (I handle the rebuild)
- [ ] Real AdMob App ID in `strings.xml` + real rewarded unit ID in `game.js`
- [ ] `initializeForTesting: true` → **false** in the AdMob init
- [ ] Products `coins_1000/6000/20000` created & Active in Console
- [ ] Privacy policy URL live and pasted into the listing
- [ ] Signed AAB built with the upload keystore and uploaded to a test track
