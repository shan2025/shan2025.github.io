// The cube: a 3×3 puzzle cube of packed-snow blocks, lit from inside like an igloo, in a
// light snowfall, sitting on the page itself. It's drawn on a see-through canvas that reaches a little past its stage, so it scrolls
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
  renderer.shadowMap.enabled = true; // the blocks shade one another, most of all when they part
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // ---- snow: value noise that tiles ----
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
  // packed snow, as a height field: soft lumps, a coarse grain, fine sparkle and small dents.
  // One big tile; each face of a block takes its own window of it, turned, so no two faces match.
  const SNOW = 512;
  const field = (() => {
    const h = new Float32Array(SNOW * SNOW);
    for (let y = 0; y < SNOW; y++) for (let x = 0; x < SNOW; x++) {
      const u = x / SNOW, v = y / SNOW;
      h[y * SNOW + x] = fbm(u * 4, v * 4, 4) * 0.55 + fbm(u * 20, v * 20, 20) * 0.3 + Math.random() * 0.12;
    }
    for (let k = 0; k < 500; k++) { // dents pressed into the crust
      const cx = Math.floor(Math.random() * SNOW), cy = Math.floor(Math.random() * SNOW);
      const r = 1.5 + Math.random() ** 2 * 6, depth = 0.08 + Math.random() * 0.17, R = Math.ceil(r);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d < 1) h[((cy + dy + SNOW) % SNOW) * SNOW + ((cx + dx + SNOW) % SNOW)] -= depth * (1 - d * d);
      }
    }
    return h;
  })();
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const paint = (fn) => {
    const c = document.createElement('canvas');
    c.width = c.height = SNOW;
    const g = c.getContext('2d'), img = g.createImageData(SNOW, SNOW);
    for (let i = 0; i < field.length; i++) {
      const [r, gr, b] = fn(field[i]);
      img.data[i * 4] = r; img.data[i * 4 + 1] = gr; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };
  const snowHeight = paint((h) => { const v = clamp(h * 255); return [v, v, v]; }); // for the bump map: high is light
  const snowColour = paint((h) => { const v = 206 + (h - 0.5) * 34; return [clamp(v), clamp(v + 1), clamp(v + 3)]; }); // greyer in the hollows
  // light from inside shows at the rims of each block, as it does through real packed snow
  const rimTex = (() => {
    const S = 128, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const e = Math.max(Math.abs(x / (S - 1) - 0.5), Math.abs(y / (S - 1) - 0.5)) * 2;
      const v = clamp(Math.max(0, (e - 0.8) / 0.2) ** 2 * 255), i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  // ---- the world: a camera looking at the cube, and soft daylight from high on the left ----
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  world.add(new THREE.HemisphereLight(0xffffff, 0x3a3c42, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(-5, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
  sun.shadow.normalBias = 0.03;
  world.add(sun);

  const cubeGroup = new THREE.Group();
  const HOME = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, -0.62, 0));
  cubeGroup.quaternion.copy(HOME);
  world.add(cubeGroup);

  // a light snowfall around the cube (in cube-sized units; resize scales it with the cube)
  const flakes = (() => {
    const n = innerWidth < 700 ? 160 : 320, p = new Float32Array(n * 3), speed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 9; p[i * 3 + 1] = (Math.random() - 0.5) * 7; p[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speed[i] = 0.25 + Math.random() * 0.5;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const dot = document.createElement('canvas');
    dot.width = dot.height = 32;
    const d = dot.getContext('2d'), r = d.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    d.fillStyle = r;
    d.fillRect(0, 0, 32, 32);
    const pts = new THREE.Points(geom, new THREE.PointsMaterial({ size: 0.06, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, opacity: 0.8 }));
    pts.userData.speed = speed;
    return pts;
  })();
  world.add(flakes);

  // the light inside: a glow you see through the seams, and a lamp that lights the blocks' inner faces
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.9)');
    r.addColorStop(0.6, 'rgba(245,247,250,0.4)');
    r.addColorStop(1, 'rgba(245,247,250,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  cubeGroup.add(core);
  const lamp = new THREE.PointLight(0xffffff, 0, 9, 1.6);
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
  // one face of a block: its own window of the snow, and the words pressed into it
  const carve = (label, number, centre, flip) => {
    const S = 256, sx = Math.random() * (SNOW - S), sy = Math.random() * (SNOW - S);
    const spin = Math.floor(Math.random() * 4) * Math.PI / 2, mirror = Math.random() < 0.5 ? -1 : 1;
    const layer = (src) => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      g.translate(S / 2, S / 2);
      g.rotate(spin);
      g.scale(mirror, 1);
      g.drawImage(src, sx, sy, S, S, -S / 2, -S / 2, S, S);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      return [c, g];
    };
    const [colour, gc] = layer(snowColour), [height, gh] = layer(snowHeight);
    gh.filter = 'blur(1.2px)'; // soft-edged, as if pressed in
    const cut = (text, x, y) => {
      gc.fillStyle = 'rgba(255,255,255,0.55)'; // the lip catches the light
      gc.fillText(text, x + 1.2, y + 1.6);
      gc.fillStyle = 'rgba(45,47,52,0.85)'; // shadow down in the cut
      gc.fillText(text, x, y);
      gh.fillStyle = 'rgba(0,0,0,0.8)';
      gh.fillText(text, x, y);
    };
    const font = (f) => { gc.font = gh.font = f; };
    if (centre) {
      font(`800 ${label.length > 6 ? 40 : 50}px Switzer, system-ui, sans-serif`);
      cut(label.toUpperCase(), S / 2, S / 2);
    } else if (label) {
      font('700 32px Switzer, system-ui, sans-serif');
      const lines = wrapText(gc, label, S * 0.78);
      lines.forEach((l, i) => cut(l, S / 2, S / 2 + (i - (lines.length - 1) / 2) * 36));
    }
    if (number) {
      gc.textAlign = gh.textAlign = 'left';
      font('500 17px ui-monospace, Menlo, Consolas, monospace');
      cut(number, 22, 30);
    }
    const tex = (c, srgb) => {
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      if (flip) { t.center.set(0.5, 0.5); t.rotation = Math.PI; }
      return t;
    };
    return { map: tex(colour, true), bump: tex(height, false) };
  };

  const FROST = 0.2; // the light inside, glowing faintly at the rims
  const innerTex = new THREE.CanvasTexture(snowColour);
  innerTex.colorSpace = THREE.SRGBColorSpace;
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: innerTex, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0 });

  // soft, rounded blocks, each pressed a little out of true so no two are alike
  const baseGeo = new RoundedBoxGeometry(0.955, 0.955, 0.955, 6, 0.17);
  const lumpy = () => {
    const g = baseGeo.clone(), p = g.attributes.position, v = new THREE.Vector3(), out = new THREE.Vector3();
    const a = Array.from({ length: 6 }, () => Math.random() * 10);
    const s = [0, 1, 2].map(() => 0.975 + Math.random() * 0.025);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const bump = Math.sin(v.x * 5 + a[0]) * Math.sin(v.y * 4 + a[1]) * Math.sin(v.z * 5 + a[2]) * 0.014
        + Math.sin(v.x * 11 + a[3]) * Math.sin(v.y * 12 + a[4]) * Math.sin(v.z * 10 + a[5]) * 0.005;
      v.addScaledVector(out.copy(v).normalize(), bump);
      p.setXYZ(i, v.x * s[0], v.y * s[1], v.z * s[2]);
    }
    g.computeVertexNormals();
    return g;
  };
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
      const { map, bump } = carve(label, number, centre, key === 'top');
      const m = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 4, roughness: 1, emissive: 0xffffff, emissiveMap: rimTex, emissiveIntensity: FROST });
      m.userData = { face: key, slot, centre, item: !!item };
      own.push(m);
      return m;
    });
    const mesh = new THREE.Mesh(lumpy(), mats);
    mesh.castShadow = mesh.receiveShadow = true;
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    const obj = new THREE.Group();
    obj.add(mesh, line);
    cubeGroup.add(obj);
    const r = () => (Math.random() - 0.5) * 0.35;
    // pop: how far the block has lifted out towards you while pointed at (a spring), along popDir
    const cubie = { obj, mesh, line, own, pos, q: new THREE.Quaternion(), tilt: new THREE.Euler(r(), r(), r()), order: 0, pop: 0, popV: 0, popDir: new THREE.Vector3() };
    mesh.userData.cubie = cubie;
    cubies.push(cubie);
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
      c.obj.position.multiplyScalar(1 + gap).addScaledVector(c.popDir, c.pop);
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
  // what's under the pointer: the block, the face that was hit (if it carries a name), and which way that face points
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    const m = hit.object.material[hit.face.materialIndex];
    return { m: m.userData.face ? m : null, c: hit.object.userData.cubie, n: hit.face.normal.clone().applyQuaternion(hit.object.parent.quaternion) };
  };
  // pointing at the cube parts it a little, and the block under the pointer lifts out towards you
  let from = null, moved = 0, hovered = null, hoverC = null, overCube = false;
  const point = (h) => {
    const m = h && h.m, c = h && h.c;
    overCube = !!h;
    if (c && c !== hoverC) c.popDir.copy(h.n);
    if (m === hovered && c === hoverC) return;
    hovered = m;
    hoverC = c;
    stage.classList.toggle('is-pointing', !!(m && (m.userData.item || m.userData.centre)));
    wake();
  };
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
    if (e.pointerType !== 'mouse' || !built || !near) return;
    point(pick(e));
  });
  stage.addEventListener('pointerleave', () => point(null));
  addEventListener('pointerup', (e) => {
    if (from && moved < 6 && built) {
      const h = pick(e), m = h && h.m;
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
    aim = reduced || !built ? 0 : GAP * apart * apart * (3 - 2 * apart) + (overCube && !busy ? 0.14 : 0);
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
    flakes.scale.setScalar(size / 3);
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
    let popping = false;
    if (!turning) { // the pull back together: a spring, so it lands with a little give
      gapV += (90 * (aim - gap) - 13 * gapV) * dt;
      gap += gapV * dt;
      for (const c of cubies) { // the pointed-at block lifts out on its own, quicker spring
        const want = c === hoverC && !busy && !reduced ? 0.32 : 0;
        c.popV += (170 * (want - c.pop) - 18 * c.popV) * dt;
        c.pop += c.popV * dt;
        if (Math.abs(want - c.pop) > 1e-3 || Math.abs(c.popV) > 1e-3) popping = true;
      }
    }
    place();
    if (aimQ) {
      cubeGroup.quaternion.slerp(aimQ, 0.09);
      if (cubeGroup.quaternion.angleTo(aimQ) < 0.002) aimQ = null;
    }
    // the light inside: always a little through the seams, flooding out as the blocks part
    const open = Math.max(0, Math.min(1, gap / GAP));
    core.material.opacity = 0.85 + open * 0.15;
    core.scale.setScalar(4 + open * 1.2); // reaching a little past the blocks: a halo, as round a lit igloo
    lamp.intensity = (4 + open * 30) * cubeGroup.scale.x ** 2;
    lamp.distance = 9 * cubeGroup.scale.x;
    innerMat.emissiveIntensity = 0.35 + open * 0.65;
    if (built) for (const c of cubies) for (const m of c.own) m.emissiveIntensity = m === hovered ? FROST + 0.6 : FROST;
    if (!reduced) { // snow drifting down, and round again
      const sp = flakes.userData.speed, fp = flakes.geometry.attributes.position;
      for (let i = 0; i < sp.length; i++) {
        let y = fp.getY(i) - sp[i] * dt;
        if (y < -3.5) y += 7;
        fp.setY(i, y);
        fp.setX(i, fp.getX(i) + Math.sin(now * 0.0006 + i) * 0.08 * dt);
      }
      fp.needsUpdate = true;
    }
    renderer.render(world, camera);
    const moving = !built || turning || aimQ || popping || Math.abs(aim - gap) > 1e-3 || Math.abs(gapV) > 1e-3;
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
