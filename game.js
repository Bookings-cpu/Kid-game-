/* =========================================================================
   RAIL RASCALS! — an endless-runner game for kids
   Inspired by the most-downloaded mobile games in the world.
   Pure HTML5/Canvas/JS — no dependencies, works offline.
   ========================================================================= */
'use strict';

/* ============================== helpers ============================== */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n) => Math.floor(n).toLocaleString('en-GB');
const todayStr = () => new Date().toISOString().slice(0, 10);

function bumpEl(id) {
  const el = $(id).parentElement;
  el.classList.remove('bump');
  void el.offsetWidth; // restart the animation
  el.classList.add('bump');
}

function toast(msg, gold) {
  const el = document.createElement('div');
  el.className = 'toast' + (gold ? ' gold' : '');
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

/* ============================== game data ============================== */
const CHARACTERS = [
  { id: 'zip',   name: 'Zip',   price: 0,     body: '#ff8c1a', belly: '#ffd9a8', hat: 'cap',     perk: 'The original speedster!',          bonus: {} },
  { id: 'luna',  name: 'Luna',  price: 600,   body: '#b06cff', belly: '#ecd9ff', hat: 'ears',    perk: '+10% coins on every run',          bonus: { coin: 0.10 } },
  { id: 'bolt',  name: 'Bolt',  price: 1500,  body: '#37b6ff', belly: '#cdeeff', hat: 'antenna', perk: 'Power-ups last 15% longer',        bonus: { pu: 0.15 } },
  { id: 'coco',  name: 'Coco',  price: 3000,  body: '#c98a4b', belly: '#f5dec0', hat: 'bunny',   perk: 'Starts every run with a shield',   bonus: { startShield: true } },
  { id: 'pixel', name: 'Pixel', price: 6000,  body: '#49d86a', belly: '#d2f7da', hat: 'bolt',    perk: 'Continues cost 25% less',          bonus: { revive: 0.25 } },
  { id: 'nova',  name: 'Nova',  price: 12000, body: '#ffc933', belly: '#fff3cc', hat: 'horn',    perk: '+20% score — superstar!',          bonus: { score: 0.20 } },
];

const POWERUPS = {
  magnet: { name: 'Coin Magnet', icon: '🧲', color: '#ff5e8e', base: 6,  per: 1.5 },
  mult:   { name: 'Score x2',    icon: '⭐', color: '#ffc933', base: 6,  per: 1.5 },
  boost:  { name: 'Super Boost', icon: '🚀', color: '#37b6ff', base: 3,  per: 0.8 },
  shield: { name: 'Bubble Shield', icon: '🛡️', color: '#49d86a', base: 8, per: 2 },
};
const MAX_UPG = 5;
const upgCost = (lvl) => 300 * lvl; // cost to go from lvl -> lvl+1

const COIN_PACKS = [
  { coins: 1000,  price: '£0.99' },
  { coins: 6000,  price: '£3.99' },
  { coins: 20000, price: '£9.99' },
];
const AD_REWARD = 100;
const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];
const REVIVE_BASE = 100;
const HUNT_WORD = 'RASCAL';
const HOVERBOARD_TIME = 30;
const HOVERBOARD_PRICE = 300;
const BOX_PRICE = 400;
const DOUBLER_PRICE = 25000;

// rotating worlds — a new land every 2,500m, synced with the sky cycle
const THEMES = [
  { name: '🌼 Sunny Meadows', ground: ['#7fd071', '#4fae44'], groundLo: ['#4f9e63', '#2e7d4f'] },
  { name: '🏜️ Desert Dunes',  ground: ['#eed9a0', '#ddb96e'], groundLo: ['#d4b06a', '#b98f4e'] },
  { name: '❄️ Snowy Peaks',   ground: ['#eef3fa', '#c4d3e6'], groundLo: ['#b9c9de', '#93a8c4'] },
  { name: '🍭 Candy Land',    ground: ['#ffb9dc', '#ff9ccc'], groundLo: ['#ff8ac2', '#f06aab'] },
];

const MISSION_TPLS = [
  { tpl: 'coins',    text: (n) => `Collect ${fmt(n)} coins`,        base: 150,  reward: 100 },
  { tpl: 'distance', text: (n) => `Run ${fmt(n)}m in total`,        base: 1000, reward: 120 },
  { tpl: 'jumps',    text: (n) => `Jump ${fmt(n)} times`,           base: 30,   reward: 80 },
  { tpl: 'slides',   text: (n) => `Roll ${fmt(n)} times`,           base: 20,   reward: 80 },
  { tpl: 'powerups', text: (n) => `Grab ${fmt(n)} power-ups`,       base: 5,    reward: 150 },
  { tpl: 'runs',     text: (n) => `Finish ${fmt(n)} runs`,          base: 3,    reward: 100 },
  { tpl: 'score',    text: (n) => `Score ${fmt(n)} in one run`,     base: 2000, reward: 150 },
];

/* ============================== save state ============================== */
const SAVE_KEY = 'railrascals_save_v1';

function defaultSave() {
  return {
    coins: 0,
    best: 0,
    character: 'zip',
    owned: ['zip'],
    upgrades: { magnet: 1, mult: 1, boost: 1, shield: 1 },
    sound: true,
    music: true,
    missions: [],
    missionLvl: 0,
    daily: { last: '', streak: 0 },
    boxes: 0,
    hoverboards: 1,
    doubler: false,
    xp: 0,
    wordHunt: { date: '', got: [false, false, false, false, false, false], streak: 0 },
    seenHowto: false,
    stats: { runs: 0, totalCoins: 0, totalDist: 0, jumps: 0, slides: 0, powerups: 0 },
  };
}

let S = (() => {
  const d = defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const got = JSON.parse(raw);
      for (const k of Object.keys(d)) if (got[k] !== undefined) d[k] = got[k];
      d.upgrades = Object.assign(defaultSave().upgrades, d.upgrades);
      d.stats = Object.assign(defaultSave().stats, d.stats);
    }
  } catch (e) { /* corrupted save — start fresh */ }
  return d;
})();

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
}

function addCoins(n) {
  S.coins += n;
  save();
  refreshBalances();
}

function charDef() { return CHARACTERS.find(c => c.id === S.character) || CHARACTERS[0]; }

/* ============================== player level / XP ============================== */
function levelInfo() {
  let lvl = 1, need = 300, xp = S.xp || 0;
  while (xp >= need) { xp -= need; lvl++; need = 300 + (lvl - 1) * 150; }
  return { lvl, frac: xp / need };
}

/* ============================== missions ============================== */
function newMission(excludeTpls) {
  const options = MISSION_TPLS.filter(t => !excludeTpls.includes(t.tpl));
  const t = pick(options.length ? options : MISSION_TPLS);
  const scale = 1 + S.missionLvl * 0.5;
  return {
    tpl: t.tpl,
    target: Math.round(t.base * scale),
    prog: 0,
    reward: Math.round(t.reward * (1 + S.missionLvl * 0.25)),
    notified: false,
  };
}

function ensureMissions() {
  while (S.missions.length < 3) {
    S.missions.push(newMission(S.missions.map(m => m.tpl)));
  }
  save();
}

function missionEvent(tpl, amount) {
  for (const m of S.missions) {
    if (m.tpl !== tpl || m.prog >= m.target) continue;
    if (tpl === 'score') m.prog = Math.max(m.prog, amount);
    else m.prog += amount;
    m.prog = Math.min(m.prog, m.target);
    if (m.prog >= m.target && !m.notified) {
      m.notified = true;
      toast('🎯 Mission complete!', true);
      AudioSys.sfx('mission');
      if (G.state === 'playing') G.runMissions.push(missionText(m));
      save();
      refreshMissionBadge();
    }
  }
  // progress itself is persisted on game over / claim — not every frame
}

function missionText(m) {
  const t = MISSION_TPLS.find(t => t.tpl === m.tpl);
  return t ? t.text(m.target) : '';
}

function claimMission(idx) {
  const m = S.missions[idx];
  if (!m || m.prog < m.target) return;
  S.missionLvl++;
  addCoins(m.reward);
  AudioSys.sfx('buy');
  toast(`+${m.reward} 🪙 mission reward!`, true);
  S.missions[idx] = newMission(S.missions.map(x => x.tpl));
  save();
  renderMissions();
  refreshMissionBadge();
}

function refreshMissionBadge() {
  const any = S.missions.some(m => m.prog >= m.target);
  $('missions-badge').classList.toggle('hidden', !any);
}

/* ============================== word hunt (daily letters) ============================== */
function resetWordHuntIfNewDay() {
  if (S.wordHunt.date === todayStr()) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  // the streak survives only if yesterday's word was finished
  if (!(S.wordHunt.date === yesterday && S.wordHunt.got.every(Boolean))) S.wordHunt.streak = 0;
  S.wordHunt.date = todayStr();
  S.wordHunt.got = HUNT_WORD.split('').map(() => false);
  save();
}

function collectHuntLetter(idx) {
  if (S.wordHunt.got[idx]) return;
  S.wordHunt.got[idx] = true;
  const got = S.wordHunt.got.filter(Boolean).length;
  AudioSys.sfx('powerup');
  toast(`✉️ Letter ${HUNT_WORD[idx]}! (${got}/${HUNT_WORD.length})`, true);
  if (S.wordHunt.got.every(Boolean)) {
    S.wordHunt.streak++;
    const nBoxes = S.wordHunt.streak >= 5 ? 2 : 1;
    S.boxes += nBoxes;
    S.coins += 200;
    AudioSys.sfx('mission');
    toast(`🎉 ${HUNT_WORD} complete! +200 🪙 +${nBoxes} 🎁`, true);
  }
  save();
  refreshBalances();
}

function nextHuntLetter() {
  return S.wordHunt.got.findIndex(g => !g); // -1 when today's word is done
}

/* ============================== mystery boxes ============================== */
const BOX_REWARDS = [
  { w: 38, gen: () => ({ text: '🪙 100 coins!', coins: 100 }) },
  { w: 25, gen: () => ({ text: '🪙 250 coins!', coins: 250 }) },
  { w: 15, gen: () => ({ text: '🪙 500 coins!!', coins: 500 }) },
  { w: 14, gen: () => ({ text: '🛹 A hoverboard!', board: 1 }) },
  { w: 8,  gen: () => ({ text: '💰 JACKPOT! 1,000 coins!!!', coins: 1000, jackpot: true }) },
];

function rollBox() {
  const total = BOX_REWARDS.reduce((s, r) => s + r.w, 0);
  let roll = Math.random() * total;
  for (const r of BOX_REWARDS) { roll -= r.w; if (roll <= 0) return r.gen(); }
  return BOX_REWARDS[0].gen();
}

function openBoxModal() {
  $('mod-box').classList.remove('hidden');
  $('box-reward').textContent = '';
  $('box-art').textContent = '🎁';
  $('box-art').classList.add('shaking');
  refreshBoxButtons();
}

function refreshBoxButtons() {
  $('btn-box-open').classList.toggle('hidden', S.boxes <= 0);
  $('btn-box-open').textContent = `Open it! (${fmt(S.boxes)} left)`;
  $('btn-box-buy').classList.toggle('hidden', S.boxes > 0);
  $('btn-box-buy').textContent = `Buy a box — 🪙 ${fmt(BOX_PRICE)}`;
}

function doOpenBox() {
  if (S.boxes <= 0) return;
  S.boxes--;
  const r = rollBox();
  if (r.coins) S.coins += r.coins;
  if (r.board) S.hoverboards += r.board;
  save();
  $('box-art').textContent = r.jackpot ? '🌟' : '✨';
  $('box-art').classList.remove('shaking');
  $('box-reward').textContent = r.text;
  AudioSys.sfx(r.jackpot ? 'mission' : 'buy');
  refreshBoxButtons();
  refreshBalances();
}

/* ============================== audio ============================== */
const AudioSys = {
  ctx: null,
  musicTimer: null,
  musicStep: 0,

  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  tone(freq, dur, type, vol, when, slide) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  sfx(name) {
    if (!S.sound || !this.ensure()) return;
    switch (name) {
      case 'coin':    this.tone(1100, 0.07, 'square', 0.07); this.tone(1700, 0.12, 'square', 0.07, 0.06); break;
      case 'jump':    this.tone(300, 0.18, 'square', 0.1, 0, 720); break;
      case 'slide':   this.tone(500, 0.15, 'sawtooth', 0.07, 0, 180); break;
      case 'lane':    this.tone(640, 0.06, 'triangle', 0.08); break;
      case 'crash':   this.tone(180, 0.4, 'sawtooth', 0.18, 0, 50); this.tone(90, 0.5, 'square', 0.14, 0.04, 35); break;
      case 'powerup': [620, 780, 980, 1240].forEach((f, i) => this.tone(f, 0.12, 'square', 0.09, i * 0.07)); break;
      case 'click':   this.tone(820, 0.05, 'triangle', 0.09); break;
      case 'buy':     [660, 880, 1320].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.1, i * 0.08)); break;
      case 'mission': [520, 660, 780, 1040].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.1, i * 0.09)); break;
      case 'revive':  [440, 660, 880, 1320].forEach((f, i) => this.tone(f, 0.15, 'square', 0.09, i * 0.06)); break;
      case 'over':    [520, 392, 330, 262].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, i * 0.18)); break;
      case 'smash':   this.tone(220, 0.2, 'sawtooth', 0.13, 0, 60); break;
      case 'fever':   [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.14, 'square', 0.1, i * 0.06)); break;
      case 'mile':    this.tone(784, 0.12, 'triangle', 0.1); this.tone(1175, 0.2, 'triangle', 0.1, 0.1); break;
    }
  },

  // coins climb in pitch as your combo grows — pure dopamine
  coinSfx(combo) {
    if (!S.sound || !this.ensure()) return;
    const f = 950 * Math.pow(2, (combo % 16) / 16);
    this.tone(f, 0.06, 'square', 0.07);
    this.tone(f * 1.5, 0.1, 'square', 0.06, 0.05);
  },

  noise(dur, vol, when) {
    const c = this.ctx;
    if (!c) return;
    if (!this.nb) {
      const len = (c.sampleRate * 0.3) | 0;
      this.nb = c.createBuffer(1, len, c.sampleRate);
      const d = this.nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource();
    s.buffer = this.nb;
    const g = c.createGain();
    const t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(g).connect(c.destination);
    s.start(t);
    s.stop(t + dur + 0.02);
  },

  // chiptune loop with kick, hats, bass and a two-bar melody
  startMusic() {
    if (this.musicTimer || !S.music) return;
    if (!this.ensure()) return;
    const bass = [131, 0, 131, 0, 98, 0, 98, 0, 110, 0, 110, 0, 123, 0, 147, 0];
    const leadA = [523, 0, 659, 784, 0, 659, 880, 0, 784, 659, 587, 0, 659, 0, 523, 0];
    const leadB = [659, 0, 784, 880, 0, 784, 1047, 0, 880, 784, 659, 0, 587, 0, 659, 0];
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!S.music || document.hidden) return;
      const step = this.musicStep++;
      const i = step % 16;
      const bar = Math.floor(step / 16) % 2;
      if (i % 4 === 0) this.tone(95, 0.12, 'sine', 0.15, 0, 40);  // kick
      if (i % 2 === 1) this.noise(0.04, 0.045);                    // hat
      if (bass[i]) this.tone(bass[i], 0.2, 'triangle', 0.055);
      const lead = bar ? leadB : leadA;
      if (lead[i]) this.tone(lead[i], 0.14, 'square', 0.04);
    }, 125);
  },

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  },
};

/* ============================== UI: screens & modals ============================== */
const SCREENS = ['menu', 'game', 'shop', 'chars', 'missions', 'settings'];

function showScreen(name) {
  for (const s of SCREENS) $('scr-' + s).classList.toggle('hidden', s !== name);
  if (name === 'menu') {
    refreshBalances();
    drawMenuChar();
    refreshMissionBadge();
  }
  if (name === 'shop') renderShop();
  if (name === 'chars') renderChars();
  if (name === 'missions') renderMissions();
  if (name === 'settings') renderSettings();
}

function refreshBalances() {
  for (const id of ['menu-coins', 'hud-coins', 'shop-coins', 'chars-coins', 'missions-coins']) {
    $(id).textContent = fmt(S.coins + (G.state === 'playing' || G.state === 'continue' ? G.runCoins : 0));
  }
  $('menu-best').textContent = fmt(S.best);
  $('menu-boxes').textContent = fmt(S.boxes);
  const li = levelInfo();
  $('menu-level').textContent = `⭐ Lv ${li.lvl}`;
  $('xp-fill').style.width = (li.frac * 100).toFixed(1) + '%';
}

/* ---------- simulated rewarded ad ---------- */
const Ad = { timer: null, onReward: null };

function openAd(onReward) {
  Ad.onReward = onReward;
  $('mod-ad').classList.remove('hidden');
  $('btn-ad-claim').classList.add('hidden');
  $('btn-ad-close').classList.remove('hidden');
  let t = 5;
  $('ad-timer').textContent = t;
  clearInterval(Ad.timer);
  Ad.timer = setInterval(() => {
    t--;
    $('ad-timer').textContent = Math.max(0, t);
    if (t <= 0) {
      clearInterval(Ad.timer);
      $('ad-timer').textContent = '✔ Ad finished!';
      $('btn-ad-claim').classList.remove('hidden');
      $('btn-ad-close').classList.add('hidden');
    }
  }, 1000);
}

function closeAd(rewarded) {
  clearInterval(Ad.timer);
  $('mod-ad').classList.add('hidden');
  const cb = Ad.onReward;
  Ad.onReward = null;
  if (rewarded && cb) cb();
  else if (!rewarded && G.state === 'continue') startContinueCountdown(); // resume the clock
}

/* ---------- parental gate ---------- */
const Gate = { answer: 0, onOk: null };

function openGate(onOk) {
  Gate.onOk = onOk;
  const a = irand(3, 9), b = irand(4, 9);
  Gate.answer = a * b;
  $('gate-q').textContent = `${a} × ${b} = ?`;
  $('gate-in').value = '';
  $('mod-gate').classList.remove('hidden');
  $('gate-in').focus();
}

/* ---------- daily reward ---------- */
function checkDaily() {
  const today = todayStr();
  if (S.daily.last === today) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  S.daily.streak = (S.daily.last === yesterday) ? S.daily.streak + 1 : 1;
  const grid = $('daily-grid');
  grid.innerHTML = '';
  const idx = Math.min(S.daily.streak, 7) - 1;
  DAILY_REWARDS.forEach((r, i) => {
    const cell = document.createElement('div');
    cell.className = 'daily-cell' + (i < idx ? ' past' : i === idx ? ' today' : '');
    cell.innerHTML = `Day ${i + 1}<span class="d-coins">🪙${r}</span>`;
    grid.appendChild(cell);
  });
  $('btn-daily-claim').textContent = `🎁 Claim ${DAILY_REWARDS[idx]} coins!`;
  $('mod-daily').classList.remove('hidden');
}

/* ============================== character drawing ============================== */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawCharacter(ctx, x, y, size, def, opts) {
  // x,y = feet centre; size = body diameter. opts: {phase, jump, slide, lean, run}
  const o = opts || {};
  const phase = o.phase || 0;
  const slide = o.slide || 0;       // 0..1
  const jump = o.jump || 0;         // 0..1
  const lean = o.lean || 0;         // -1..1
  const run = !!o.run;
  const swing = run ? Math.sin(phase * 14) : 0;
  const bob = run ? Math.abs(Math.sin(phase * 14)) * size * 0.05 : 0;
  const r = size / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean * 0.22 + (run ? Math.sin(phase * 7) * 0.02 : 0));
  ctx.lineCap = 'round';

  const squashY = 1 - slide * 0.45 + jump * 0.18;
  const squashX = 1 + slide * 0.32 - jump * 0.1;
  const legLift = r * 0.42 * (1 - slide);
  const by = -(r * squashY + legLift) - bob;   // body centre

  // legs (tucked when rolling)
  if (slide < 0.4) {
    const hipY = by + r * 0.55 * squashY;
    ctx.strokeStyle = shade(def.body, -0.28);
    ctx.lineWidth = r * 0.22;
    for (const s of [-1, 1]) {
      const sw = swing * s;
      const tuck = jump > 0.3;
      const fx = s * r * 0.28 + (tuck ? 0 : sw * r * 0.42);
      const fy = tuck ? by + r * 0.85 : -r * 0.05 - Math.max(0, sw) * r * 0.28;
      ctx.beginPath();
      ctx.moveTo(s * r * 0.26, hipY);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      // trainers
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(fx + s * r * 0.06, fy, r * 0.21, r * 0.13, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8443a';
      ctx.beginPath(); ctx.ellipse(fx + s * r * 0.06, fy + r * 0.05, r * 0.21, r * 0.07, 0, 0, 7); ctx.fill();
    }
  }

  // body with soft lighting + outline
  const bg = ctx.createRadialGradient(-r * 0.35, by - r * 0.45, r * 0.1, 0, by, r * 1.2);
  bg.addColorStop(0, shade(def.body, 0.28));
  bg.addColorStop(1, shade(def.body, -0.12));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, by, r * squashX, r * squashY, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = shade(def.body, -0.42);
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.stroke();

  // belly
  const bgl = ctx.createLinearGradient(0, by - r * 0.2, 0, by + r * 0.7);
  bgl.addColorStop(0, shade(def.belly, 0.15));
  bgl.addColorStop(1, shade(def.belly, -0.06));
  ctx.fillStyle = bgl;
  ctx.beginPath();
  ctx.ellipse(0, by + r * 0.28 * squashY, r * 0.55 * squashX, r * 0.45 * squashY, 0, 0, 7);
  ctx.fill();

  // rolling motion arcs
  if (slide > 0.3) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath(); ctx.arc(0, by, r * 1.15, -0.6, 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, by, r * 1.3, Math.PI - 0.5, Math.PI + 0.6); ctx.stroke();
  }

  // arms (raised when jumping — wheee!)
  if (slide < 0.4) {
    ctx.strokeStyle = shade(def.body, -0.18);
    ctx.lineWidth = r * 0.19;
    for (const s of [-1, 1]) {
      const sw = -swing * s;
      const sx = s * r * 0.72 * squashX, sy = by + r * 0.02;
      const hx = jump > 0.3 ? s * r * 1.05 : sx + s * r * 0.2 + sw * r * 0.3;
      const hy = jump > 0.3 ? by - r * 0.75 : sy + r * 0.5 - sw * r * 0.25;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = def.belly;
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.13, 0, 7); ctx.fill();
    }
  }

  // eyes with shine (and the odd blink)
  const ey = by - r * 0.25 * squashY;
  const blink = run && Math.sin(phase * 1.9) > 0.992;
  if (blink) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, ey); ctx.lineTo(-r * 0.18, ey);
    ctx.moveTo(r * 0.18, ey); ctx.lineTo(r * 0.42, ey);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, ey, r * 0.2, r * 0.25 * squashY, 0, 0, 7);
    ctx.ellipse(r * 0.3, ey, r * 0.2, r * 0.25 * squashY, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.stroke();
    ctx.fillStyle = '#26221f';
    ctx.beginPath();
    ctx.arc(-r * 0.26, ey + r * 0.04, r * 0.1, 0, 7);
    ctx.arc(r * 0.34, ey + r * 0.04, r * 0.1, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.29, ey, r * 0.035, 0, 7);
    ctx.arc(r * 0.31, ey, r * 0.035, 0, 7);
    ctx.fill();
  }

  // rosy cheeks
  ctx.fillStyle = 'rgba(255,110,140,.32)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, ey + r * 0.26, r * 0.12, r * 0.08, 0, 0, 7);
  ctx.ellipse(r * 0.5, ey + r * 0.26, r * 0.12, r * 0.08, 0, 0, 7);
  ctx.fill();

  // mouth — open "wheee" when jumping, smile otherwise
  if (jump > 0.4) {
    ctx.fillStyle = '#5b2730';
    ctx.beginPath(); ctx.ellipse(0, ey + r * 0.32, r * 0.13, r * 0.17, 0, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.arc(0, ey + r * 0.28, r * 0.22, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }

  // hat / accessory
  const hy = by - r * squashY;
  ctx.fillStyle = '#fff';
  switch (def.hat) {
    case 'cap':
      ctx.fillStyle = '#e8443a';
      ctx.beginPath();
      ctx.arc(0, hy + r * 0.18, r * 0.55, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-r * 0.75, hy + r * 0.1, r * 0.9, r * 0.14);
      break;
    case 'ears':
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, hy + r * 0.3); ctx.lineTo(-r * 0.75, hy - r * 0.35); ctx.lineTo(-r * 0.15, hy + r * 0.1);
      ctx.moveTo(r * 0.55, hy + r * 0.3); ctx.lineTo(r * 0.75, hy - r * 0.35); ctx.lineTo(r * 0.15, hy + r * 0.1);
      ctx.fill();
      break;
    case 'antenna':
      ctx.strokeStyle = '#2a7db5'; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.moveTo(0, hy + r * 0.15); ctx.lineTo(0, hy - r * 0.35); ctx.stroke();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath(); ctx.arc(0, hy - r * 0.42, r * 0.16, 0, 7); ctx.fill();
      break;
    case 'bunny':
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, hy - r * 0.25, r * 0.16, r * 0.5, -0.2, 0, 7);
      ctx.ellipse(r * 0.3, hy - r * 0.25, r * 0.16, r * 0.5, 0.2, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ffc2d4';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, hy - r * 0.2, r * 0.07, r * 0.3, -0.2, 0, 7);
      ctx.ellipse(r * 0.3, hy - r * 0.2, r * 0.07, r * 0.3, 0.2, 0, 7);
      ctx.fill();
      break;
    case 'bolt':
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(r * 0.05, hy - r * 0.45); ctx.lineTo(-r * 0.2, hy + 1); ctx.lineTo(r * 0.02, hy + 1);
      ctx.lineTo(-r * 0.1, hy + r * 0.35); ctx.lineTo(r * 0.25, hy - r * 0.1); ctx.lineTo(r * 0.04, hy - r * 0.1);
      ctx.closePath(); ctx.fill();
      break;
    case 'horn':
      const grad = ctx.createLinearGradient(0, hy - r * 0.6, 0, hy + r * 0.15);
      grad.addColorStop(0, '#ff6ec4'); grad.addColorStop(1, '#ffe14d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, hy + r * 0.18); ctx.lineTo(0, hy - r * 0.6); ctx.lineTo(r * 0.16, hy + r * 0.18);
      ctx.closePath(); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawMenuChar() {
  const c = $('menu-char');
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  drawCharacter(ctx, 90, 165, 110, charDef(), { run: false });
}

/* ============================== game engine ============================== */
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const ZMAX = 1300, SPAWN_Z = 1200, CAMD = 150, HITZ = 22;
const LANE_W = () => W * 0.30;
const HORIZON = () => H * 0.36;
const BASE_Y = () => H * 0.86;

function project(laneF, z) {
  // perspective tightens as you speed up — the world rushes harder
  const camd = CAMD - clamp((G.speed - 300) / 460, 0, 1) * 38;
  const p = camd / (z + camd);
  return {
    // the camera trails the player half a lane — parallax like a real 3D chase cam
    x: W / 2 + (laneF - G.camX) * LANE_W() * p,
    y: HORIZON() + (BASE_Y() - HORIZON()) * p,
    p,
  };
}

// sky palettes that slowly cycle as you run (day → sunset → night → dawn)
const SKIES = [
  ['#4aa9ff', '#bfe6ff'], ['#ff9a5c', '#ffd9a0'], ['#1b1464', '#4a3f9e'], ['#ff7eb3', '#ffd1dc'],
];
const STARS = Array.from({ length: 42 }, () => [Math.random(), Math.random() * 0.9, rand(0.3, 1)]);
const CLOUDS = [[0.15, 0.3, 0.22, 0.8], [0.55, 0.18, 0.3, 0.5], [0.85, 0.42, 0.18, 1.1], [0.35, 0.55, 0.14, 1.5]];
const SKYLINE = Array.from({ length: 14 }, (_, i) => [0.5 + 0.5 * Math.sin(i * 7.3), 0.4 + 0.6 * Math.abs(Math.sin(i * 3.1))]);
function lerpColor(c1, c2, t) {
  const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const a = p(c1), b = p(c2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

const G = {
  state: 'menu', // menu | playing | dying | continue | over | paused
  // run state (reset every run)
  laneF: 0, laneTarget: 0,
  jumpT: -1, slideT: -1,
  speed: 0, dist: 0, score: 0, runCoins: 0, mult: 1,
  obstacles: [], coins: [], pickups: [], letters: [], decor: [], parts: [], floats: [], flyCoins: [],
  spawnAt: 0, decorAt: 0,
  pu: { magnet: 0, mult: 0, boost: 0, shield: 0 },
  boardT: 0, themeIdx: 0, camX: 0, roll: 0,
  fever: 0, flashT: 0, nextMile: 500, queueJump: false,
  jumpDur: 0.62, jumpPow: 1, chaseT: 0, trail: [],
  revives: 0, invinc: 0, shake: 0, dieT: 0, phase: 0,
  runMissions: [], doubled: false, lastSafe: 1,
  combo: 0, comboT: 0,
  continueTimer: null, scoreTick: null,
};

const JUMP_DUR = 0.62, SLIDE_DUR = 0.7;

function startRun() {
  Object.assign(G, {
    state: 'playing', laneF: 0, laneTarget: 0, jumpT: -1, slideT: -1,
    speed: 300, dist: 0, score: 0, runCoins: 0, mult: 1,
    obstacles: [], coins: [], pickups: [], letters: [], decor: [], parts: [], floats: [], flyCoins: [],
    spawnAt: 300, decorAt: 0,
    pu: { magnet: 0, mult: 0, boost: 0, shield: 0 },
    boardT: 0, themeIdx: 0, camX: 0, roll: 0,
    fever: 0, flashT: 0, nextMile: 500, queueJump: false,
    jumpDur: 0.62, jumpPow: 1, chaseT: 2.6, trail: [],
    revives: 0, invinc: 1.5, shake: 0, dieT: 0, phase: 0,
    runMissions: [], doubled: false, lastSafe: 1,
    combo: 0, comboT: 0,
  });
  if (charDef().bonus.startShield) G.pu.shield = puDuration('shield');
  hideOverlays();
  showScreen('game');
  refreshBalances();
  rebuildPuChips();
  AudioSys.startMusic();
}

function hideOverlays() {
  for (const id of ['ovl-pause', 'ovl-continue', 'ovl-over', 'mod-ad']) $(id).classList.add('hidden');
}

function puDuration(kind) {
  const def = POWERUPS[kind];
  let d = def.base + def.per * (S.upgrades[kind] - 1);
  if (charDef().bonus.pu) d *= 1 + charDef().bonus.pu;
  return d;
}

/* ---------- spawning ---------- */
const PATTERNS = [
  ['train', null, null], [null, 'train', null], [null, null, 'train'],
  ['train', 'train', null], ['train', null, 'train'], [null, 'train', 'train'],
  ['hurdle', 'hurdle', 'hurdle'], ['bar', 'bar', 'bar'],
  ['train', 'hurdle', null], [null, 'hurdle', 'train'], ['hurdle', null, 'bar'],
  ['train', 'bar', 'hurdle'], ['bar', 'train', null], ['hurdle', 'train', 'bar'],
  [null, 'bar', null], ['hurdle', null, 'hurdle'],
];

function spawnChunk() {
  const pat = pick(PATTERNS);
  const safe = [];
  pat.forEach((kind, i) => {
    const lane = i - 1;
    if (!kind) { safe.push(lane); return; }
    if (kind !== 'train') safe.push(lane); // jumpable / rollable lanes are passable
    G.obstacles.push({
      kind, lane, z: SPAWN_Z + rand(0, 60),
      len: kind === 'train' ? rand(150, 260) : 26,
      hue: irand(0, 4),
      vz: (kind === 'train' && Math.random() < 0.25) ? rand(70, 150) : 0, // some trains charge at you
    });
  });
  const safeLane = safe.length ? pick(safe) : 0;
  G.lastSafe = safeLane;

  // coin trails: straight lines, zigzags across lanes, or arcs over hurdles
  const trailRoll = Math.random();
  if (trailRoll < 0.5) {
    const n = irand(6, 10);
    const claneOptions = pat.map((k, i) => i - 1).filter(l => pat[l + 1] !== 'train');
    const clane = claneOptions.length ? pick(claneOptions) : safeLane;
    for (let i = 0; i < n; i++) {
      G.coins.push({ laneF: clane, z: SPAWN_Z + 130 + i * 46, spin: rand(0, 6), h: 0 });
    }
  } else if (trailRoll < 0.75) {
    // zigzag sweep across all three lanes
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < 9; i++) {
      const lf = -dir + dir * 2 * Math.abs(Math.sin(i * 0.39));
      G.coins.push({ laneF: lf, z: SPAWN_Z + 320 + i * 52, spin: rand(0, 6), h: 0 });
    }
  }
  // golden arc over a hurdle — jump to grab them all!
  const hurdleLane = pat.findIndex(k => k === 'hurdle') - 1;
  if (hurdleLane >= -1 && pat.includes('hurdle') && Math.random() < 0.6) {
    const hz = SPAWN_Z + 30;
    for (let i = 0; i < 5; i++) {
      G.coins.push({
        laneF: hurdleLane, z: hz - 60 + i * 30, spin: rand(0, 6),
        h: Math.sin((i / 4) * Math.PI) * 0.9,
      });
    }
  }
  // occasional power-up on the safe lane (sometimes a mystery box!)
  if (Math.random() < 0.16) {
    const kind = Math.random() < 0.22 ? 'box' : pick(Object.keys(POWERUPS));
    G.pickups.push({ kind, laneF: safeLane, z: SPAWN_Z + 90, spin: 0 });
  }
  // word-hunt letters appear until today's word is done
  const li = nextHuntLetter();
  if (li >= 0 && Math.random() < 0.12) {
    G.letters.push({ idx: li, laneF: safeLane, z: SPAWN_Z + 200, spin: 0 });
  }
  // launch ramps: hit one for a SUPER JUMP into a sky-high coin arc
  if (Math.random() < 0.15) {
    G.obstacles.push({ kind: 'ramp', lane: safeLane, z: SPAWN_Z + 320, len: 36, hue: 0, vz: 0 });
    for (let i = 0; i < 6; i++) {
      G.coins.push({
        laneF: safeLane, z: SPAWN_Z + 430 + i * 60, spin: rand(0, 6),
        h: Math.sin(((i + 1) / 7) * Math.PI) * 1.5,
      });
    }
  }
}

const THEME_DECOR = [
  ['tree', 'house', 'tree'],
  ['cactus', 'rock', 'cactus'],
  ['pine', 'snowman', 'pine'],
  ['lolly', 'cane', 'lolly'],
];

function spawnDecor() {
  const side = Math.random() < 0.5 ? -1 : 1;
  G.decor.push({
    laneF: side * rand(1.9, 2.8), z: SPAWN_Z,
    kind: pick(THEME_DECOR[G.themeIdx % THEME_DECOR.length]),
    hue: irand(0, 4),
  });
}

/* ---------- input ---------- */
function doLane(dir) {
  if (G.state !== 'playing') return;
  const t = clamp(G.laneTarget + dir, -1, 1);
  if (t !== G.laneTarget) { G.laneTarget = t; AudioSys.sfx('lane'); }
}
function doJump() {
  if (G.state !== 'playing') return;
  if (G.jumpT < 0 && G.slideT < 0) {
    G.jumpT = 0;
    G.jumpDur = JUMP_DUR;
    G.jumpPow = 1;
    AudioSys.sfx('jump');
    S.stats.jumps++; missionEvent('jumps', 1);
  } else if (G.jumpT >= 0) {
    G.queueJump = true; // buffered input — jump again the instant you land
  }
}
function doSlide() {
  if (G.state !== 'playing') return;
  if (G.jumpT >= 0) { G.jumpT = -1; } // jump-cancel, like the pros
  if (G.slideT < 0) {
    G.slideT = 0;
    AudioSys.sfx('slide');
    S.stats.slides++; missionEvent('slides', 1);
  }
}
function activateBoard() {
  if (G.state !== 'playing' || G.boardT > 0 || S.hoverboards <= 0) return;
  S.hoverboards--;
  save();
  G.boardT = HOVERBOARD_TIME;
  AudioSys.sfx('revive');
  toast('🛹 Hoverboard ON — crash-proof for 30s!', true);
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': doLane(-1); break;
    case 'ArrowRight': case 'd': case 'D': doLane(1); break;
    case 'ArrowUp': case 'w': case 'W': case ' ': doJump(); break;
    case 'ArrowDown': case 's': case 'S': doSlide(); break;
    case 'h': case 'H': activateBoard(); break;
    case 'p': case 'P': case 'Escape':
      if (G.state === 'playing') pauseGame();
      else if (G.state === 'paused') resumeGame();
      break;
  }
});

let touchStart = null;
canvas.addEventListener('pointerdown', (e) => { touchStart = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (Math.max(adx, ady) < 24) { doJump(); } // tap = jump
  else if (adx > ady) { doLane(dx > 0 ? 1 : -1); }
  else if (dy < 0) { doJump(); }
  else { doSlide(); }
  touchStart = null;
});

/* ---------- update ---------- */
function update(dt) {
  G.phase += dt;
  // speed ramps up forever (capped) — the addictive difficulty curve
  const targetSpeed = Math.min(760, 300 + G.dist / 28);
  G.speed = lerp(G.speed, targetSpeed * (G.pu.boost > 0 ? 1.65 : 1), dt * 2);

  const dz = G.speed * dt;
  G.dist += dz / 10; // metres
  S.stats.totalDist += dz / 10;
  missionEvent('distance', dz / 10);

  const scoreBonus = 1 + (charDef().bonus.score || 0);
  G.score += dz * 0.12 * G.mult * scoreBonus;
  missionEvent('score', Math.floor(G.score));

  // lane movement + chase camera
  G.laneF = lerp(G.laneF, G.laneTarget, Math.min(1, dt * 12));
  G.camX = lerp(G.camX, G.laneF * 0.55, Math.min(1, dt * 8));
  G.roll = lerp(G.roll, (G.laneTarget - G.laneF) * 0.045, Math.min(1, dt * 10));

  // jump / slide timers (with a landing puff + buffered jumps)
  if (G.jumpT >= 0) {
    G.jumpT += dt;
    if (G.jumpT > G.jumpDur) {
      G.jumpT = -1;
      G.jumpPow = 1; G.jumpDur = JUMP_DUR;
      const pr = project(G.laneF, 0);
      burst(pr.x, pr.y - 6, 'rgba(230,225,210,.9)', 7);
      G.shake = Math.max(G.shake, 2.5);
      if (G.queueJump) { G.queueJump = false; G.jumpT = 0; AudioSys.sfx('jump'); S.stats.jumps++; }
    }
  }
  if (G.chaseT > 0) G.chaseT -= dt;
  if (G.slideT >= 0) { G.slideT += dt; if (G.slideT > SLIDE_DUR) G.slideT = -1; }
  if (G.invinc > 0) G.invinc -= dt;

  // power-up timers
  for (const k of Object.keys(G.pu)) {
    if (G.pu[k] > 0) {
      G.pu[k] -= dt;
      if (G.pu[k] <= 0) { G.pu[k] = 0; rebuildPuChips(); }
    }
  }
  // FEVER mode — triggered by combo chains, everything counts triple
  if (G.fever > 0) {
    G.fever -= dt;
    if (G.fever <= 0) { G.fever = 0; toast('Fever over — chain coins to spark it again! 🔥'); }
  }
  if (G.flashT > 0) G.flashT -= dt;
  G.mult = (G.pu.mult > 0 ? 2 : 1) * (G.fever > 0 ? 3 : 1);
  $('hud-mult').textContent = G.fever > 0 ? '🔥 FEVER x' + G.mult : 'x' + G.mult;

  // distance milestones
  if (G.dist >= G.nextMile) {
    addFloat(`🏁 ${fmt(G.nextMile)}m!`, W / 2, H * 0.26, '#7fe0ff', 36);
    AudioSys.sfx('mile');
    G.nextMile += 500;
  }

  // spawning by distance travelled
  G.spawnAt -= dz;
  if (G.spawnAt <= 0) {
    spawnChunk();
    G.spawnAt = rand(320, 500) * clamp(1 - G.dist / 14000, 0.55, 1); // chunks get denser
  }
  G.decorAt -= dz;
  if (G.decorAt <= 0) { spawnDecor(); G.decorAt = rand(90, 200); }

  // combo chain decays if you stop collecting
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }

  // move world (some trains rush toward you!)
  for (const o of G.obstacles) {
    o.z -= dz + (o.vz || 0) * dt;
    // near-miss bonus: a train thunders past one lane over
    if (!o.passed && o.z < -2) {
      o.passed = true;
      if (o.kind === 'train') {
        const d = Math.abs(o.lane - G.laneF);
        if (d > 0.55 && d < 1.5) {
          G.score += 25;
          const pr = project(G.laneF, 0);
          addFloat('😅 Close call! +25', pr.x, pr.y - H * 0.28, '#7fe0ff');
        }
      }
    }
  }
  for (const c of G.coins) { c.z -= dz; c.spin += dt * 6; }
  for (const p of G.pickups) { p.z -= dz; p.spin += dt * 4; }
  for (const l of G.letters) { l.z -= dz; l.spin += dt * 3; }
  for (const d of G.decor) d.z -= dz;
  G.obstacles = G.obstacles.filter(o => o.z + o.len > -60);
  G.coins = G.coins.filter(c => c.z > -40 && !c.taken);
  G.pickups = G.pickups.filter(p => p.z > -40 && !p.taken);
  G.letters = G.letters.filter(l => l.z > -40 && !l.taken);
  G.decor = G.decor.filter(d => d.z > -40);

  // hoverboard timer
  if (G.boardT > 0) {
    G.boardT -= dt;
    if (G.boardT <= 0) { G.boardT = 0; toast('🛹 Hoverboard finished!'); }
  }
  // hoverboard button visibility
  const showBoard = S.hoverboards > 0 && G.boardT <= 0;
  $('btn-board').classList.toggle('hidden', !showBoard);
  if (showBoard) $('board-count').textContent = 'x' + S.hoverboards;

  // world theme changes every 2,500m
  const ti = Math.floor(G.dist / 2500) % THEMES.length;
  if (ti !== G.themeIdx) {
    G.themeIdx = ti;
    addFloat(`${THEMES[ti].name}!`, W / 2, H * 0.32, '#fff');
    AudioSys.sfx('mission');
  }

  // magnet pulls coins
  if (G.pu.magnet > 0) {
    for (const c of G.coins) {
      if (c.z < 350) c.laneF = lerp(c.laneF, G.laneF, Math.min(1, dt * 8));
    }
  }

  const jumping = G.jumpT >= 0 && Math.sin((G.jumpT / G.jumpDur) * Math.PI) > 0.3;
  const sliding = G.slideT >= 0;

  // coins flying to the wallet
  for (const fc of G.flyCoins) {
    fc.t += dt * 2.4;
    fc.x = lerp(fc.x, W - 70, fc.t * 0.22);
    fc.y = lerp(fc.y, 30, fc.t * 0.22);
    if (fc.t >= 1) bumpEl('hud-coins');
  }
  G.flyCoins = G.flyCoins.filter(fc => fc.t < 1);

  // collect coins (high arc coins need a jump!)
  for (const c of G.coins) {
    if (c.h > 0.3 && !jumping) continue;
    if (c.z < HITZ + 14 && c.z > -24 && Math.abs(c.laneF - G.laneF) < 0.6) {
      c.taken = true;
      const v = Math.round(1 * (1 + (charDef().bonus.coin || 0)) * G.mult * (S.doubler ? 2 : 1));
      G.runCoins += v;
      S.stats.totalCoins += v;
      missionEvent('coins', v);
      AudioSys.coinSfx(G.combo);
      const pr = project(c.laneF, Math.max(0, c.z));
      addFloat(`+${v}`, pr.x, pr.y - 60, '#ffd23e');
      burst(pr.x, pr.y - 40, '#ffd23e', 5);
      G.flyCoins.push({ x: pr.x, y: pr.y - 50, t: 0 });
      // combo chain — escalating praise, then FEVER TIME
      G.combo++; G.comboT = 1.6;
      const praise = { 5: 'NICE!', 10: 'GREAT!', 20: 'AWESOME!', 30: 'UNSTOPPABLE!', 40: 'LEGENDARY!!' };
      if (praise[G.combo]) {
        addFloat(praise[G.combo], W / 2, H * 0.3, '#ff6ec4', 36);
        AudioSys.sfx('powerup');
      }
      if (G.combo % 10 === 0) {
        const bonus = G.combo * 5;
        G.score += bonus;
        addFloat(`COMBO x${G.combo}! +${bonus}`, W / 2, H * 0.37, '#ffd23e', 26);
      }
      if (G.fever <= 0 && G.combo >= 15 && G.combo % 15 === 0) {
        G.fever = 7;
        G.flashT = 0.35;
        addFloat('🔥 FEVER TIME!! x3 🔥', W / 2, H * 0.3, '#fff', 42);
        AudioSys.sfx('fever');
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }
      refreshBalances();
    }
  }

  // collect power-ups & mystery boxes
  for (const p of G.pickups) {
    if (p.z < HITZ + 14 && p.z > -24 && Math.abs(p.laneF - G.laneF) < 0.6) {
      p.taken = true;
      const pr = project(p.laneF, Math.max(0, p.z));
      if (p.kind === 'box') {
        S.boxes++;
        save();
        AudioSys.sfx('buy');
        addFloat('🎁 Mystery Box!', pr.x, pr.y - 70, '#c97aff');
        burst(pr.x, pr.y - 40, '#c97aff', 12);
        refreshBalances();
      } else {
        G.pu[p.kind] = puDuration(p.kind);
        S.stats.powerups++; missionEvent('powerups', 1);
        AudioSys.sfx('powerup');
        addFloat(POWERUPS[p.kind].icon + ' ' + POWERUPS[p.kind].name + '!', pr.x, pr.y - 70, POWERUPS[p.kind].color);
        burst(pr.x, pr.y - 40, POWERUPS[p.kind].color, 12);
        rebuildPuChips();
      }
    }
  }

  // collect word-hunt letters
  for (const l of G.letters) {
    if (l.z < HITZ + 14 && l.z > -24 && Math.abs(l.laneF - G.laneF) < 0.6) {
      l.taken = true;
      const pr = project(l.laneF, Math.max(0, l.z));
      burst(pr.x, pr.y - 40, '#ffd23e', 10);
      collectHuntLetter(l.idx);
    }
  }

  // obstacle collisions
  for (const o of G.obstacles) {
    if (o.hit) continue;
    if (o.z < HITZ && o.z + o.len > -12 && Math.abs(o.lane - G.laneF) < 0.55) {
      if (o.kind === 'ramp') {
        // SUPER JUMP! soar over everything and hoover up the sky coins
        o.hit = true;
        G.jumpT = 0;
        G.jumpDur = JUMP_DUR * 1.9;
        G.jumpPow = 1.8;
        G.slideT = -1;
        G.flashT = Math.max(G.flashT, 0.12);
        AudioSys.sfx('fever');
        const pr = project(G.laneF, 0);
        addFloat('🛫 SUPER JUMP!', pr.x, pr.y - H * 0.3, '#7fe0ff', 32);
        burst(pr.x, pr.y - 20, '#7fe0ff', 14);
        continue;
      }
      const cleared = (o.kind === 'hurdle' && jumping) || (o.kind === 'bar' && sliding);
      if (cleared) continue;
      if (G.pu.boost > 0 || G.invinc > 0) { smash(o); continue; }
      // hoverboard takes the hit and shatters — you keep running!
      if (G.boardT > 0) {
        G.boardT = 0;
        smash(o);
        G.invinc = 1.2;
        G.shake = 8;
        toast('🛹 Board smashed — you survived!', true);
        AudioSys.sfx('crash');
        continue;
      }
      if (G.pu.shield > 0) { G.pu.shield = 0; rebuildPuChips(); smash(o); G.invinc = 1.2; continue; }
      crash();
      break;
    }
  }

  // running dust at the feet
  if (G.jumpT < 0 && Math.random() < 0.35) {
    const pr = project(G.laneF, 0);
    G.parts.push({
      x: pr.x + rand(-14, 14), y: pr.y - rand(0, 6),
      vx: rand(-30, 30), vy: rand(-60, -10),
      life: rand(0.25, 0.5), color: 'rgba(230,225,210,.8)', size: rand(2, 5),
    });
  }

  // particles & floats
  for (const p of G.parts) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const f of G.floats) { f.y -= 50 * dt; f.life -= dt; }
  G.floats = G.floats.filter(f => f.life > 0);
  if (G.shake > 0) G.shake -= dt * 30;

  // HUD
  $('hud-score').textContent = fmt(G.score);
  $('hud-mult').classList.toggle('hidden', G.mult <= 1);
  updatePuChips();
}

function smash(o) {
  o.hit = true;
  const pr = project(o.lane, Math.max(0, o.z));
  burst(pr.x, pr.y - 50, '#ff8c5a', 16);
  G.score += 50;
  addFloat('+50 SMASH!', pr.x, pr.y - 90, '#ff8c5a');
  AudioSys.sfx('smash');
  G.obstacles = G.obstacles.filter(x => x !== o);
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    G.parts.push({
      x, y, vx: rand(-220, 220), vy: rand(-340, -40),
      life: rand(0.4, 0.8), color, size: rand(3, 7),
    });
  }
}

function addFloat(text, x, y, color, size) {
  G.floats.push({ text, x, y, color, life: size > 26 ? 1.4 : 1, size: size || 22 });
}

/* ---------- crash / continue / game over ---------- */
function reviveCost() {
  let cost = REVIVE_BASE * Math.pow(2, G.revives);
  if (charDef().bonus.revive) cost = Math.round(cost * (1 - charDef().bonus.revive));
  return cost;
}

function crash() {
  G.state = 'dying';
  G.dieT = 0.9;
  G.shake = 14;
  AudioSys.sfx('crash');
  const pr = project(G.laneF, 0);
  burst(pr.x, pr.y - 40, '#ff5e5e', 24);
  burst(pr.x, pr.y - 40, '#ffd23e', 14);
  if (navigator.vibrate) navigator.vibrate(120);
}

function showContinue() {
  G.state = 'continue';
  const cost = reviveCost();
  $('revive-cost').textContent = fmt(cost);
  $('btn-revive-coins').disabled = false;
  $('btn-revive-coins').style.opacity = (S.coins + G.runCoins) >= cost ? '1' : '.5';
  $('ovl-continue').classList.remove('hidden');
  startContinueCountdown();
}

function startContinueCountdown() {
  clearInterval(G.continueTimer);
  let t = 9;
  $('continue-count').textContent = t;
  G.continueTimer = setInterval(() => {
    if (!$('mod-ad').classList.contains('hidden')) return; // pause while ad is open
    t--;
    $('continue-count').textContent = Math.max(0, t);
    if (t <= 0) { clearInterval(G.continueTimer); gameOver(); }
  }, 1000);
}

function revive() {
  clearInterval(G.continueTimer);
  $('ovl-continue').classList.add('hidden');
  G.revives++;
  G.invinc = 2.5;
  G.jumpT = -1; G.slideT = -1;
  G.speed = Math.max(280, G.speed * 0.7);
  // sweep the danger zone so the comeback feels heroic
  G.obstacles = G.obstacles.filter(o => o.z > 420);
  G.state = 'playing';
  G.chaseT = 2.6;
  AudioSys.sfx('revive');
  toast('🚀 Back in the run!', true);
}

function gameOver() {
  clearInterval(G.continueTimer);
  $('ovl-continue').classList.add('hidden');
  G.state = 'over';
  AudioSys.sfx('over');

  const score = Math.floor(G.score);
  const isBest = score > S.best;
  if (isBest) {
    S.best = score;
    // confetti rain behind the dialog
    for (let i = 0; i < 90; i++) {
      G.parts.push({
        x: rand(0, W), y: rand(-H * 0.3, 0),
        vx: rand(-50, 50), vy: rand(60, 200), gentle: true,
        life: rand(1.5, 3.5), color: pick(['#ffd23e', '#ff6ec4', '#5ad845', '#54a9ff', '#ff8c1a']),
        size: rand(3, 8),
      });
    }
  }
  S.coins += G.runCoins;
  S.stats.runs++;
  missionEvent('runs', 1);

  // XP and level-ups — every run makes you stronger
  const beforeLvl = levelInfo().lvl;
  S.xp = (S.xp || 0) + Math.round(score / 10 + G.runCoins);
  const afterLvl = levelInfo().lvl;
  if (afterLvl > beforeLvl) {
    const reward = afterLvl * 100;
    S.coins += reward;
    toast(`⬆️ LEVEL ${afterLvl}! +${reward} 🪙`, true);
    AudioSys.sfx('mission');
    for (let i = 0; i < 50; i++) {
      G.parts.push({
        x: rand(0, W), y: rand(-H * 0.2, 0),
        vx: rand(-50, 50), vy: rand(60, 180), gentle: true,
        life: rand(1.5, 3), color: pick(['#ffd23e', '#5ad845', '#54a9ff']), size: rand(3, 7),
      });
    }
  }
  save();

  // score ticks up — far more satisfying than a static number
  clearInterval(G.scoreTick);
  const stepN = Math.max(1, Math.floor(score / 45));
  let shown = Math.min(score, stepN);
  $('over-score').textContent = fmt(shown);
  G.scoreTick = setInterval(() => {
    shown = Math.min(score, shown + stepN);
    $('over-score').textContent = fmt(shown);
    if (shown >= score) clearInterval(G.scoreTick);
  }, 25);
  const stars = (isBest || score >= 5000) ? 3 : score >= 1500 ? 2 : 1;
  $('over-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  $('over-best').textContent = fmt(S.best);
  $('over-coins').textContent = fmt(G.runCoins);
  $('over-newbest').classList.toggle('hidden', !isBest);
  $('btn-double').classList.toggle('hidden', G.runCoins <= 0 || G.doubled);
  const om = $('over-missions');
  om.innerHTML = '';
  for (const t of G.runMissions) {
    const d = document.createElement('div');
    d.className = 'over-mission';
    d.textContent = '🎯 Done: ' + t;
    om.appendChild(d);
  }
  $('ovl-over').classList.remove('hidden');
  refreshBalances();
}

function pauseGame() {
  if (G.state !== 'playing') return;
  G.state = 'paused';
  $('ovl-pause').classList.remove('hidden');
}
function resumeGame() {
  if (G.state !== 'paused') return;
  $('ovl-pause').classList.add('hidden');
  G.state = 'playing';
}

/* ---------- power-up HUD chips ---------- */
const puChips = {};
function rebuildPuChips() {
  const box = $('hud-powerups');
  box.innerHTML = '';
  for (const k of Object.keys(puChips)) delete puChips[k];
  for (const k of Object.keys(POWERUPS)) {
    if (G.pu[k] > 0) {
      const el = document.createElement('div');
      el.className = 'pu-chip';
      el.innerHTML = `${POWERUPS[k].icon} ${POWERUPS[k].name}<div class="pu-bar"><i></i></div>`;
      box.appendChild(el);
      puChips[k] = el.querySelector('.pu-bar > i');
    }
  }
}
function updatePuChips() {
  for (const k of Object.keys(puChips)) {
    puChips[k].style.width = clamp((G.pu[k] / puDuration(k)) * 100, 0, 100) + '%';
  }
}

/* ---------- render ---------- */
function render() {
  ctx.clearRect(0, 0, W, H);

  // dramatic slow zoom onto the crash
  ctx.save();
  if (G.state === 'dying') {
    const zm = 1 + 0.16 * (1 - clamp(G.dieT / 0.9, 0, 1));
    const pp = project(G.laneF, 0);
    ctx.translate(pp.x, pp.y - H * 0.06);
    ctx.scale(zm, zm);
    ctx.translate(-pp.x, -(pp.y - H * 0.06));
  }

  // sky cycles with distance
  const cyc = (G.dist / 2500) % SKIES.length;
  const i0 = Math.floor(cyc), i1 = (i0 + 1) % SKIES.length, ft = cyc - i0;
  const skyTop = lerpColor(SKIES[i0][0], SKIES[i1][0], ft);
  const skyBot = lerpColor(SKIES[i0][1], SKIES[i1][1], ft);
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON() * 1.4);
  sky.addColorStop(0, skyTop); sky.addColorStop(1, skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON() * 1.4);

  // sun with halo
  ctx.fillStyle = 'rgba(255,240,180,.14)';
  ctx.beginPath(); ctx.arc(W * 0.78, HORIZON() * 0.45, 78, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,180,.3)';
  ctx.beginPath(); ctx.arc(W * 0.78, HORIZON() * 0.45, 52, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,246,200,.95)';
  ctx.beginPath(); ctx.arc(W * 0.78, HORIZON() * 0.45, 34, 0, 7); ctx.fill();

  // drifting clouds
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const cl of CLOUDS) {
    const cw = W * cl[2];
    const cx2 = (((cl[0] * W - G.dist * cl[3]) % (W + cw * 2)) + W + cw * 2) % (W + cw * 2) - cw;
    const cy = HORIZON() * cl[1];
    ctx.beginPath();
    ctx.ellipse(cx2, cy, cw * 0.5, cw * 0.18, 0, 0, 7);
    ctx.ellipse(cx2 - cw * 0.25, cy + cw * 0.05, cw * 0.3, cw * 0.14, 0, 0, 7);
    ctx.ellipse(cx2 + cw * 0.22, cy + cw * 0.04, cw * 0.28, cw * 0.13, 0, 0, 7);
    ctx.fill();
  }

  // stars come out at night
  const nightW = (i0 === 2 ? 1 - ft : 0) + (i1 === 2 ? ft : 0);
  if (nightW > 0.05) {
    ctx.fillStyle = '#fff';
    for (const s of STARS) {
      ctx.globalAlpha = nightW * s[2];
      ctx.beginPath(); ctx.arc(s[0] * W, s[1] * HORIZON(), 1.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // per-world backdrops, crossfading at the borders
  drawBackdrop(i0 % THEMES.length, 1);
  if (ft > 0.03) drawBackdrop(i1 % THEMES.length, ft);

  // a little flock of birds
  ctx.strokeStyle = 'rgba(40,40,60,.55)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const bx = ((G.phase * 38 + k * 170) % (W + 120)) - 60;
    const by = HORIZON() * (0.3 + 0.12 * Math.sin(k * 2.1 + G.phase * 1.2));
    const flap = Math.sin(G.phase * 9 + k) * 4;
    ctx.beginPath();
    ctx.moveTo(bx - 9, by - flap);
    ctx.quadraticCurveTo(bx - 4, by + 3, bx, by);
    ctx.quadraticCurveTo(bx + 4, by + 3, bx + 9, by - flap);
    ctx.stroke();
  }

  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  // subtle world roll when swerving lanes
  if (Math.abs(G.roll) > 0.001) {
    ctx.translate(W / 2, H);
    ctx.rotate(G.roll);
    ctx.translate(-W / 2, -H);
  }

  // ground with depth shading — colours follow the rotating world theme
  const t0 = THEMES[i0 % THEMES.length], t1 = THEMES[i1 % THEMES.length];
  const gg = ctx.createLinearGradient(0, HORIZON(), 0, H);
  gg.addColorStop(0, lerpColor(t0.ground[0], t1.ground[0], ft));
  gg.addColorStop(1, lerpColor(t0.groundLo[0], t1.groundLo[0], ft));
  ctx.fillStyle = gg;
  ctx.fillRect(0, HORIZON(), W, H - HORIZON());

  // grass speed stripes
  {
    const stripe = 170;
    const soff = (G.dist * 10) % (stripe * 2);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let z = -soff; z < ZMAX; z += stripe * 2) {
      const a = project(0, Math.max(0, z)), b = project(0, Math.max(0, z + stripe));
      ctx.fillRect(0, b.y, W, a.y - b.y);
    }
  }

  // gravel track bed with edge shadow
  const edgeL0 = project(-1.55, 0), edgeR0 = project(1.55, 0);
  const edgeLZ = project(-1.55, ZMAX), edgeRZ = project(1.55, ZMAX);
  const tg = ctx.createLinearGradient(0, HORIZON(), 0, H);
  tg.addColorStop(0, '#8e857c');
  tg.addColorStop(1, '#a89d92');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(edgeL0.x, edgeL0.y); ctx.lineTo(edgeR0.x, edgeR0.y);
  ctx.lineTo(edgeRZ.x, edgeRZ.y); ctx.lineTo(edgeLZ.x, edgeLZ.y);
  ctx.closePath(); ctx.fill();
  // darker shoulders
  ctx.fillStyle = 'rgba(0,0,0,.13)';
  for (const s of [-1, 1]) {
    const a = project(s * 1.55, 0), b = project(s * 1.42, 0);
    const az = project(s * 1.55, ZMAX), bz = project(s * 1.42, ZMAX);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(bz.x, bz.y); ctx.lineTo(az.x, az.y);
    ctx.closePath(); ctx.fill();
  }

  // white picket fences along the track
  {
    const foff = (G.dist * 10) % 130;
    for (const fl of [-1.78, 1.78]) {
      const r0 = project(fl, 0), rz = project(fl, ZMAX);
      const h0 = LANE_W() * 0.26, hz = LANE_W() * 0.26 * rz.p;
      ctx.strokeStyle = 'rgba(250,246,235,.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(r0.x, r0.y - h0 * 0.62); ctx.lineTo(rz.x, rz.y - hz * 0.62);
      ctx.stroke();
      ctx.fillStyle = 'rgba(250,246,235,.9)';
      for (let z = -foff; z < ZMAX; z += 130) {
        const pp = project(fl, Math.max(0.001, z));
        const ph = LANE_W() * 0.26 * pp.p;
        ctx.fillRect(pp.x - ph * 0.07, pp.y - ph, ph * 0.14, ph);
      }
    }
  }

  // railway tracks: sleepers + rails per lane
  const quad = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath(); ctx.fill();
  };
  const segLen = 70;
  const off = (G.dist * 10) % segLen;
  for (const lane of [-1, 0, 1]) {
    ctx.fillStyle = '#6e4f33';
    for (let z = -off; z < ZMAX; z += segLen) {
      if (z + 14 < 0) continue;
      quad(
        project(lane - 0.34, Math.max(0, z)), project(lane + 0.34, Math.max(0, z)),
        project(lane + 0.34, z + 13), project(lane - 0.34, z + 13)
      );
    }
    ctx.fillStyle = '#d7dde6';
    for (const ro of [-0.21, 0.21]) {
      quad(
        project(lane + ro - 0.02, 0), project(lane + ro + 0.02, 0),
        project(lane + ro + 0.02, ZMAX), project(lane + ro - 0.02, ZMAX)
      );
    }
  }

  // gather drawables far → near
  const items = [];
  for (const d of G.decor) items.push({ z: d.z, draw: () => drawDecor(d) });
  for (const o of G.obstacles) items.push({ z: o.z, draw: () => drawObstacle(o) });
  for (const c of G.coins) items.push({ z: c.z, draw: () => drawCoin(c) });
  for (const p of G.pickups) items.push({ z: p.z, draw: () => drawPickup(p) });
  for (const l of G.letters) items.push({ z: l.z, draw: () => drawLetter(l) });
  items.push({ z: 0, draw: drawPlayer });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.draw();

  // particles
  for (const p of G.parts) {
    ctx.globalAlpha = clamp(p.life / 0.5, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // floating texts
  for (const f of G.floats) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = `800 ${f.size || 22}px "Baloo 2", "Comic Sans MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // super-boost speed lines
  if (G.pu.boost > 0 && G.state === 'playing') {
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = Math.random() < 0.5 ? rand(0, W * 0.16) : rand(W * 0.84, W);
      const y = rand(0, H * 0.9);
      const len = rand(40, 130);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (x - W / 2) * 0.06, y + len);
      ctx.stroke();
    }
  }

  // night-time mood tint
  if (nightW > 0.05) {
    ctx.fillStyle = `rgba(14,14,72,${0.3 * nightW})`;
    ctx.fillRect(0, 0, W, H);
  }

  // soft cinematic vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // coins flying up to the wallet counter
  for (const fc of G.flyCoins) {
    ctx.fillStyle = '#c98a00';
    ctx.beginPath(); ctx.arc(fc.x, fc.y, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(fc.x, fc.y, 7, 0, 7); ctx.fill();
  }

  // FEVER: pulsing rainbow border + warm wash
  if (G.fever > 0) {
    const hue = (G.phase * 160) % 360;
    ctx.fillStyle = `hsla(${hue}, 95%, 60%, .06)`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `hsla(${hue}, 95%, 62%, ${0.35 + 0.25 * Math.sin(G.phase * 10)})`;
    ctx.lineWidth = 12;
    ctx.beginPath(); rrPath(6, 6, W - 12, H - 12, 26); ctx.stroke();
  }

  // white pop flash (fever start etc.)
  if (G.flashT > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(G.flashT / 0.35, 0, 1) * 0.65})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore(); // crash-zoom transform
}

/* ---------- themed horizon backdrops ---------- */
function drawBackdrop(ti, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const hz = HORIZON();
  const ridge = (amp, span, speed, color, sharp) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-2, hz + 1);
    const shift = G.dist * speed;
    for (let x = 0; x <= W + W / 22; x += W / 22) {
      let s = Math.sin((x + shift) / span);
      if (sharp) s = Math.abs(s) * 1.7 - 0.7;
      ctx.lineTo(x, hz - amp * (0.55 + 0.45 * s));
    }
    ctx.lineTo(W + 2, hz + 1);
    ctx.closePath(); ctx.fill();
  };
  const wrapX = (frac, speed, pad) =>
    ((frac * W - G.dist * speed) % (W + pad * 2) + W + pad * 2) % (W + pad * 2) - pad;

  switch (ti) {
    case 0: { // Sunny Meadows: rolling hills + hot-air balloon
      ridge(H * 0.11, 260, 0.3, 'rgba(96,170,98,.5)');
      ridge(H * 0.065, 150, 0.65, 'rgba(66,140,76,.6)');
      const bx = wrapX(0.3, 0.5, 80);
      const by = hz * 0.42 + Math.sin(G.phase * 0.8) * 8;
      ctx.fillStyle = '#ff6e6e';
      ctx.beginPath(); ctx.arc(bx, by, 26, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(bx, by, 26, -0.5, 0.9); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,40,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 22); ctx.lineTo(bx - 7, by + 40);
      ctx.moveTo(bx + 12, by + 22); ctx.lineTo(bx + 7, by + 40);
      ctx.stroke();
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(bx - 9, by + 38, 18, 12);
      break;
    }
    case 1: { // Desert Dunes: dunes + pyramids
      const px = wrapX(0.55, 0.22, 160);
      ctx.fillStyle = 'rgba(215,170,100,.75)';
      ctx.beginPath();
      ctx.moveTo(px - 90, hz + 1); ctx.lineTo(px, hz - H * 0.11); ctx.lineTo(px + 90, hz + 1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,120,65,.75)';
      ctx.beginPath();
      ctx.moveTo(px, hz - H * 0.11); ctx.lineTo(px + 90, hz + 1); ctx.lineTo(px + 28, hz + 1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(215,170,100,.6)';
      ctx.beginPath();
      ctx.moveTo(px - 200, hz + 1); ctx.lineTo(px - 145, hz - H * 0.06); ctx.lineTo(px - 90, hz + 1);
      ctx.closePath(); ctx.fill();
      ridge(H * 0.07, 320, 0.32, 'rgba(232,196,124,.55)');
      ridge(H * 0.045, 180, 0.62, 'rgba(212,170,96,.65)');
      break;
    }
    case 2: { // Snowy Peaks: jagged ice + aurora ribbons
      ridge(H * 0.15, 210, 0.28, 'rgba(196,214,238,.6)', true);
      ridge(H * 0.09, 130, 0.58, 'rgba(152,178,212,.65)', true);
      for (let band = 0; band < 2; band++) {
        ctx.strokeStyle = `hsla(${150 + band * 50}, 85%, 65%, .16)`;
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let x = 0; x <= W; x += W / 14) {
          const y = hz * (0.28 + band * 0.1) + Math.sin(x / 70 + G.phase * 0.7 + band * 2) * 14;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 3: { // Candy Land: rainbow + scoop hills
      const rx = W * 0.28, rcols = ['#ff5e5e', '#ff9a3c', '#ffe14d', '#5ad845', '#54a9ff'];
      ctx.lineWidth = 9;
      rcols.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.globalAlpha = alpha * 0.55;
        ctx.beginPath();
        ctx.arc(rx, hz + 30, hz * 0.62 - i * 9, Math.PI, 0);
        ctx.stroke();
      });
      ctx.globalAlpha = alpha;
      ridge(H * 0.1, 230, 0.32, 'rgba(255,160,205,.55)');
      ridge(H * 0.06, 140, 0.64, 'rgba(245,118,180,.6)');
      break;
    }
  }
  ctx.restore();
}

const TRAIN_COLORS = ['#e8443a', '#3a7be8', '#9b59d0', '#1faa59', '#e8930c'];
const GUARD_DEF = { body: '#8b93a8', belly: '#cfd6e2', hat: 'cap' };

function drawObstacle(o) {
  if (o.z > ZMAX) return;
  const front = project(o.lane, Math.max(0.001, o.z));
  const back = project(o.lane, Math.max(0.001, o.z + o.len));
  const w = LANE_W() * 0.86 * front.p;

  if (o.kind === 'train') {
    const col = TRAIN_COLORS[o.hue];
    const h = w * 1.18;
    const bw = LANE_W() * 0.86 * back.p;
    const hb = bw * 1.18;

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.moveTo(front.x - w * 0.55, front.y + h * 0.04);
    ctx.lineTo(front.x + w * 0.55, front.y + h * 0.04);
    ctx.lineTo(back.x + bw * 0.55, back.y);
    ctx.lineTo(back.x - bw * 0.55, back.y);
    ctx.closePath(); ctx.fill();

    // visible side (when the train is in a side lane)
    const sideDir = o.lane < -0.1 ? 0.46 : o.lane > 0.1 ? -0.46 : 0;
    if (sideDir) {
      const gF = project(o.lane + sideDir, Math.max(0.001, o.z));
      const gB = project(o.lane + sideDir, Math.max(0.001, o.z + o.len));
      const sg = ctx.createLinearGradient(0, front.y - h, 0, front.y);
      sg.addColorStop(0, shade(col, -0.1));
      sg.addColorStop(1, shade(col, -0.45));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(gF.x, front.y); ctx.lineTo(gF.x, front.y - h * 0.96);
      ctx.lineTo(gB.x, back.y - hb * 0.96); ctx.lineTo(gB.x, back.y);
      ctx.closePath(); ctx.fill();
      // side windows
      ctx.fillStyle = 'rgba(200,235,255,.85)';
      for (let t = 0.18; t < 0.85; t += 0.22) {
        const x1 = lerp(gF.x, gB.x, t), x2 = lerp(gF.x, gB.x, t + 0.13);
        const yTop1 = lerp(front.y - h * 0.82, back.y - hb * 0.82, t);
        const yBot1 = lerp(front.y - h * 0.52, back.y - hb * 0.52, t);
        const yTop2 = lerp(front.y - h * 0.82, back.y - hb * 0.82, t + 0.13);
        const yBot2 = lerp(front.y - h * 0.52, back.y - hb * 0.52, t + 0.13);
        ctx.beginPath();
        ctx.moveTo(x1, yTop1); ctx.lineTo(x2, yTop2); ctx.lineTo(x2, yBot2); ctx.lineTo(x1, yBot1);
        ctx.closePath(); ctx.fill();
      }
    }

    // roof
    const rg = ctx.createLinearGradient(front.x - w / 2, 0, front.x + w / 2, 0);
    rg.addColorStop(0, shade(col, 0.05));
    rg.addColorStop(0.5, shade(col, 0.3));
    rg.addColorStop(1, shade(col, 0.05));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(back.x - bw / 2, back.y - hb * 0.96);
    ctx.lineTo(back.x + bw / 2, back.y - hb * 0.96);
    ctx.lineTo(front.x + w / 2, front.y - h);
    ctx.lineTo(front.x - w / 2, front.y - h);
    ctx.closePath(); ctx.fill();

    // front face with lighting + outline
    const fg = ctx.createLinearGradient(0, front.y - h, 0, front.y);
    fg.addColorStop(0, shade(col, 0.12));
    fg.addColorStop(1, shade(col, -0.28));
    ctx.fillStyle = fg;
    rr(front.x - w / 2, front.y - h, w, h, w * 0.13);
    ctx.strokeStyle = shade(col, -0.5);
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.beginPath(); rrPath(front.x - w / 2, front.y - h, w, h, w * 0.13); ctx.stroke();

    // windscreen with sky reflection
    const wg = ctx.createLinearGradient(0, front.y - h * 0.9, 0, front.y - h * 0.55);
    wg.addColorStop(0, '#e6f7ff');
    wg.addColorStop(1, '#8fc9ec');
    ctx.fillStyle = wg;
    rr(front.x - w * 0.34, front.y - h * 0.88, w * 0.68, h * 0.32, w * 0.07);
    // bumper stripe
    ctx.fillStyle = shade(col, 0.35);
    rr(front.x - w * 0.42, front.y - h * 0.42, w * 0.84, h * 0.09, w * 0.04);
    // headlights with glow
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(255,235,130,.35)';
      ctx.beginPath(); ctx.arc(front.x + s * w * 0.28, front.y - h * 0.2, w * 0.15, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath(); ctx.arc(front.x + s * w * 0.28, front.y - h * 0.2, w * 0.08, 0, 7); ctx.fill();
    }
    // cowcatcher
    ctx.fillStyle = '#4d4d55';
    ctx.beginPath();
    ctx.moveTo(front.x - w * 0.46, front.y - h * 0.07);
    ctx.lineTo(front.x + w * 0.46, front.y - h * 0.07);
    ctx.lineTo(front.x, front.y + h * 0.07);
    ctx.closePath(); ctx.fill();
    // wheels
    ctx.fillStyle = '#2b2b30';
    ctx.beginPath();
    ctx.arc(front.x - w * 0.3, front.y - h * 0.02, w * 0.09, 0, 7);
    ctx.arc(front.x + w * 0.3, front.y - h * 0.02, w * 0.09, 0, 7);
    ctx.fill();
    // charging trains puff smoke
    if (o.vz > 0 && Math.random() < 0.25) {
      G.parts.push({
        x: front.x + rand(-w * 0.2, w * 0.2), y: front.y - h,
        vx: rand(-20, 20), vy: rand(-120, -50),
        life: rand(0.4, 0.8), color: 'rgba(235,235,240,.7)', size: rand(4, 9) * front.p,
      });
    }
  } else if (o.kind === 'ramp') {
    // golden launch ramp rising away from the camera
    const bw = LANE_W() * 0.86 * back.p;
    const rh = bw * 0.85;
    const rg2 = ctx.createLinearGradient(0, back.y - rh, 0, front.y);
    rg2.addColorStop(0, '#ffd23e');
    rg2.addColorStop(1, '#ff8c1a');
    ctx.fillStyle = rg2;
    ctx.beginPath();
    ctx.moveTo(front.x - w * 0.45, front.y);
    ctx.lineTo(front.x + w * 0.45, front.y);
    ctx.lineTo(back.x + bw * 0.45, back.y - rh);
    ctx.lineTo(back.x - bw * 0.45, back.y - rh);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b06800';
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.stroke();
    // upward chevrons
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 2; i++) {
      const t = 0.3 + i * 0.35;
      const cxp = lerp(front.x, back.x, t);
      const cyp = lerp(front.y, back.y - rh, t);
      const cs = lerp(w, bw, t) * 0.18;
      ctx.beginPath();
      ctx.moveTo(cxp - cs, cyp + cs); ctx.lineTo(cxp, cyp - cs * 0.6); ctx.lineTo(cxp + cs, cyp + cs);
      ctx.lineTo(cxp, cyp + cs * 0.3);
      ctx.closePath(); ctx.fill();
    }
  } else if (o.kind === 'hurdle') {
    const h = w * 0.42;
    ctx.fillStyle = '#888';
    ctx.fillRect(front.x - w * 0.42, front.y - h, w * 0.07, h);
    ctx.fillRect(front.x + w * 0.35, front.y - h, w * 0.07, h);
    // striped board
    const bx = front.x - w * 0.46, by = front.y - h, bw2 = w * 0.92, bh = h * 0.55;
    ctx.save();
    ctx.beginPath(); rrPath(bx, by, bw2, bh, h * 0.12); ctx.clip();
    ctx.fillStyle = '#ff8c1a'; ctx.fillRect(bx, by, bw2, bh);
    ctx.fillStyle = '#fff';
    for (let s = 0; s < 5; s++) {
      ctx.save();
      ctx.translate(bx + s * bw2 / 4, by);
      ctx.rotate(0.5);
      ctx.fillRect(0, -bh, bw2 / 10, bh * 3);
      ctx.restore();
    }
    ctx.restore();
    // blinking beacon on top
    const blinkOn = Math.floor(G.phase * 4) % 2 === 0;
    ctx.fillStyle = blinkOn ? '#ffce3a' : '#8a6d1f';
    ctx.beginPath(); ctx.arc(front.x, front.y - h * 1.12, w * 0.06, 0, 7); ctx.fill();
    if (blinkOn) {
      ctx.fillStyle = 'rgba(255,206,58,.3)';
      ctx.beginPath(); ctx.arc(front.x, front.y - h * 1.12, w * 0.13, 0, 7); ctx.fill();
    }
  } else { // bar — roll under it!
    const postH = w * 1.25;
    ctx.fillStyle = '#777';
    ctx.fillRect(front.x - w * 0.5, front.y - postH, w * 0.08, postH);
    ctx.fillRect(front.x + w * 0.42, front.y - postH, w * 0.08, postH);
    ctx.fillStyle = '#e8443a';
    rr(front.x - w * 0.55, front.y - postH, w * 1.1, w * 0.5, w * 0.08);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.max(9, w * 0.22)}px "Baloo 2","Comic Sans MS",sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('DUCK!', front.x, front.y - postH + w * 0.34);
    // alternating red warning lights
    const lit = Math.floor(G.phase * 4) % 2;
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = i === lit ? '#ff5a4d' : '#7a2620';
      ctx.beginPath();
      ctx.arc(front.x + (i === 0 ? -1 : 1) * w * 0.35, front.y - postH - w * 0.07, w * 0.06, 0, 7);
      ctx.fill();
    }
  }
}

function rr(x, y, w, h, r) { ctx.beginPath(); rrPath(x, y, w, h, r); ctx.fill(); }
function rrPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCoin(c) {
  if (c.z > ZMAX) return;
  const pr = project(c.laneF, Math.max(0.001, c.z));
  const r = LANE_W() * 0.16 * pr.p;
  const sq = Math.abs(Math.cos(c.spin));
  const y = pr.y - r * 1.6 - Math.sin(c.spin * 1.3) * r * 0.25 - (c.h || 0) * H * 0.17 * pr.p;
  // soft glow
  ctx.fillStyle = 'rgba(255,220,80,.22)';
  ctx.beginPath(); ctx.arc(pr.x, y, r * 1.9, 0, 7); ctx.fill();
  ctx.fillStyle = '#c98a00';
  ctx.beginPath(); ctx.ellipse(pr.x, y, r * Math.max(0.18, sq), r, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.ellipse(pr.x, y, r * Math.max(0.12, sq * 0.82), r * 0.82, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath(); ctx.ellipse(pr.x - r * 0.2 * sq, y - r * 0.25, r * 0.16 * Math.max(0.3, sq), r * 0.2, 0, 0, 7); ctx.fill();
  // twinkling sparkle
  if (Math.sin(c.spin * 2.3) > 0.93) {
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.lineCap = 'round';
    const sx = pr.x + r * 0.7, sy = y - r * 0.8, sl = r * 0.45;
    ctx.beginPath();
    ctx.moveTo(sx - sl, sy); ctx.lineTo(sx + sl, sy);
    ctx.moveTo(sx, sy - sl); ctx.lineTo(sx, sy + sl);
    ctx.stroke();
  }
}

function drawPickup(p) {
  if (p.z > ZMAX) return;
  const pr = project(p.laneF, Math.max(0.001, p.z));
  const r = LANE_W() * 0.22 * pr.p;
  const y = pr.y - r * 1.7 - Math.sin(p.spin) * r * 0.3;
  const isBox = p.kind === 'box';
  ctx.fillStyle = isBox ? '#a45ce8' : POWERUPS[p.kind].color;
  ctx.beginPath(); ctx.arc(pr.x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.arc(pr.x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7); ctx.fill();
  ctx.font = `${r * 1.1}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(isBox ? '🎁' : POWERUPS[p.kind].icon, pr.x, y + r * 0.05);
  ctx.textBaseline = 'alphabetic';
}

function drawLetter(l) {
  if (l.z > ZMAX) return;
  const pr = project(l.laneF, Math.max(0.001, l.z));
  const r = LANE_W() * 0.2 * pr.p;
  const y = pr.y - r * 1.9 - Math.sin(l.spin * 1.5) * r * 0.3;
  // glowing golden tile with the hunt letter
  ctx.fillStyle = 'rgba(255,210,62,.25)';
  ctx.beginPath(); ctx.arc(pr.x, y, r * 1.7, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#ffe98a'); g.addColorStop(1, '#f0a800');
  ctx.fillStyle = g;
  rr(pr.x - r, y - r, r * 2, r * 2, r * 0.3);
  ctx.strokeStyle = '#8a6200'; ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath(); rrPath(pr.x - r, y - r, r * 2, r * 2, r * 0.3); ctx.stroke();
  ctx.fillStyle = '#5b3a00';
  ctx.font = `800 ${r * 1.3}px "Baloo 2","Comic Sans MS",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(HUNT_WORD[l.idx], pr.x, y + r * 0.1);
  ctx.textBaseline = 'alphabetic';
}

function drawDecor(d) {
  if (d.z > ZMAX) return;
  const pr = project(d.laneF, Math.max(0.001, d.z));
  const s = LANE_W() * 0.9 * pr.p;
  const x = pr.x, y = pr.y;
  switch (d.kind) {
    case 'tree':
      ctx.fillStyle = '#7a4a21';
      ctx.fillRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5);
      ctx.fillStyle = ['#2e9e44', '#37b052', '#1f8a3c', '#46c060', '#2a9648'][d.hue];
      ctx.beginPath();
      ctx.arc(x, y - s * 0.72, s * 0.34, 0, 7);
      ctx.arc(x - s * 0.2, y - s * 0.5, s * 0.26, 0, 7);
      ctx.arc(x + s * 0.2, y - s * 0.5, s * 0.26, 0, 7);
      ctx.fill();
      break;
    case 'house': {
      const cols = ['#ffb46b', '#7fc8ff', '#ff9aa8', '#c9a6ff', '#ffe08a'];
      ctx.fillStyle = cols[d.hue];
      ctx.fillRect(x - s * 0.35, y - s * 0.75, s * 0.7, s * 0.75);
      ctx.fillStyle = '#d2453a';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.45, y - s * 0.75);
      ctx.lineTo(x, y - s * 1.05);
      ctx.lineTo(x + s * 0.45, y - s * 0.75);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.fillRect(x - s * 0.2, y - s * 0.58, s * 0.16, s * 0.16);
      ctx.fillRect(x + s * 0.06, y - s * 0.58, s * 0.16, s * 0.16);
      break;
    }
    case 'cactus':
      ctx.fillStyle = '#3f9e4e';
      rr(x - s * 0.09, y - s * 0.85, s * 0.18, s * 0.85, s * 0.09);
      rr(x - s * 0.32, y - s * 0.62, s * 0.13, s * 0.3, s * 0.06);
      rr(x + s * 0.19, y - s * 0.72, s * 0.13, s * 0.34, s * 0.06);
      ctx.fillRect(x - s * 0.3, y - s * 0.38, s * 0.2, s * 0.08);
      ctx.fillRect(x + s * 0.1, y - s * 0.44, s * 0.2, s * 0.08);
      break;
    case 'rock':
      ctx.fillStyle = ['#b59a7c', '#a78d70', '#c0a585', '#9c8266', '#b29478'][d.hue];
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.16, s * 0.32, s * 0.18, 0, 0, 7);
      ctx.ellipse(x - s * 0.12, y - s * 0.28, s * 0.18, s * 0.14, 0, 0, 7);
      ctx.fill();
      break;
    case 'pine':
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(x - s * 0.05, y - s * 0.25, s * 0.1, s * 0.25);
      for (let i = 0; i < 3; i++) {
        const ly = y - s * (0.25 + i * 0.26), lw = s * (0.42 - i * 0.1);
        ctx.fillStyle = '#1f6e3e';
        ctx.beginPath();
        ctx.moveTo(x - lw, ly); ctx.lineTo(x, ly - s * 0.34); ctx.lineTo(x + lw, ly);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath();
        ctx.moveTo(x - lw, ly); ctx.lineTo(x - lw * 0.55, ly - s * 0.1);
        ctx.lineTo(x + lw * 0.2, ly - s * 0.05); ctx.lineTo(x + lw, ly);
        ctx.closePath(); ctx.fill();
      }
      break;
    case 'snowman':
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.2, s * 0.24, 0, 7);
      ctx.arc(x, y - s * 0.52, s * 0.17, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(x - s * 0.06, y - s * 0.56, s * 0.025, 0, 7);
      ctx.arc(x + s * 0.06, y - s * 0.56, s * 0.025, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.52); ctx.lineTo(x + s * 0.14, y - s * 0.5); ctx.lineTo(x, y - s * 0.47);
      ctx.closePath(); ctx.fill();
      break;
    case 'cane': {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = s * 0.13;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.7);
      ctx.arc(x + s * 0.14, y - s * 0.7, s * 0.14, Math.PI, 0);
      ctx.stroke();
      ctx.strokeStyle = '#e8443a';
      ctx.setLineDash([s * 0.1, s * 0.1]);
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.7);
      ctx.arc(x + s * 0.14, y - s * 0.7, s * 0.14, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'lolly': {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - s * 0.03, y - s * 0.55, s * 0.06, s * 0.55);
      const cols2 = ['#ff6ec4', '#54a9ff', '#5ad845', '#ffd23e', '#c97aff'];
      ctx.fillStyle = cols2[d.hue];
      ctx.beginPath(); ctx.arc(x, y - s * 0.72, s * 0.22, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath(); ctx.arc(x, y - s * 0.72, s * 0.13, 0.5, 4.5); ctx.stroke();
      break;
    }
  }
}

function drawPlayer() {
  const pr = project(G.laneF, 0);
  const size = LANE_W() * 0.58;
  const jumpH = G.jumpT >= 0 ? Math.sin((G.jumpT / G.jumpDur) * Math.PI) : 0;
  const boardLift = G.boardT > 0 ? size * 0.14 + Math.sin(G.phase * 6) * size * 0.04 : 0;
  const y = pr.y - jumpH * H * 0.2 * G.jumpPow - boardLift;

  // ribbon trail (rainbow in fever)
  G.trail.unshift({ x: pr.x, y: y - size * 0.55 });
  if (G.trail.length > 15) G.trail.pop();
  if (G.state === 'playing' && G.trail.length > 2) {
    ctx.lineCap = 'round';
    for (let i = 1; i < G.trail.length; i++) {
      const fade = 1 - i / G.trail.length;
      ctx.strokeStyle = G.fever > 0
        ? `hsla(${(G.phase * 160 + i * 18) % 360}, 95%, 65%, ${fade * 0.6})`
        : shade(charDef().body, 0.15).replace('rgb', 'rgba').replace(')', `,${(fade * 0.4).toFixed(2)})`);
      ctx.lineWidth = size * 0.24 * fade;
      ctx.beginPath();
      ctx.moveTo(G.trail[i - 1].x, G.trail[i - 1].y);
      ctx.lineTo(G.trail[i].x - i * 1.5, G.trail[i].y + i * 0.8);
      ctx.stroke();
    }
  }

  // hoverboard under the rider
  if (G.boardT > 0) {
    ctx.fillStyle = 'rgba(80,220,255,.35)';
    ctx.beginPath(); ctx.ellipse(pr.x, y + size * 0.06, size * 0.55, size * 0.14, 0, 0, 7); ctx.fill();
    const bgr = ctx.createLinearGradient(pr.x - size * 0.5, 0, pr.x + size * 0.5, 0);
    bgr.addColorStop(0, '#37b6ff'); bgr.addColorStop(0.5, '#7fe0ff'); bgr.addColorStop(1, '#37b6ff');
    ctx.fillStyle = bgr;
    rr(pr.x - size * 0.5, y - size * 0.05, size, size * 0.12, size * 0.06);
    // sparkle trail
    if (Math.random() < 0.6) {
      G.parts.push({
        x: pr.x + rand(-size * 0.4, size * 0.4), y: y + size * 0.08,
        vx: rand(-30, 30), vy: rand(30, 120),
        life: rand(0.25, 0.5), color: '#7fe0ff', size: rand(2, 5),
      });
    }
  }

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(pr.x, pr.y, size * 0.45 * (1 - jumpH * 0.4), size * 0.12 * (1 - jumpH * 0.4), 0, 0, 7);
  ctx.fill();

  // blink while invincible
  if (G.invinc > 0 && Math.floor(G.invinc * 10) % 2 === 0 && G.state === 'playing') return;

  drawCharacter(ctx, pr.x, y, size, charDef(), {
    run: G.state === 'playing',
    phase: G.phase,
    jump: jumpH,
    slide: G.slideT >= 0 ? Math.sin((G.slideT / SLIDE_DUR) * Math.PI) : 0,
    lean: G.laneTarget - G.laneF,
  });

  // the grumpy guard gives chase after every start and revive!
  if (G.chaseT > 0 && G.state === 'playing') {
    const exitDrop = G.chaseT < 0.7 ? (0.7 - G.chaseT) / 0.7 : 0;
    const gp = project(G.laneF * 0.6, -34);
    drawCharacter(ctx, gp.x, gp.y + H * 0.015 + exitDrop * H * 0.3, size * 0.95, GUARD_DEF, {
      run: true, phase: G.phase * 0.92,
    });
  }

  // bubble shield
  if (G.pu.shield > 0) {
    ctx.strokeStyle = 'rgba(110,240,160,.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pr.x, y - size * 0.55, size * 0.85, 0, 7);
    ctx.stroke();
    ctx.fillStyle = 'rgba(110,240,160,.12)';
    ctx.fill();
  }
  // boost flames
  if (G.pu.boost > 0) {
    for (let i = 0; i < 3; i++) {
      G.parts.push({
        x: pr.x + rand(-size * 0.3, size * 0.3), y: y - size * 0.2,
        vx: rand(-40, 40), vy: rand(80, 220),
        life: rand(0.2, 0.45), color: pick(['#ffd23e', '#ff8c1a', '#ff5e5e']), size: rand(3, 7),
      });
    }
  }
}

/* ---------- main loop ---------- */
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.state === 'playing') update(dt);
  if (G.state === 'dying') {
    G.dieT -= dt;
    if (G.shake > 0) G.shake -= dt * 30;
    for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt; }
    G.parts = G.parts.filter(p => p.life > 0);
    if (G.dieT <= 0) showContinue();
  }
  if (G.state === 'over' || G.state === 'continue') {
    // keep confetti / sparks falling behind the dialog
    for (const p of G.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.gentle ? 120 : 600) * dt;
      p.life -= dt;
    }
    G.parts = G.parts.filter(p => p.life > 0);
  }
  if (!$('scr-game').classList.contains('hidden')) render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ============================== panel rendering ============================== */
function renderShop() {
  refreshBalances();

  // gear: hoverboards, mystery boxes, the coin doubler
  const gear = $('gear-list');
  gear.innerHTML = '';
  const gearItems = [
    {
      emoji: '🛹', name: `Hoverboard (you have ${fmt(S.hoverboards)})`,
      desc: 'Press 🛹 in a run — crash-proof for 30s!',
      label: `🪙 ${fmt(HOVERBOARD_PRICE)}`, cls: 'btn-yellow',
      buy: () => {
        if (S.coins < HOVERBOARD_PRICE) { toast('Not enough coins! Watch an ad? 🎬'); return; }
        S.coins -= HOVERBOARD_PRICE; S.hoverboards++; save();
        AudioSys.sfx('buy'); toast('🛹 Hoverboard added!', true); renderShop();
      },
    },
    {
      emoji: '🎁', name: `Mystery Box (you have ${fmt(S.boxes)})`,
      desc: 'Random surprise: coins, boards… or the JACKPOT!',
      label: `🪙 ${fmt(BOX_PRICE)}`, cls: 'btn-yellow',
      buy: () => {
        if (S.coins < BOX_PRICE) { toast('Not enough coins! Watch an ad? 🎬'); return; }
        S.coins -= BOX_PRICE; S.boxes++; save();
        AudioSys.sfx('buy'); renderShop(); openBoxModal();
      },
    },
    {
      emoji: '✨', name: 'Coin Doubler',
      desc: S.doubler ? 'Active — every coin counts twice, forever!' : 'Every coin counts TWICE — forever!',
      label: S.doubler ? 'OWNED!' : `🪙 ${fmt(DOUBLER_PRICE)}`, cls: S.doubler ? 'btn-grey' : 'btn-yellow',
      disabled: S.doubler,
      buy: () => {
        if (S.coins < DOUBLER_PRICE) { toast(`Need ${fmt(DOUBLER_PRICE - S.coins)} more coins!`); return; }
        S.coins -= DOUBLER_PRICE; S.doubler = true; save();
        AudioSys.sfx('mission'); toast('✨ COIN DOUBLER unlocked forever!', true); renderShop();
      },
    },
  ];
  for (const g of gearItems) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-emoji">${g.emoji}</div>
      <div class="card-info"><b>${g.name}</b><span>${g.desc}</span></div>
      <button class="btn ${g.cls}" ${g.disabled ? 'disabled' : ''}>${g.label}</button>`;
    if (!g.disabled) card.querySelector('button').addEventListener('click', () => { AudioSys.sfx('click'); g.buy(); });
    gear.appendChild(card);
  }

  const list = $('upgrade-list');
  list.innerHTML = '';
  for (const k of Object.keys(POWERUPS)) {
    const lvl = S.upgrades[k];
    const card = document.createElement('div');
    card.className = 'card';
    const pips = Array.from({ length: MAX_UPG }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
    const maxed = lvl >= MAX_UPG;
    card.innerHTML = `
      <div class="card-emoji">${POWERUPS[k].icon}</div>
      <div class="card-info">
        <b>${POWERUPS[k].name}</b>
        <span>Lasts ${(POWERUPS[k].base + POWERUPS[k].per * (lvl - 1)).toFixed(1)}s</span>
        <div class="upg-pips">${pips}</div>
      </div>
      <button class="btn ${maxed ? 'btn-grey' : 'btn-yellow'}" ${maxed ? 'disabled' : ''}>
        ${maxed ? 'MAX!' : `🪙 ${fmt(upgCost(lvl))}`}
      </button>`;
    if (!maxed) {
      card.querySelector('button').addEventListener('click', () => {
        if (S.coins < upgCost(lvl)) { toast('Not enough coins! Watch an ad? 🎬'); AudioSys.sfx('click'); return; }
        S.coins -= upgCost(lvl);
        S.upgrades[k]++;
        save();
        AudioSys.sfx('buy');
        toast(`${POWERUPS[k].name} upgraded! ⚡`, true);
        renderShop();
      });
    }
    list.appendChild(card);
  }
}

function renderChars() {
  refreshBalances();
  const grid = $('char-grid');
  grid.innerHTML = '';
  for (const c of CHARACTERS) {
    const owned = S.owned.includes(c.id);
    const sel = S.character === c.id;
    const card = document.createElement('div');
    card.className = 'char-card' + (sel ? ' selected' : '');
    const cv = document.createElement('canvas');
    cv.width = 120; cv.height = 120;
    drawCharacter(cv.getContext('2d'), 60, 112, 76, c, {});
    card.appendChild(cv);
    const name = document.createElement('b'); name.textContent = c.name;
    const perk = document.createElement('div'); perk.className = 'perk'; perk.textContent = c.perk;
    const btn = document.createElement('button');
    btn.className = 'btn ' + (sel ? 'btn-grey' : owned ? 'btn-green' : 'btn-yellow');
    btn.textContent = sel ? '✔ Playing!' : owned ? 'Choose' : `🪙 ${fmt(c.price)}`;
    btn.addEventListener('click', () => {
      AudioSys.sfx('click');
      if (sel) return;
      if (owned) {
        S.character = c.id; save(); renderChars();
        AudioSys.sfx('buy');
      } else if (S.coins >= c.price) {
        S.coins -= c.price;
        S.owned.push(c.id);
        S.character = c.id;
        save();
        AudioSys.sfx('buy');
        toast(`${c.name} joined your team! 🎉`, true);
        renderChars();
      } else {
        toast(`Need ${fmt(c.price - S.coins)} more coins!`);
      }
    });
    card.appendChild(name); card.appendChild(perk); card.appendChild(btn);
    grid.appendChild(card);
  }
}

function renderMissions() {
  refreshBalances();
  ensureMissions();
  resetWordHuntIfNewDay();

  // daily word hunt card
  const wh = $('wordhunt-card');
  const done = S.wordHunt.got.every(Boolean);
  const tiles = HUNT_WORD.split('').map((ch, i) =>
    `<span class="hunt-tile ${S.wordHunt.got[i] ? 'got' : ''}">${S.wordHunt.got[i] ? ch : '?'}</span>`).join('');
  wh.innerHTML = `
    <div class="card mission-card hunt-card">
      <div class="mission-top">
        <b>✉️ Daily Word Hunt ${done ? '— DONE! 🎉' : ''}</b>
        <span class="hunt-streak">🔥 ${S.wordHunt.streak} day${S.wordHunt.streak === 1 ? '' : 's'}</span>
      </div>
      <div class="hunt-tiles">${tiles}</div>
      <div class="mission-prog">${done ? 'Come back tomorrow for a new word!' : `Grab golden letters during runs to spell ${HUNT_WORD} — win coins + a Mystery Box!`}</div>
    </div>`;

  const list = $('mission-list');
  list.innerHTML = '';
  S.missions.forEach((m, i) => {
    const done = m.prog >= m.target;
    const card = document.createElement('div');
    card.className = 'card mission-card';
    card.innerHTML = `
      <div class="mission-top">
        <b>${done ? '✅' : '🎯'} ${missionText(m)}</b>
        <button class="btn ${done ? 'btn-green' : 'btn-grey'}" ${done ? '' : 'disabled'}>🪙 ${m.reward}</button>
      </div>
      <div class="mission-bar"><i style="width:${(m.prog / m.target) * 100}%"></i></div>
      <div class="mission-prog">${fmt(Math.min(m.prog, m.target))} / ${fmt(m.target)}</div>`;
    if (done) card.querySelector('button').addEventListener('click', () => claimMission(i));
    list.appendChild(card);
  });
}

function renderSettings() {
  $('tgl-sound').textContent = S.sound ? 'On' : 'Off';
  $('tgl-sound').className = 'btn ' + (S.sound ? 'btn-blue' : 'btn-grey');
  $('tgl-music').textContent = S.music ? 'On' : 'Off';
  $('tgl-music').className = 'btn ' + (S.music ? 'btn-blue' : 'btn-grey');
  $('stats-box').innerHTML = `
    🏃 Runs played: <b>${fmt(S.stats.runs)}</b><br>
    📏 Total distance: <b>${fmt(S.stats.totalDist)}m</b><br>
    🪙 Coins collected: <b>${fmt(S.stats.totalCoins)}</b><br>
    🦘 Jumps: <b>${fmt(S.stats.jumps)}</b> &nbsp; 🤸 Rolls: <b>${fmt(S.stats.slides)}</b><br>
    ⚡ Power-ups grabbed: <b>${fmt(S.stats.powerups)}</b>`;
}

/* ============================== wire up UI ============================== */
function bind(id, fn) { $(id).addEventListener('click', () => { AudioSys.sfx('click'); fn(); }); }

let howtoThenPlay = false;
bind('btn-play', () => {
  if (!S.seenHowto) {
    S.seenHowto = true; save();
    howtoThenPlay = true;
    $('mod-howto').classList.remove('hidden');
    return;
  }
  startRun();
});
bind('btn-howto-ok', () => {
  $('mod-howto').classList.add('hidden');
  if (howtoThenPlay) { howtoThenPlay = false; startRun(); }
});
bind('btn-howto', () => {
  // from the menu the dialog is informational only — don't auto-start
  S.seenHowto = true; save();
  howtoThenPlay = false;
  $('mod-howto').classList.remove('hidden');
});

bind('btn-shop', () => showScreen('shop'));
bind('btn-chars', () => showScreen('chars'));
bind('btn-missions', () => showScreen('missions'));
bind('btn-settings', () => showScreen('settings'));
for (const b of document.querySelectorAll('.btn-back')) {
  b.addEventListener('click', () => { AudioSys.sfx('click'); showScreen(b.dataset.to); });
}

bind('btn-pause', pauseGame);
bind('btn-board', activateBoard);
bind('btn-boxes', openBoxModal);
bind('btn-box-open', doOpenBox);
bind('btn-box-buy', () => {
  if (S.coins < BOX_PRICE) { toast('Not enough coins! Watch an ad? 🎬'); return; }
  S.coins -= BOX_PRICE; S.boxes++; save();
  AudioSys.sfx('buy');
  refreshBoxButtons();
  refreshBalances();
});
bind('btn-box-close', () => $('mod-box').classList.add('hidden'));
bind('btn-resume', resumeGame);
bind('btn-restart', startRun);
bind('btn-quit', () => { G.state = 'menu'; $('ovl-pause').classList.add('hidden'); showScreen('menu'); });

/* continue screen */
bind('btn-revive-coins', () => {
  const cost = reviveCost();
  // run coins are spent first, then the bank
  if (S.coins + G.runCoins < cost) {
    toast('Not enough coins — watch an ad instead! 🎬');
    return;
  }
  let rest = cost;
  const fromRun = Math.min(G.runCoins, rest);
  G.runCoins -= fromRun; rest -= fromRun;
  S.coins -= rest;
  save();
  refreshBalances();
  revive();
});
bind('btn-revive-ad', () => {
  clearInterval(G.continueTimer); // freeze the countdown while the ad plays
  openAd(() => revive());
});
bind('btn-no-thanks', () => gameOver());

/* game over */
bind('btn-double', () => {
  openAd(() => {
    S.coins += G.runCoins;
    G.doubled = true;
    save();
    $('over-coins').textContent = fmt(G.runCoins * 2);
    $('btn-double').classList.add('hidden');
    toast(`+${fmt(G.runCoins)} 🪙 DOUBLED!`, true);
    AudioSys.sfx('buy');
    refreshBalances();
  });
});
bind('btn-again', startRun);
bind('btn-home', () => { G.state = 'menu'; $('ovl-over').classList.add('hidden'); showScreen('menu'); });

/* ad modal */
bind('btn-ad-claim', () => closeAd(true));
bind('btn-ad-close', () => closeAd(false));

/* shop: free coins ad */
bind('btn-shop-ad', () => {
  openAd(() => {
    addCoins(AD_REWARD);
    toast(`+${AD_REWARD} 🪙 thanks for watching!`, true);
    AudioSys.sfx('buy');
    renderShop();
  });
});

/* shop: coin packs behind the parental gate */
for (const b of document.querySelectorAll('.btn-pack')) {
  b.addEventListener('click', () => {
    AudioSys.sfx('click');
    const pack = COIN_PACKS[+b.dataset.pack];
    openGate(() => {
      // demo purchase — in a real store build this calls the platform billing API
      addCoins(pack.coins);
      toast(`+${fmt(pack.coins)} 🪙 purchased! (demo)`, true);
      AudioSys.sfx('buy');
      renderShop();
    });
  });
}

/* parental gate */
bind('btn-gate-ok', () => {
  if (parseInt($('gate-in').value, 10) === Gate.answer) {
    $('mod-gate').classList.add('hidden');
    const cb = Gate.onOk; Gate.onOk = null;
    if (cb) cb();
  } else {
    toast('Hmm, not quite — try again!');
    $('gate-in').value = '';
  }
});
bind('btn-gate-cancel', () => { $('mod-gate').classList.add('hidden'); Gate.onOk = null; });
$('gate-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-gate-ok').click(); });

/* daily reward */
bind('btn-daily-claim', () => {
  const idx = Math.min(S.daily.streak, 7) - 1;
  S.daily.last = todayStr();
  save();
  addCoins(DAILY_REWARDS[idx]);
  AudioSys.sfx('buy');
  toast(`+${DAILY_REWARDS[idx]} 🪙 daily gift!`, true);
  $('mod-daily').classList.add('hidden');
});

/* settings */
bind('tgl-sound', () => { S.sound = !S.sound; save(); renderSettings(); });
bind('tgl-music', () => {
  S.music = !S.music; save(); renderSettings();
  if (S.music) AudioSys.startMusic(); else AudioSys.stopMusic();
});
bind('btn-reset', () => $('mod-confirm').classList.remove('hidden'));
bind('btn-confirm-no', () => $('mod-confirm').classList.add('hidden'));
bind('btn-confirm-yes', () => {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  location.reload();
});

/* pause when the tab is hidden */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'playing') pauseGame();
});

/* first user gesture unlocks audio + music */
window.addEventListener('pointerdown', () => { AudioSys.ensure(); AudioSys.startMusic(); }, { once: true });

/* ============================== boot ============================== */
/* installable app: offline cache (only when served over http/https) */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

ensureMissions();
resetWordHuntIfNewDay();
showScreen('menu');
checkDaily();
