/* =========================================================================
   RAIL RASCALS! — real-time 3D renderer (Three.js)
   Drives the WebGL scene straight from the game state in game.js.
   If WebGL/THREE is unavailable the game falls back to the 2D renderer.
   ========================================================================= */
'use strict';

window.R3D = (() => {
  if (typeof THREE === 'undefined') return { ok: false };

  const K = 0.022;      // game z-units -> world units
  const LANE = 2;       // lane spacing in world units

  let renderer, scene, camera, W = 0, H = 0;
  let ground, trackBed;
  let skyCanvas, skyCtx, skyTexture, sunSprite;
  const sleepers = [], posts = [], railMats = [];
  const clouds = [], ambient = [], poles = [], gantries = [];
  let player, guard, shieldBall, board, blob;
  let R3D_THEME_COUNT = 4;
  const pools = new Map();
  const sprites = new Map();
  let SKY = new THREE.Color('#bfe6ff');

  /* ---------- helpers ---------- */
  const hash01 = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  // cel-shaded look: banded toon lighting makes the low-poly style intentional
  let TOON_GRAD = null;
  function toonGrad() {
    if (!TOON_GRAD) {
      const data = new Uint8Array([56, 142, 226, 255]);
      TOON_GRAD = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
      TOON_GRAD.minFilter = THREE.NearestFilter;
      TOON_GRAD.magFilter = THREE.NearestFilter;
      TOON_GRAD.needsUpdate = true;
    }
    return TOON_GRAD;
  }
  const mat = (color, opts) => {
    const o = Object.assign({}, opts || {});
    delete o.roughness; delete o.metalness;
    return new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: toonGrad() }, o));
  };
  const MATS = {};
  const cmat = (color) => (MATS[color] = MATS[color] || mat(color));

  // procedural speckle textures give big flat surfaces real grain
  function noiseTex(base, dots, n) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = `rgb(${base},${base},${base})`;
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < n; i++) {
      const v = dots + ((i * 37) % 30) - 15;
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.beginPath();
      x.arc((i * 53.7) % 128, (i * 91.3) % 128, 1 + (i % 3), 0, 7);
      x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function spriteTex(draw, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size || 128;
    draw(c.getContext('2d'), c.width);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 2;
    return t;
  }

  function emojiSprite(emoji) {
    if (!sprites.has(emoji)) {
      sprites.set(emoji, spriteTex((x, s) => {
        x.font = `${s * 0.75}px sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(emoji, s / 2, s / 2 + s * 0.05);
      }));
    }
    return sprites.get(emoji);
  }

  function letterTex(ch) {
    const key = 'L' + ch;
    if (!sprites.has(key)) {
      sprites.set(key, spriteTex((x, s) => {
        const g = x.createLinearGradient(0, 0, 0, s);
        g.addColorStop(0, '#ffe98a'); g.addColorStop(1, '#f0a800');
        x.fillStyle = g;
        x.beginPath(); x.roundRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8, s * 0.16); x.fill();
        x.strokeStyle = '#8a6200'; x.lineWidth = s * 0.05; x.stroke();
        x.fillStyle = '#5b3a00';
        x.font = `800 ${s * 0.55}px "Baloo 2","Comic Sans MS",sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(ch, s / 2, s / 2 + s * 0.04);
      }));
    }
    return sprites.get(key);
  }

  function pool(kind, factory) {
    if (!pools.has(kind)) pools.set(kind, { items: [], i: 0, factory });
    return pools.get(kind);
  }
  function take(kind, factory) {
    const p = pool(kind, factory);
    if (p.i >= p.items.length) {
      const m = p.factory();
      scene.add(m);
      p.items.push(m);
    }
    const m = p.items[p.i++];
    m.visible = true;
    return m;
  }
  function finishPools() {
    for (const p of pools.values()) {
      for (let j = p.i; j < p.items.length; j++) p.items[j].visible = false;
      p.i = 0;
    }
  }

  /* ---------- factories ---------- */
  const TRAIN_COLS = ['#e8443a', '#3a7be8', '#9b59d0', '#1faa59', '#e8930c'];

  function makeTrain() {
    const g = new THREE.Group();
    // toon outline shell around the whole carriage
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.7, 1), OUTLINE);
    shell.position.y = 1.05;
    shell.scale.set(1.05, 1.05, 1.04);
    g.add(shell);
    g.userData.shell = shell;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.7, 1), mat('#e8443a'));
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.83, 0.83, 1, 12, 1, false, 0, Math.PI), mat('#ffffff'));
    roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2;
    roof.scale.set(1, 1, 0.35);
    roof.position.y = 1.9;
    g.add(roof);
    const winF = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.62), mat('#cfeeff', { roughness: 0.25 }));
    winF.position.set(0, 1.55, 0.51);
    g.add(winF);
    const winMat = mat('#bfe2f7', { roughness: 0.3 });
    for (const s of [-1, 1]) {
      const winS = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), winMat);
      winS.rotation.y = s * Math.PI / 2;
      winS.position.set(s * 0.84, 1.4, 0);
      g.add(winS);
    }
    const bump = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.06), mat('#ffd9a8'));
    bump.position.set(0, 0.75, 0.5);
    g.add(bump);
    for (const s of [-1, 1]) {
      const li = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), mat('#ffe14d', { emissive: '#ffcf3a', emissiveIntensity: 0.9 }));
      li.position.set(s * 0.5, 0.5, 0.5);
      g.add(li);
    }
    const cow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.3), mat('#4d4d55'));
    cow.rotation.x = -0.5;
    cow.position.set(0, 0.2, 0.52);
    g.add(cow);
    g.userData = { body, roof, winS: true, winF };
    return g;
  }

  const stripeTexCache = spriteTex((x, s) => {
    x.fillStyle = '#ff8c1a'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#fff';
    for (let i = -1; i < 5; i++) {
      x.save(); x.translate(i * s / 3, 0); x.rotate(0.45);
      x.fillRect(0, -s, s / 6, s * 3);
      x.restore();
    }
  }, 64);

  function makeHurdle() {
    const g = new THREE.Group();
    const pm = cmat('#888888');
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8), pm);
      post.position.set(s * 0.7, 0.4, 0);
      g.add(post);
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.08),
      new THREE.MeshStandardMaterial({ map: stripeTexCache, roughness: 0.8 }));
    board.position.y = 0.72;
    board.castShadow = true;
    g.add(board);
    return g;
  }

  const duckTex = spriteTex((x, s) => {
    x.fillStyle = '#e8443a'; x.fillRect(0, 0, s, s / 2);
    x.fillStyle = '#fff';
    x.font = `800 ${s * 0.3}px "Baloo 2","Comic Sans MS",sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('DUCK!', s / 2, s / 4);
  }, 128);

  function makeBar() {
    const g = new THREE.Group();
    const pm = cmat('#777777');
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2), pm);
      post.position.set(s * 0.8, 1.1, 0);
      g.add(post);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ map: duckTex }));
    sign.position.y = 2.2;
    sign.castShadow = true;
    g.add(sign);
    return g;
  }

  function makeRamp() {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.7), mat('#ffc23a', { emissive: '#7a5200', emissiveIntensity: 0.25 }));
    plate.rotation.x = 0.45;
    plate.position.y = 0.38;
    plate.castShadow = true;
    g.add(plate);
    const arrow = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiSprite('⬆️'), transparent: true }));
    arrow.scale.set(0.7, 0.7, 1);
    arrow.position.set(0, 1.0, 0);
    g.add(arrow);
    return g;
  }

  function makeCoin() {
    const geo = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 18);
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat('#ffd23e', { metalness: 0.5, roughness: 0.25, emissive: '#aa7a00', emissiveIntensity: 0.55 }));
    m.castShadow = true;
    return m;
  }

  function makeSprite(tex, s) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(s, s, 1);
    return sp;
  }

  function makeDecor(kind) {
    const g = new THREE.Group();
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    switch (kind) {
      case 'tree':
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8), cmat('#7a4a21')), 0, 0.4, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), cmat('#2e9e44')), 0, 1.25, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), cmat('#37b052')), -0.4, 0.95, 0.1);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), cmat('#2a9648')), 0.4, 0.95, -0.1);
        break;
      case 'house': {
        add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.1), cmat('#ffb46b')), 0, 0.5, 0);
        const roof = add(new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.7, 4), cmat('#d2453a')), 0, 1.35, 0);
        roof.rotation.y = Math.PI / 4;
        add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), cmat('#fff7d6')), -0.3, 0.6, 0.56);
        add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), cmat('#fff7d6')), 0.3, 0.6, 0.56);
        break;
      }
      case 'cactus':
        add(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.9), cmat('#3f9e4e')), 0, 0.65, 0);
        add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34), cmat('#3f9e4e')), -0.34, 0.75, 0).rotation.z = 0.5;
        add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3), cmat('#3f9e4e')), 0.33, 0.9, 0).rotation.z = -0.5;
        break;
      case 'rock': {
        const r = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), cmat('#b59a7c')), 0, 0.22, 0);
        r.scale.set(1.2, 0.55, 0.9);
        break;
      }
      case 'pine':
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.5), cmat('#6b4423')), 0, 0.25, 0);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.8, 9), cmat('#1f6e3e')), 0, 0.85, 0);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.7, 9), cmat('#2c8a4f')), 0, 1.3, 0);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 9), cmat('#ffffff')), 0, 1.75, 0);
        break;
      case 'snowman': {
        add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), cmat('#ffffff')), 0, 0.4, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), cmat('#ffffff')), 0, 0.95, 0);
        const nose = add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), cmat('#ff8c1a')), 0, 0.98, 0.32);
        nose.rotation.x = Math.PI / 2;
        break;
      }
      case 'cane': {
        const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4), cmat('#e8443a')), 0, 0.7, 0);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 8, 12, Math.PI), cmat('#ffffff')), 0, 1.4, 0);
        c.castShadow = true;
        break;
      }
      case 'lolly': {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1), cmat('#ffffff')), 0, 0.5, 0);
        const pop = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16), cmat('#ff6ec4')), 0, 1.25, 0);
        pop.rotation.x = Math.PI / 2;
        break;
      }
      case 'lavarock': {
        const lr = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), cmat('#3a2c28')), 0, 0.24, 0);
        lr.scale.set(1.25, 0.6, 1);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
          mat('#ff7a28', { emissive: '#ff5a00', emissiveIntensity: 1.4 })), 0.18, 0.42, 0.14);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6),
          mat('#ffae3a', { emissive: '#ff8800', emissiveIntensity: 1.4 })), -0.22, 0.36, -0.05);
        break;
      }
      case 'geyser': {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 0.55, 9), cmat('#6b5a52')), 0, 0.28, 0);
        const puff = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xfff5eb, transparent: true, opacity: 0.7 })), 0, 0.75, 0);
        puff.userData.puff = true;
        break;
      }
    }
    return g;
  }

  function makeDrone() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mat('#3c4356'));
    body.scale.set(1.25, 0.7, 1);
    body.castShadow = true;
    g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat('#9fd8ff', { roughness: 0.25 }));
    dome.position.y = 0.16;
    g.add(dome);
    const rotors = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.07), cmat('#2e3442'));
      arm.position.set(s * 0.5, 0.1, 0);
      g.add(arm);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 10),
        new THREE.MeshBasicMaterial({ color: 0xdce4f0, transparent: true, opacity: 0.45 }));
      disc.position.set(s * 0.68, 0.16, 0);
      g.add(disc);
      rotors.push(disc);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
      mat('#ff5a4d', { emissive: '#ff2010', emissiveIntensity: 1.5 }));
    eye.position.set(0, -0.12, 0.3);
    g.add(eye);
    g.userData.rotors = rotors;
    return g;
  }

  /* ---------- character ---------- */
  function faceTex() {
    return spriteTex((x, s) => {
      const u = s / 128;
      x.clearRect(0, 0, s, s);
      // eyes
      for (const sx of [-1, 1]) {
        x.fillStyle = '#fff';
        x.beginPath(); x.ellipse(64 * u + sx * 26 * u, 52 * u, 17 * u, 21 * u, 0, 0, 7); x.fill();
        x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2 * u; x.stroke();
        x.fillStyle = '#26221f';
        x.beginPath(); x.arc(64 * u + sx * 23 * u, 56 * u, 8 * u, 0, 7); x.fill();
        x.fillStyle = '#fff';
        x.beginPath(); x.arc(64 * u + sx * 26 * u, 51 * u, 3 * u, 0, 7); x.fill();
      }
      // cheeks
      x.fillStyle = 'rgba(255,110,140,.4)';
      x.beginPath();
      x.ellipse(22 * u, 78 * u, 11 * u, 7 * u, 0, 0, 7);
      x.ellipse(106 * u, 78 * u, 11 * u, 7 * u, 0, 0, 7);
      x.fill();
      // smile
      x.strokeStyle = '#26221f'; x.lineWidth = 5 * u; x.lineCap = 'round';
      x.beginPath(); x.arc(64 * u, 76 * u, 18 * u, 0.3, Math.PI - 0.3); x.stroke();
    });
  }
  let FACE = null;

  const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x241a2e, side: THREE.BackSide });
  function makeChar(def) {
    const g = new THREE.Group();
    // cartoon outline: an inflated black backside shell around the body silhouette
    const outline = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), OUTLINE);
    outline.scale.set(1.07, 1.16, 0.92);
    outline.position.y = 0.95;
    g.add(outline);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), mat(def.body));
    body.scale.set(1, 1.08, 0.85);
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), mat(def.belly));
    belly.scale.set(1, 0.95, 0.5);
    belly.position.set(0, 0.82, 0.28);
    g.add(belly);
    FACE = FACE || faceTex();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85),
      new THREE.MeshBasicMaterial({ map: FACE, transparent: true }));
    face.position.set(0, 1.06, 0.47);
    g.add(face);

    // hat / accessory
    switch (def.hat) {
      case 'cap': {
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e8443a'));
        top.position.y = 1.46;
        g.add(top);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.35), mat('#e8443a'));
        brim.position.set(0, 1.47, 0.4);
        g.add(brim);
        break;
      }
      case 'ears':
        for (const s of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), mat(def.body));
          ear.position.set(s * 0.3, 1.6, 0);
          ear.rotation.z = -s * 0.3;
          g.add(ear);
        }
        break;
      case 'antenna': {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4), mat('#2a7db5'));
        rod.position.y = 1.65;
        g.add(rod);
        const bob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat('#ffe14d', { emissive: '#caa400', emissiveIntensity: 0.6 }));
        bob.position.y = 1.88;
        g.add(bob);
        break;
      }
      case 'bunny':
        for (const s of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mat(def.body));
          ear.scale.set(1, 3.2, 1);
          ear.position.set(s * 0.22, 1.75, 0);
          ear.rotation.z = -s * 0.15;
          g.add(ear);
        }
        break;
      case 'bolt': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.08), mat('#ffe14d', { emissive: '#caa400', emissiveIntensity: 0.6 }));
        b.position.y = 1.6;
        b.rotation.z = 0.4;
        g.add(b);
        break;
      }
      case 'horn': {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 10), mat('#ff6ec4', { emissive: '#aa3377', emissiveIntensity: 0.4 }));
        h.position.y = 1.66;
        g.add(h);
        break;
      }
    }

    // limbs: pivoted capsules with shoe / mitten tips
    const limbs = { hips: [], shoulders: [] };
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * 0.24, 0.55, 0);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), mat(def.body));
      leg.position.y = -0.22;
      leg.castShadow = true;
      hip.add(leg);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('#ffffff'));
      shoe.scale.set(1.1, 0.7, 1.6);
      shoe.position.set(0, -0.46, 0.06);
      hip.add(shoe);
      const sole = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8), mat('#e8443a'));
      sole.scale.set(1.12, 0.4, 1.62);
      sole.position.set(0, -0.52, 0.06);
      hip.add(sole);
      g.add(hip);
      limbs.hips.push(hip);

      const sh = new THREE.Group();
      sh.position.set(s * 0.52, 1.05, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 4, 8), mat(def.body));
      arm.position.y = -0.2;
      sh.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(def.belly));
      hand.position.y = -0.4;
      sh.add(hand);
      g.add(sh);
      limbs.shoulders.push(sh);
    }
    g.userData = { limbs, body, belly };
    return g;
  }

  function animateChar(g, o) {
    const { limbs, body } = g.userData;
    const squash = 1 - (o.slide || 0) * 0.45;
    g.scale.y = squash;
    g.rotation.z = (o.lean || 0) * 0.25;
    g.rotation.x = (o.jump || 0) * -0.12;
    for (let i = 0; i < 2; i++) {
      const ph = o.run ? Math.sin(o.phase * 14 + (i ? 0 : Math.PI)) : 0;
      const hip = limbs.hips[i], sh = limbs.shoulders[i];
      if (o.jump > 0.3) {
        hip.rotation.x = -1.3;
        sh.rotation.z = (i ? 1 : -1) * 2.5;
        sh.rotation.x = 0;
      } else {
        hip.rotation.x = ph * 0.95;
        sh.rotation.x = -ph * 0.8;
        sh.rotation.z = (i ? 1 : -1) * 0.25;
      }
      hip.visible = sh.visible = (o.slide || 0) < 0.5;
    }
    body.scale.x = 1 + (o.slide || 0) * 0.25;
  }

  /* ---------- scene setup ---------- */
  let charMesh = null, charId = null;

  function init(canvas) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) { return false; }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(SKY.getHex(), 21, 44);
    camera = new THREE.PerspectiveCamera(58, 1, 0.1, 90);

    scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x668855, 0.45));
    const sun = new THREE.DirectionalLight(0xffeec8, 1.2);
    sun.position.set(6, 12, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -30;
    scene.add(sun);

    const grassMap = noiseTex(236, 205, 420);
    grassMap.repeat.set(70, 46);
    ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), mat('#5fbe54', { map: grassMap }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -60;
    ground.receiveShadow = true;
    scene.add(ground);

    const gravelMap = noiseTex(228, 188, 520);
    gravelMap.repeat.set(5, 46);
    trackBed = new THREE.Mesh(new THREE.BoxGeometry(LANE * 3 + 1.6, 0.12, 70), mat('#a08d7c', { map: gravelMap }));
    trackBed.position.set(0, 0.01, -28);
    trackBed.receiveShadow = true;
    scene.add(trackBed);

    // rails
    for (const lane of [-1, 0, 1]) {
      for (const off of [-0.42, 0.42]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 70),
          mat('#e8eef6', { metalness: 0.8, roughness: 0.3 }));
        rail.position.set(lane * LANE + off, 0.12, -28);
        scene.add(rail);
        railMats.push(rail);
      }
    }
    // sleepers (recycled, scrolled by distance)
    for (let i = 0; i < 46; i++) {
      const sl = new THREE.Mesh(new THREE.BoxGeometry(LANE * 3 + 1.2, 0.07, 0.28), mat('#9b7a52'));
      sl.position.y = 0.09;
      sl.receiveShadow = true;
      scene.add(sl);
      sleepers.push(sl);
    }
    // fence posts
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? 1 : -1;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), cmat('#faf6eb'));
      post.position.set(side * (LANE * 1.78), 0.32, 0);
      scene.add(post);
      posts.push(post);
    }
    for (const side of [-1, 1]) {
      const railF = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 70), cmat('#faf6eb'));
      railF.position.set(side * (LANE * 1.78), 0.5, -28);
      scene.add(railF);
    }

    shieldBall = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 14),
      new THREE.MeshBasicMaterial({ color: 0x6ef0a0, transparent: true, opacity: 0.2 }));
    shieldBall.visible = false;
    scene.add(shieldBall);

    board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.5),
      mat('#54d8ff', { emissive: '#1f8fe0', emissiveIntensity: 0.8 }));
    board.visible = false;
    scene.add(board);

    blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.135;
    scene.add(blob);

    /* ----- sky: live gradient + sun + 3D clouds ----- */
    skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2; skyCanvas.height = 256;
    skyCtx = skyCanvas.getContext('2d');
    skyTexture = new THREE.CanvasTexture(skyCanvas);
    scene.background = skyTexture;

    sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: spriteTex((x, s) => {
        const g = x.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(255,246,200,1)');
        g.addColorStop(0.25, 'rgba(255,240,170,.85)');
        g.addColorStop(1, 'rgba(255,240,170,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, s, s);
      }),
      transparent: true, depthWrite: false,
    }));
    sunSprite.scale.set(16, 16, 1);
    sunSprite.position.set(18, 15, -55);
    scene.add(sunSprite);

    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
    for (let i = 0; i < 7; i++) {
      const cg = new THREE.Group();
      for (let b = 0; b < 3; b++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.1 - b * 0.25, 10, 8), cloudMat);
        puff.scale.y = 0.55;
        puff.position.set((b - 1) * 1.1, b % 2 ? 0.3 : 0, 0);
        cg.add(puff);
      }
      cg.position.set((hash01(i * 7) - 0.5) * 60, 9 + hash01(i * 3) * 7, -20 - hash01(i * 5) * 35);
      cg.scale.setScalar(1 + hash01(i * 11) * 1.6);
      cg.userData.spd = 0.25 + hash01(i * 13) * 0.5;
      scene.add(cg);
      clouds.push(cg);
    }

    /* ----- distant mountain backdrop ----- */
    const mountainTex = spriteTex((x, s) => {
      x.clearRect(0, 0, s, s);
      for (const [col, hgt, n, yo] of [['rgba(116,140,196,1)', 0.5, 5, 0], ['rgba(86,108,168,1)', 0.34, 7, 0.05]]) {
        x.fillStyle = col;
        x.beginPath();
        x.moveTo(0, s);
        for (let i = 0; i <= n; i++) {
          x.lineTo((i / n) * s, s - s * hgt * (0.5 + 0.5 * Math.abs(Math.sin(i * 2.7 + n))) - s * yo);
          x.lineTo(((i + 0.5) / n) * s, s);
        }
        x.closePath(); x.fill();
      }
    }, 512);
    const mountains = new THREE.Mesh(new THREE.PlaneGeometry(220, 13),
      new THREE.MeshBasicMaterial({ map: mountainTex, transparent: true, fog: false, depthWrite: false, opacity: 0.55 }));
    mountains.position.set(0, 5.2, -59);
    scene.add(mountains);

    /* ----- continuous trackside scenery rows, swapping with the world theme ----- */
    const AMBIENT_THEMES = [
      ['tree', 'house', 'tree', 'tree', 'rock'],
      ['cactus', 'rock', 'cactus', 'cactus', 'rock'],
      ['pine', 'snowman', 'pine', 'pine', 'rock'],
      ['lolly', 'cane', 'lolly', 'cane', 'lolly'],
      ['lavarock', 'geyser', 'lavarock', 'lavarock', 'geyser'],
    ];
    R3D_THEME_COUNT = AMBIENT_THEMES.length;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 16; i++) { // near row: one variant per theme, toggled live
        const slot = new THREE.Group();
        for (let t = 0; t < AMBIENT_THEMES.length; t++) {
          const kinds = AMBIENT_THEMES[t];
          const kind = kinds[Math.floor(hash01(i * 17 + side * 3 + t * 101) * kinds.length)];
          const v = makeDecor(kind);
          v.visible = t === 0;
          slot.add(v);
        }
        slot.scale.setScalar(0.9 + hash01(i * 23 + side) * 0.7);
        slot.userData.amb = { side, i, spacing: 4.2, x: side * (4.9 + hash01(i * 31 + side) * 2.6) };
        slot.userData.themed = true;
        scene.add(slot);
        ambient.push(slot);
      }
      for (let i = 0; i < 12; i++) { // far row: big background greens
        const kind = ['tree', 'tree', 'pine', 'house'][Math.floor(hash01(i * 41 + side * 7) * 4)];
        const m = makeDecor(kind);
        m.scale.setScalar(1.6 + hash01(i * 43 + side) * 1.1);
        m.userData.amb = { side, i, spacing: 5.6, x: side * (11 + hash01(i * 47 + side) * 5) };
        scene.add(m);
        ambient.push(m);
      }
    }

    /* ----- telegraph poles: near-field speed cue ----- */
    for (const side of [-1, 1]) {
      for (let i = 0; i < 11; i++) {
        const pg = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6), cmat('#6b4a2c'));
        post.position.y = 1.3;
        post.castShadow = true;
        pg.add(post);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.07), cmat('#6b4a2c'));
        bar.position.y = 2.35;
        pg.add(bar);
        pg.userData.amb = { side, i, spacing: 6.2, x: side * 4.4 };
        scene.add(pg);
        poles.push(pg);
      }
    }

    /* ----- overhead gantries to rush beneath ----- */
    for (let i = 0; i < 4; i++) {
      const gg = new THREE.Group();
      const gm = cmat('#46557a');
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.6, 0.22), gm);
        leg.position.set(s * 4.1, 1.8, 0);
        gg.add(leg);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 0.5), gm);
      beam.position.y = 3.6;
      gg.add(beam);
      const signC = document.createElement('canvas');
      signC.width = 512; signC.height = 128;
      const sx = signC.getContext('2d');
      sx.fillStyle = '#ffd23e';
      sx.beginPath(); sx.roundRect(4, 12, 504, 104, 22); sx.fill();
      sx.strokeStyle = '#8a6200'; sx.lineWidth = 8; sx.stroke();
      sx.fillStyle = '#5b3a00';
      sx.textAlign = 'center'; sx.textBaseline = 'middle';
      // auto-fit: shrink the font until the label sits inside the sign with padding
      let fsz = 56;
      do {
        sx.font = `800 ${fsz}px "Baloo 2","Comic Sans MS",sans-serif`;
        if (sx.measureText('RASCAL EXPRESS').width <= 460) break;
        fsz -= 2;
      } while (fsz > 18);
      sx.fillText('RASCAL EXPRESS', 256, 66);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signC), transparent: true }));
      sign.position.set(0, 3.7, 0.32);
      gg.add(sign);
      gg.userData.amb = { side: 0, i, spacing: 19, x: 0 };
      scene.add(gg);
      gantries.push(gg);
    }

    return true;
  }

  function ensureChar(def) {
    if (charId !== def.id) {
      if (charMesh) scene.remove(charMesh);
      charMesh = makeChar(def);
      charMesh.scale.setScalar(0.92);
      scene.add(charMesh);
      charId = def.id;
    }
    if (!guard) {
      guard = makeChar({ id: 'guard', body: '#6f7891', belly: '#b9c2d2', hat: 'cap' });
      guard.scale.setScalar(0.72);
      scene.add(guard);
    }
  }

  function resize(w, h, dpr) {
    W = w; H = h;
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(2, dpr || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const _v = new THREE.Vector3();
  function toScreen(laneF, z, hgt) {
    _v.set(laneF * LANE, 0.9 + (hgt || 0), -z * K);
    _v.project(camera);
    return {
      x: (_v.x + 1) / 2 * W,
      y: (1 - _v.y) / 2 * H,
      p: Math.max(0.06, Math.min(1.25, 150 / (z + 150))),
    };
  }

  /* ---------- per-frame sync ---------- */
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  let perfN = 0, perfAcc = 0, perfLast = 0, perfDecided = false;

  function render(o) {
    const G = o.G;
    ensureChar(o.charDef);

    // adaptive quality: weak devices automatically lose shadows + resolution
    const nowT = performance.now();
    if (perfLast && !perfDecided) {
      perfAcc += nowT - perfLast;
      if (++perfN >= 90) {
        perfDecided = true;
        if (perfAcc / perfN > 26) {
          renderer.shadowMap.enabled = false;
          renderer.setPixelRatio(1);
        }
      }
    }
    perfLast = nowT;

    // sky / fog / ground colours follow the theme + day cycle
    // (saturation-boosted to compensate for filmic tone mapping)
    _c1.setStyle(o.skyTop).offsetHSL(0, 0.14, 0.01);
    _c2.setStyle(o.skyBot).offsetHSL(0, 0.14, 0.01);
    const sg = skyCtx.createLinearGradient(0, 0, 0, 256);
    sg.addColorStop(0, _c1.getStyle());
    sg.addColorStop(0.75, _c2.getStyle());
    sg.addColorStop(1, _c2.getStyle());
    skyCtx.fillStyle = sg;
    skyCtx.fillRect(0, 0, 2, 256);
    skyTexture.needsUpdate = true;
    scene.fog.color.copy(_c2);
    _c2.setStyle(o.ground).offsetHSL(0, 0.1, 0);
    ground.material.color.copy(_c2);

    // camera chase + roll + shake + crash zoom
    const sway = G.laneF * LANE * 0.5;
    let cz = 6.4, cy = 3.25;
    if (G.state === 'dying') {
      const t = 1 - Math.max(0, G.dieT) / 0.9;
      cz = 6.4 - t * 2.4; cy = 3.25 - t * 1.0;
    }
    camera.position.set(
      sway + (G.shake > 0 ? (Math.random() - 0.5) * G.shake * 0.045 : 0),
      cy + (G.shake > 0 ? (Math.random() - 0.5) * G.shake * 0.035 : 0),
      cz
    );
    camera.lookAt(sway * 0.85, 1.7, -10);
    camera.rotation.z += G.roll * 1.4;
    // FOV widens with speed (and fever) — the rush you can feel
    const targetFov = 57 + Math.max(0, Math.min(1, (G.speed - 300) / 460)) * 9 + (G.fever > 0 ? 3 : 0);
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * 0.08;
      camera.updateProjectionMatrix();
    }

    // scroll sleepers + fence posts with distance
    const zoff = (G.dist * 10 * K) % 1.42;
    for (let i = 0; i < sleepers.length; i++) sleepers[i].position.z = -(i * 1.42) + zoff + 1.5;
    const poff = (G.dist * 10 * K) % 2.6;
    for (let i = 0; i < posts.length; i++) posts[i].position.z = -(Math.floor(i / 2) * 2.6) + poff + 1.5;

    // scroll the ambient world: scenery rows, poles, gantries
    const dz = G.dist * 10 * K;
    const themeNow = G.themeIdx % R3D_THEME_COUNT;
    const scroll = (m) => {
      const a = m.userData.amb;
      m.position.x = a.x;
      m.position.z = -(a.i * a.spacing) + (dz % a.spacing) + 2;
      if (m.userData.themed) {
        for (let t = 0; t < R3D_THEME_COUNT; t++) m.children[t].visible = t === themeNow;
      }
    };
    for (const m of ambient) scroll(m);
    for (const m of poles) scroll(m);
    for (const m of gantries) scroll(m);
    // clouds drift gently
    for (const c of clouds) {
      c.position.x += Math.sin(G.phase * 0.1) * 0; // anchored
      c.position.z += c.userData.spd * 0.016;
      if (c.position.z > 8) c.position.z = -55;
    }

    // ----- entities -----
    for (const ob of G.obstacles) {
      const zz = -ob.z * K;
      if (ob.kind === 'train') {
        const m = take('train', makeTrain);
        const len = ob.len * K;
        m.position.set(ob.lane * LANE, 0, zz - len / 2);
        m.userData.body.scale.z = len;
        m.userData.shell.scale.z = len * 1.02;
        m.userData.roof.scale.z = 0.35 * len;
        m.userData.body.material = cmat(TRAIN_COLS[ob.hue]);
        m.userData.roof.material = cmat(TRAIN_COLS[ob.hue]);
        // children that hug the front need to sit at +len/2
        for (const ch of m.children) {
          if (ch !== m.userData.body && ch !== m.userData.roof && !(ch.geometry && ch.geometry.type === 'PlaneGeometry' && ch.rotation.y !== 0)) {
            if (ch.position.z > 0.4) ch.position.z = len / 2 + 0.01;
          }
        }
      } else if (ob.kind === 'drone') {
        const m = take('drone', makeDrone);
        m.position.set(ob.lane * LANE, 1.05 + Math.sin(G.phase * 5 + ob.ph) * 0.1, zz);
        for (const ds of m.userData.rotors) ds.rotation.y = G.phase * 30;
      } else if (ob.kind === 'hurdle') {
        take('hurdle', makeHurdle).position.set(ob.lane * LANE, 0, zz);
      } else if (ob.kind === 'bar') {
        take('bar', makeBar).position.set(ob.lane * LANE, 0, zz);
      } else if (ob.kind === 'ramp') {
        take('ramp', makeRamp).position.set(ob.lane * LANE, 0, zz);
      }
    }
    for (const c of G.coins) {
      const m = take('coin', makeCoin);
      m.position.set(c.laneF * LANE, 0.55 + (c.h || 0) * 1.55 + Math.sin(c.spin * 1.3) * 0.08, -c.z * K);
      m.rotation.y = c.spin;
    }
    for (const p of G.pickups) {
      const icon = p.icon || (p.kind === 'box' ? '🎁' : { magnet: '🧲', mult: '⭐', boost: '🚀', shield: '🛡️' }[p.kind]);
      const m = take('pu' + icon, () => makeSprite(emojiSprite(icon), 1.0));
      m.position.set(p.laneF * LANE, 1.1 + Math.sin(p.spin) * 0.15, -p.z * K);
    }
    // pet buddy hovering at your shoulder
    if (o.petIcon && G.state === 'playing') {
      const m = take('pet' + o.petIcon, () => makeSprite(emojiSprite(o.petIcon), 0.8));
      m.position.set(G.laneF * LANE + 1.05, 1.45 + Math.sin(G.phase * 4) * 0.12, 0.4);
    }
    for (const l of G.letters) {
      const m = take('letter' + l.idx, () => makeSprite(letterTex(o.huntWord[l.idx]), 0.9));
      m.position.set(l.laneF * LANE, 1.2 + Math.sin(l.spin * 1.5) * 0.15, -l.z * K);
    }
    for (const d of G.decor) {
      const m = take('decor' + d.kind, () => makeDecor(d.kind));
      m.position.set(d.laneF * LANE, 0, -d.z * K);
    }
    finishPools();

    // ----- player -----
    const jumpH = G.jumpT >= 0 ? Math.sin((G.jumpT / G.jumpDur) * Math.PI) : 0;
    const boardLift = G.boardT > 0 ? 0.22 + Math.sin(G.phase * 6) * 0.06 : 0;
    const py = jumpH * 1.55 * G.jumpPow + boardLift;
    charMesh.position.set(G.laneF * LANE, py, 0);
    charMesh.visible = !(G.invinc > 0 && Math.floor(G.invinc * 10) % 2 === 0 && G.state === 'playing');
    animateChar(charMesh, {
      run: G.state === 'playing',
      phase: G.phase,
      jump: jumpH,
      slide: G.slideT >= 0 ? Math.sin((G.slideT / 0.7) * Math.PI) : 0,
      lean: G.laneTarget - G.laneF,
    });

    blob.position.x = G.laneF * LANE;
    blob.scale.setScalar(Math.max(0.4, 1 - jumpH * 0.5));
    blob.material.opacity = 0.22 * (1 - jumpH * 0.55);

    board.visible = G.boardT > 0;
    if (board.visible) board.position.set(G.laneF * LANE, py - 0.02 + 0.05, 0);
    shieldBall.visible = G.pu.shield > 0;
    if (shieldBall.visible) {
      shieldBall.position.set(G.laneF * LANE, py + 0.95, 0);
      shieldBall.material.opacity = 0.16 + 0.07 * Math.sin(G.phase * 5);
    }

    // ----- guard -----
    const gd = G.guardD;
    guard.visible = (G.state === 'playing' || G.state === 'dying') && gd > 0.12;
    if (guard.visible) {
      // trails slightly off your line so you can always see him coming
      guard.position.set(G.guardLane * LANE + 0.6, 0, 1.9 + (1 - gd) * 2.6);
      animateChar(guard, {
        run: true,
        phase: G.phase * 0.95,
        jump: gd > 0.65 ? 0.5 : 0,
        lean: (G.laneF - G.guardLane) * 0.5,
      });
    }

    renderer.render(scene, camera);
  }

  return { ok: true, init, resize, render, toScreen };
})();
