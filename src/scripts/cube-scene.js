// The cube, after igloo.inc: a 3×3 puzzle cube of carved blue-grey stone blocks with frosted edges, sitting
// on the page itself. It's drawn on a see-through canvas that reaches a little past its stage, so it scrolls
// with the page like anything else, and when the blocks part they stay around the cube's own centre.
// When it first comes into view it builds itself: a glowing line sketch of each block appears, bottom layer
// first, then each block materialises out of the light and rises into place. Light lives inside the cube;
// it shows through the seams, and pours out when the blocks part as the cube scrolls away from the middle.
// Each side of the cube is one side of the work: its centre block carries the side's name, the others the
// things on that side. Layers really turn (scramble, then solve by replaying the moves backwards).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export async function start(root) {
  if (document.fonts) await document.fonts.ready; // the names are carved in Switzer
  const stage = root.querySelector('.cube__stage');
  const canvas = root.querySelector('.cube__canvas');
  const faces = JSON.parse(root.querySelector('#cube-data').textContent);
  const faceBy = Object.fromEntries(faces.map((f) => [f.key, f]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('no-3d'); // no WebGL: show the list instead
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // ---- stone grain: value noise that tiles ----
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (i) => ((i % p) + p) % p;
    const a = hash(w(xi), w(yi)), b = hash(w(xi + 1), w(yi)), c = hash(w(xi), w(yi + 1)), d = hash(w(xi + 1), w(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, p) => {
    let f = 0, amp = 0.5;
    for (let o = 0; o < 4; o++) { f += amp * noise(x, y, p); x *= 2; y *= 2; p *= 2; amp *= 0.5; }
    return f;
  };
  const stone = (() => {
    const S = 512, cells = 12, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = fbm((x / S) * cells, (y / S) * cells, cells) * 0.85 + Math.random() * 0.18;
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(120 + n * 135);
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  })();

  // ---- the world: a camera looking at the cube, and cold, soft light from the top left ----
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  world.add(new THREE.HemisphereLight(0xdde7f7, 0x343b4c, 1.3));
  const sun = new THREE.DirectionalLight(0xeef3ff, 2.0);
  sun.position.set(-6, 9, 8);
  world.add(sun);

  const cubeGroup = new THREE.Group();
  const HOME = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, -0.62, 0));
  cubeGroup.quaternion.copy(HOME);
  world.add(cubeGroup);

  // the light inside: a glow you see through the seams, and a lamp that lights the blocks' inner faces
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(225,240,255,0.9)');
    r.addColorStop(0.6, 'rgba(190,215,255,0.35)');
    r.addColorStop(1, 'rgba(190,215,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  cubeGroup.add(core);
  const lamp = new THREE.PointLight(0xdcecff, 0, 9, 1.6);
  cubeGroup.add(lamp);

  // faces of a box come in this order; which way each points; where a block sits on a side, seen from outside
  const KEYS = ['right', 'left', 'top', 'bottom', 'front', 'back'];
  const AXIS = { right: [0, 1], left: [0, -1], top: [1, 1], bottom: [1, -1], front: [2, 1], back: [2, -1] };
  const NORMAL = { right: [1, 0, 0], left: [-1, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0], front: [0, 0, 1], back: [0, 0, -1] };
  const SQUARE = {
    front: ([x, y]) => [1 - y, x + 1],
    back: ([x, y]) => [1 - y, 1 - x],
    right: ([, y, z]) => [1 - y, 1 - z],
    left: ([, y, z]) => [1 - y, z + 1],
    top: ([x, , z]) => [z + 1, x + 1],
    bottom: ([x, , z]) => [1 - z, x + 1],
  };

  // the frost: every block's edges catch the light, bright and a little blue, like the igloo's
  const STONE = '#9aa5ba';
  const rim = (g, S, width, alpha) => {
    for (const [x0, y0, x1, y1, x, y, w, h] of [[0, 0, 0, width, 0, 0, S, width], [0, S, 0, S - width, 0, S - width, S, width], [0, 0, width, 0, 0, 0, width, S], [S, 0, S - width, 0, S - width, 0, width, S]]) {
      const l = g.createLinearGradient(x0, y0, x1, y1);
      l.addColorStop(0, `rgba(236,243,255,${alpha})`);
      l.addColorStop(1, 'rgba(236,243,255,0)');
      g.fillStyle = l;
      g.fillRect(x, y, w, h);
    }
  };
  const frost = (() => { // the glow map: black, with the frosted rim
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 256, 256);
    rim(g, 256, 16, 0.9);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  // one carved face: blue-grey stone grain, frosted edges, and the words cut into it
  const wrapText = (g, text, width) => {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (g.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next;
    }
    lines.push(line);
    return lines.slice(0, 3);
  };
  const carve = (label, number, centre, flip) => {
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.drawImage(stone, Math.random() * (512 - S), Math.random() * (512 - S), S, S, 0, 0, S, S);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = STONE;
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
    rim(g, S, 22, 0.75);
    const cut = (text, x, y) => { // a carved letter: a frosty lip below, the dark cut above it
      g.fillStyle = 'rgba(230,238,252,0.45)';
      g.fillText(text, x + 1.5, y + 2);
      g.fillStyle = 'rgba(16,20,30,0.88)';
      g.fillText(text, x, y);
    };
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (centre) {
      g.font = `800 ${label.length > 6 ? 40 : 50}px Switzer, system-ui, sans-serif`;
      cut(label.toUpperCase(), S / 2, S / 2);
    } else if (label) {
      g.font = '700 32px Switzer, system-ui, sans-serif';
      const lines = wrapText(g, label, S * 0.78);
      lines.forEach((l, i) => cut(l, S / 2, S / 2 + (i - (lines.length - 1) / 2) * 36));
    }
    if (number) {
      g.textAlign = 'left';
      g.font = '500 17px ui-monospace, Menlo, Consolas, monospace';
      cut(number, 22, 30);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    if (flip) { t.center.set(0.5, 0.5); t.rotation = Math.PI; }
    return t;
  };

  const FROST = 0.45; // how brightly the frosted edges glow
  const innerTex = new THREE.CanvasTexture(stone);
  innerTex.colorSpace = THREE.SRGBColorSpace;
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xb9c6dc, map: innerTex, roughness: 0.92, emissive: 0xe8f1ff, emissiveIntensity: 0 });

  const geo = new RoundedBoxGeometry(0.955, 0.955, 0.955, 3, 0.07);
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.985, 0.985, 0.985));
  const cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;
    const pos = [x, y, z], own = [];
    const mats = KEYS.map((key) => {
      const [axis, sign] = AXIS[key];
      if (pos[axis] !== sign) return innerMat;
      const f = faceBy[key];
      const [row, col] = SQUARE[key](pos);
      const index = row * 3 + col, centre = index === 4;
      const slot = centre ? -1 : index < 4 ? index : index - 1;
      const item = centre ? null : f.items[slot];
      const label = centre ? f.name : item ? item.label || item.title : '';
      const number = item ? String(slot + 1).padStart(2, '0') : '';
      const tex = carve(label, number, centre, key === 'top');
      const m = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 2.2, roughness: 0.88, emissive: 0xdfeaff, emissiveMap: frost, emissiveIntensity: FROST });
      m.userData = { face: key, slot, centre, item: !!item };
      own.push(m);
      return m;
    });
    const mesh = new THREE.Mesh(geo, mats);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    const obj = new THREE.Group();
    obj.add(mesh, line);
    cubeGroup.add(obj);
    const r = () => (Math.random() - 0.5) * 0.35;
    cubies.push({ obj, mesh, line, own, pos, q: new THREE.Quaternion(), tilt: new THREE.Euler(r(), r(), r()), order: 0 });
  }
  const meshes = cubies.map((c) => c.mesh);
  // building order: bottom layer first, then up; in any order within a layer
  cubies.slice().sort((a, b) => a.pos[1] - b.pos[1] || Math.random() - 0.5).forEach((c, i) => { c.order = i; });

  // ---- placing the blocks: logical spot × spacing (wider while the cube is pulled apart), any layer mid-turn ----
  const GAP = 0.45; // at most, the blocks part by under half a block: it opens in place
  let gap = 0, gapV = 0, aim = 0, turning = null;
  const tilted = new THREE.Quaternion(), turnQ = new THREE.Quaternion(), tiltE = new THREE.Euler();
  const place = () => {
    const t = Math.max(0, gap) / GAP;
    for (const c of cubies) {
      c.obj.position.set(...c.pos);
      tilted.copy(c.q);
      if (turning && turning.group.has(c)) {
        c.obj.position.applyAxisAngle(turning.axis, turning.angle);
        tilted.premultiply(turnQ.setFromAxisAngle(turning.axis, turning.angle));
      }
      c.obj.position.multiplyScalar(1 + gap);
      tiltE.set(c.tilt.x * t, c.tilt.y * t, c.tilt.z * t);
      c.obj.quaternion.copy(tilted).multiply(turnQ.setFromEuler(tiltE));
    }
  };

  // ---- turning one layer, then baking the turn into each block ----
  const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const turn = (move, ms) => new Promise((done) => {
    const [axis, layer, dir] = move, i = 'xyz'.indexOf(axis);
    turning = { axis: AXES[axis], dir, angle: 0, t0: performance.now(), ms, done, group: new Set(cubies.filter((c) => c.pos[i] === layer)) };
    if (!ms) finishTurn();
    wake();
  });
  const finishTurn = () => {
    const T = turning, quarter = new THREE.Quaternion().setFromAxisAngle(T.axis, T.dir * Math.PI / 2), v = new THREE.Vector3();
    for (const c of T.group) {
      v.set(...c.pos).applyAxisAngle(T.axis, T.dir * Math.PI / 2);
      c.pos = [Math.round(v.x), Math.round(v.y), Math.round(v.z)];
      c.q.premultiply(quarter).normalize();
    }
    turning = null;
    T.done();
  };

  // ---- scramble and solve: solving replays the scramble backwards ----
  const scrambleBtn = root.querySelector('[data-act="scramble"]');
  const solveBtn = root.querySelector('[data-act="solve"]');
  let history = [], busy = true; // busy until the cube has built itself
  const controls = () => { scrambleBtn.disabled = busy; solveBtn.disabled = busy || !history.length; };
  const run = async (moves, ms) => {
    busy = true; controls();
    for (const m of moves) await turn(m, reduced ? 0 : ms);
    busy = false; controls();
  };
  const randomMove = (last) => {
    for (;;) {
      const m = ['xyz'[Math.floor(Math.random() * 3)], Math.random() < 0.5 ? -1 : 1, Math.random() < 0.5 ? -1 : 1];
      if (!last || last[0] !== m[0] || last[1] !== m[1]) return m;
    }
  };
  scrambleBtn.addEventListener('click', () => {
    if (busy) return;
    const moves = [];
    for (let i = 0; i < 16; i++) moves.push(randomMove(moves.at(-1) || history.at(-1)));
    history.push(...moves);
    run(moves, 300);
  });
  solveBtn.addEventListener('click', async () => {
    if (busy || !history.length) return;
    const back = history.slice().reverse().map(([a, l, d]) => [a, l, -d]);
    history = [];
    await run(back, 260);
    say('Solved', 'Back in order', 'Every side of my work, sorted again. Tap a block to read about it.');
  });

  // ---- the card ----
  const card = {
    kind: root.querySelector('.cube__kind'), title: root.querySelector('.cube__title'), text: root.querySelector('.cube__text'),
    items: root.querySelector('.cube__items'), link: root.querySelector('.cube__link'),
  };
  const say = (kind, title, text, href = null, list = null) => {
    card.kind.textContent = kind;
    card.title.textContent = title;
    card.text.textContent = text;
    card.link.hidden = !href;
    if (href) card.link.href = href;
    card.items.hidden = !list;
    card.items.replaceChildren();
    if (list) for (const it of list) {
      const li = document.createElement('li');
      const a = document.createElement(it.href ? 'a' : 'span');
      if (it.href) { a.href = it.href; a.className = 'link'; }
      a.textContent = it.title;
      li.append(a);
      card.items.append(li);
    }
  };
  // a side button turns that side to face you
  let aimQ = null;
  const showFace = (key) => {
    const f = faceBy[key];
    say(`// ${f.name}`, f.name, f.text, null, f.items);
    const toCamera = camera.position.clone().sub(cubeGroup.position).normalize();
    aimQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...NORMAL[key]), toCamera)
      .premultiply(new THREE.Quaternion().setFromAxisAngle(AXES.y, -0.32));
    wake();
  };
  const showItem = (key, slot) => {
    const f = faceBy[key], it = f.items[slot];
    say(`// ${f.name} ${String(slot + 1).padStart(2, '0')}  ${it.kind || ''}`, it.title, it.text, it.href || null);
  };
  root.querySelectorAll('.cube__side').forEach((b) => b.addEventListener('click', () => showFace(b.dataset.face)));

  // ---- pointing, dragging and tapping (on the stage; the canvas itself takes no clicks) ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    const m = hit.object.material[hit.face.materialIndex];
    return m.userData.face ? m : null;
  };
  let from = null, moved = 0, hovered = null;
  const spin = new THREE.Quaternion();
  stage.addEventListener('pointerdown', (e) => { from = [e.clientX, e.clientY]; moved = 0; });
  addEventListener('pointermove', (e) => {
    if (from) {
      const dx = e.clientX - from[0], dy = e.clientY - from[1];
      moved += Math.abs(dx) + Math.abs(dy);
      from = [e.clientX, e.clientY];
      aimQ = null;
      cubeGroup.quaternion.premultiply(spin.setFromAxisAngle(AXES.y, dx * 0.009)).premultiply(spin.setFromAxisAngle(AXES.x, dy * 0.009));
      wake();
      return;
    }
    if (e.pointerType !== 'mouse' || e.target !== stage || !built) return;
    const m = pick(e);
    if (m !== hovered) {
      hovered = m;
      stage.classList.toggle('is-pointing', !!(m && (m.userData.item || m.userData.centre)));
      wake();
    }
  });
  stage.addEventListener('pointerleave', () => { if (hovered) { hovered = null; stage.classList.remove('is-pointing'); wake(); } });
  addEventListener('pointerup', (e) => {
    if (from && moved < 6 && built) {
      const m = pick(e);
      if (m && m.userData.item) showItem(m.userData.face, m.userData.slot);
      else if (m && m.userData.centre) showFace(m.userData.face);
    }
    from = null;
  });
  addEventListener('pointercancel', () => { from = null; });

  // ---- building itself: a line sketch of each block, then the block, bottom layer first ----
  let built = reduced, buildT0 = null;
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
  const SKETCH = 45, SOLID = 1100, STEP = 70;
  const building = (now) => {
    const t = now - buildT0;
    for (const c of cubies) {
      const k = c.order;
      const sketch = Math.max(0, Math.min(1, (t - k * SKETCH) / 380));
      const solid = Math.max(0, Math.min(1, (t - SOLID - k * STEP) / 700));
      const gone = Math.max(0, Math.min(1, (t - SOLID - k * STEP - 350) / 600));
      c.line.material.opacity = sketch * 0.9 * (1 - gone);
      c.line.scale.setScalar(1 + (1 - easeOut(sketch)) * 0.25);
      c.mesh.visible = solid > 0;
      c.mesh.scale.setScalar(Math.max(0.001, easeBack(solid)));
      c.mesh.position.y = -(1 - easeOut(solid)) * 0.6; // rising into place
      for (const m of c.own) m.emissiveIntensity = FROST + (1 - solid) * 1.1; // out of the light
    }
    if (t > SOLID + cubies.length * STEP + 1000) finishBuild();
  };
  const finishBuild = () => {
    built = true;
    for (const c of cubies) {
      c.line.material.opacity = 0;
      c.mesh.visible = true;
      c.mesh.scale.setScalar(1);
      c.mesh.position.y = 0;
      for (const m of c.own) m.emissiveIntensity = FROST;
    }
    busy = false;
    controls();
    say('How it works', 'Pick a block', 'Each side of the cube is one side of my work. Tap a block to read about it, or pick a side below to turn it to you.');
  };
  if (reduced) finishBuild();
  else for (const c of cubies) c.mesh.visible = false;

  // ---- it parts as the stage scrolls away from the middle of the screen, and comes together at the middle ----
  const measure = () => {
    const r = stage.getBoundingClientRect();
    const d = Math.min(1, Math.abs(r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2));
    const apart = Math.max(0, Math.min(1, (d - 0.2) / 0.6));
    aim = reduced || !built ? 0 : GAP * apart * apart * (3 - 2 * apart);
    if (buildT0 === null && !built && d < 0.6) buildT0 = performance.now();
  };

  // ---- size: the cube sits in the middle of its canvas, sized to the stage ----
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0, 16);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const unitPx = (2 * 16 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h; // world units per pixel
    const size = Math.min(stage.clientHeight * 0.6, stage.clientWidth * 0.78) * unitPx; // the cube's width
    cubeGroup.scale.setScalar(size / 3);
    wake();
  };
  new ResizeObserver(resize).observe(canvas);

  // ---- the frame loop, only while the cube's section is near the screen ----
  let raf = 0, near = true, last = performance.now();
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    measure();
    if (buildT0 !== null && !built) building(now);
    if (turning) {
      const k = Math.min(1, (now - turning.t0) / turning.ms);
      turning.angle = turning.dir * (Math.PI / 2) * (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
      if (k >= 1) { turning.angle = turning.dir * Math.PI / 2; place(); finishTurn(); }
    }
    if (!turning) { // the pull back together: a spring, so it lands with a little give
      gapV += (90 * (aim - gap) - 13 * gapV) * dt;
      gap += gapV * dt;
    }
    place();
    if (aimQ) {
      cubeGroup.quaternion.slerp(aimQ, 0.09);
      if (cubeGroup.quaternion.angleTo(aimQ) < 0.002) aimQ = null;
    }
    // the light inside: always a little through the seams, flooding out as the blocks part
    const open = Math.max(0, Math.min(1, gap / GAP));
    core.material.opacity = 0.85 + open * 0.15;
    core.scale.setScalar(3.1 + open * 1.6);
    lamp.intensity = (4 + open * 30) * cubeGroup.scale.x ** 2;
    lamp.distance = 9 * cubeGroup.scale.x;
    innerMat.emissiveIntensity = 0.1 + open * 0.5;
    if (built) for (const c of cubies) for (const m of c.own) m.emissiveIntensity = m === hovered ? FROST + 0.18 : FROST;
    renderer.render(world, camera);
    const moving = !built || turning || aimQ || Math.abs(aim - gap) > 1e-3 || Math.abs(gapV) > 1e-3;
    if (near && !document.hidden && (!reduced || moving)) raf = requestAnimationFrame(frame);
  };
  function wake() { if (!raf && near && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  // run while the section is within a screen of view; otherwise stop and clear the canvas
  new IntersectionObserver(([e]) => {
    near = e.isIntersecting;
    canvas.style.visibility = near ? 'visible' : 'hidden';
    if (near) wake();
  }, { rootMargin: '100% 0px' }).observe(root);
  document.addEventListener('visibilitychange', wake);
  addEventListener('scroll', wake, { passive: true });

  controls();
  root.classList.add('is-live');
  resize();
}
