// The board: a chess set drawn in hairlines, after Lucas Markes's Hairline figures (hairline.lucasmarkes.com), one
// kind of piece for each side of the work (the rooks are projects, the queen is AI, the king is me, and so on; the
// list lives in index.astro). It's drawn on a see-through canvas that reaches a little past its stage.
// The drawing is lines only: a bright line where something stands in front of something else, a dim one where a
// surface turns a corner, nothing filled but the dark squares and the black pieces, faintly, as in a chess diagram.
// The only colour is the site's accent, on the outline of the piece you point at or pick up.
// It puts itself together as you scroll to it: the frame rises, the 64 squares fly in and lock together, and
// the pieces drop onto them. Scroll back and it comes apart again, until a game has started.
// Tap a piece to read its side, drag to turn the board any way (underneath, there's a note for the curious), or
// just move a white piece: that starts a game against Shadin's AI (chess-ai.js, in his style:
// data/chess-style.json), with the rules kept by chess.js.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Chess } from 'chess.js';
import { choose } from './chess-ai.js';

export async function start(root) {
  const stage = root.querySelector('.board__stage');
  const canvas = root.querySelector('.board__canvas');
  const readOut = root.querySelector('.board__read');
  const sides = JSON.parse(root.querySelector('#board-data').textContent);
  const sideOf = Object.fromEntries(sides.map((s) => [s.piece, s])); // 'r' → the rooks' side
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('no-3d'); // no WebGL: show the list instead
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); // hairlines want every pixel there is
  renderer.setClearColor(0x000000, 0);

  // ---- drawing in lines ----
  // Pass one draws the scene into a buffer: each pixel's depth, which way its surface faces, and what it is (its
  // class). Pass two reads that and draws the lines on the page.
  const CLS = { plain: 0.1, dark: 0.3, black: 0.5, whiteLit: 0.7, blackLit: 0.9 };
  const classMat = (cls) => new THREE.ShaderMaterial({
    uniforms: { cls: { value: cls } },
    vertexShader: 'varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float cls; varying vec3 vN; void main() { gl_FragColor = vec4(normalize(vN) * 0.5 + 0.5, cls); }',
    blending: THREE.NoBlending,
  });
  const MAT = Object.fromEntries(Object.entries(CLS).map(([k, v]) => [k, classMat(v)]));
  const css = getComputedStyle(document.documentElement);
  const rgb = (value, fallback) => { const c = new THREE.Color(value.trim() || fallback), o = {}; c.getRGB(o, THREE.SRGBColorSpace); return new THREE.Vector3(o.r, o.g, o.b); };
  const buffer = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
  const NEAR = 1, FAR = 80;
  const lines = new THREE.ShaderMaterial({
    uniforms: {
      tData: { value: buffer.texture }, tDepth: { value: buffer.depthTexture }, px: { value: new THREE.Vector2() },
      range: { value: FAR - NEAR }, ink: { value: rgb(css.getPropertyValue('--ink'), '#eef4fb') }, accent: { value: rgb(css.getPropertyValue('--accent'), '#fcd34d') },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tData; uniform sampler2D tDepth; uniform vec2 px; uniform float range; uniform vec3 ink; uniform vec3 accent;
      varying vec2 vUv;
      float dep(vec2 o) { return texture2D(tDepth, vUv + o).x; }
      vec3 nrm(vec2 o) { return texture2D(tData, vUv + o).rgb * 2.0 - 1.0; }
      void main() {
        float d = dep(vec2(0.0));
        if (d >= 1.0) { gl_FragColor = vec4(0.0); return; } // nothing here
        vec2 x = vec2(px.x, 0.0), y = vec2(0.0, px.y);
        // the outline: a neighbour is far behind this pixel, so this is the near side of an edge
        float gap = (max(max(dep(x), dep(-x)), max(dep(y), dep(-y))) - d) * range;
        float outline = smoothstep(0.05, 0.12, gap);
        // a crease: the surface turns a corner between here and a neighbour
        vec3 n = nrm(vec2(0.0));
        float bend = max(max(1.0 - dot(n, nrm(x)), 1.0 - dot(n, nrm(-x))), max(1.0 - dot(n, nrm(y)), 1.0 - dot(n, nrm(-y))));
        float crease = smoothstep(0.09, 0.22, bend) * (1.0 - outline);
        float k = texture2D(tData, vUv).a;
        bool lit = k > 0.6, black = (k > 0.4 && k < 0.6) || k > 0.8;
        float fill = (k > 0.2 && k < 0.4) ? 0.07 : black ? 0.3 : 0.0; // dark squares and black pieces, faintly
        float a = max(outline * 0.95, crease * 0.26);
        vec3 line = lit && outline > 0.0 ? accent : ink;
        gl_FragColor = vec4(line * a + ink * fill * (1.0 - a), a + fill * (1.0 - a)); // premultiplied
      }`,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const linesScene = new THREE.Scene(), linesCam = new THREE.Camera();
  linesScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lines));

  // ---- the board: eight by eight, set in a frame ----
  // One square is one unit; files run along x (a on the left), ranks along z (white's side, rank 1, nearest you).
  // The squares stand a little proud of the frame, so the playing area has an edge.
  const TOP = 9.04;
  const world = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR); // drawn without perspective, as an isometric figure is
  const tiltGroup = new THREE.Group(); // dragging up and down tips this over
  const turnGroup = new THREE.Group(); // dragging across turns this about the vertical
  const boardGroup = new THREE.Group();
  turnGroup.add(boardGroup);
  tiltGroup.add(turnGroup);
  world.add(tiltGroup);
  const body = new THREE.Mesh(new RoundedBoxGeometry(TOP + 0.16, 0.42, TOP + 0.16, 4, 0.08), MAT.plain);
  body.position.y = -0.26; // its top 0.05 below the squares
  const top = new THREE.Mesh(new THREE.PlaneGeometry(TOP, TOP), MAT.plain); // not drawn: what taps on squares are aimed at
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.001;
  top.visible = false;
  // the 64 squares, each its own tile: where it flies in from, and when
  const tiles = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), (f + r) % 2 === 0 ? MAT.dark : MAT.plain); // a1 is dark
    const home = new THREE.Vector3(f - 3.5, -0.027, 3.5 - r);
    const out = (n) => (Math.random() * 2 - 1) * n;
    tiles.push({ mesh, home, from: home.clone().add(new THREE.Vector3(out(5), 1.5 + Math.random() * 2.5, out(4))), // near the board, not over the heading
      spin: new THREE.Quaternion().setFromEuler(new THREE.Euler(out(Math.PI), out(Math.PI), out(Math.PI))), delay: Math.random() });
  }
  const TABLE = -0.47; // the ground the board stands on, where taken pieces go
  // underneath: four felt pads, for whoever turns it over
  const pads = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), MAT.plain);
    m.position.set(sx * 3.9, -0.5, sz * 3.9);
    return m;
  }));
  const frameGroup = new THREE.Group(); // the frame rises into place first
  frameGroup.add(body, top, ...pads);
  boardGroup.add(frameGroup, ...tiles.map((t) => t.mesh));

  // ---- the pieces: turned on a lathe (profiles are [radius, height]), with crowns, crosses and a carved knight ----
  const arc = (cy, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * (i / n);
    return [Math.max(0, r * Math.cos(a)), cy + r * Math.sin(a)];
  });
  const foot = (r) => [[0, 0], [r, 0], [r + 0.012, 0.02], [r + 0.012, 0.05], [r - 0.01, 0.07], [r - 0.03, 0.08], [r - 0.03, 0.1], [r - 0.06, 0.12]];
  const turned = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 56).toNonIndexed();
  const ball = (r, y, x = 0, z = 0) => new THREE.SphereGeometry(r, 20, 14).translate(x, y, z).toNonIndexed();
  const block = (w, h, d, y, turn = 0, x = 0, z = 0) => new THREE.BoxGeometry(w, h, d).rotateY(turn).translate(x, y, z).toNonIndexed();
  const ringOf = (n, make) => Array.from({ length: n }, (_, i) => make((i / n) * Math.PI * 2));
  const knightHead = (() => {
    // a horse's head in profile, facing +x: mane, ear, forehead, nose, muzzle, jaw, then the chest
    const P = [[-0.28, 0.18], [-0.27, 0.36], [-0.22, 0.52], [-0.15, 0.64], [-0.09, 0.74], [-0.07, 0.88], [0, 0.8], [0.07, 0.77], [0.17, 0.71],
      [0.27, 0.61], [0.35, 0.51], [0.39, 0.43], [0.38, 0.36], [0.3, 0.32], [0.2, 0.34], [0.1, 0.3], [0.06, 0.23], [0.12, 0.13], [0.2, 0.04], [0.2, 0]];
    const s = new THREE.Shape();
    s.moveTo(-0.24, 0);
    s.splineThru(P.map(([x, y]) => new THREE.Vector2(x, y)));
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.03, bevelSegments: 6, curveSegments: 32 });
    g.translate(0, 0, -0.09).scale(0.9, 0.9, 1).translate(0, 0.17, 0);
    return g.index ? g.toNonIndexed() : g;
  })();
  const SHAPES = {
    p: [turned([...foot(0.29), [0.2, 0.15], [0.16, 0.22], [0.13, 0.32], [0.11, 0.42], [0.18, 0.44], [0.19, 0.46], [0.17, 0.48], ...arc(0.62, 0.15, -0.93, Math.PI / 2)])],
    r: [turned([...foot(0.33), [0.25, 0.16], [0.22, 0.26], [0.2, 0.45], [0.2, 0.58], [0.26, 0.62], [0.26, 0.65], [0.22, 0.67], [0.24, 0.7], [0.26, 0.72], [0.26, 0.82], [0.18, 0.82], [0.18, 0.76], [0, 0.76]]),
      ...ringOf(6, (a) => block(0.13, 0.09, 0.075, 0.865, -(a + Math.PI / 2), Math.cos(a) * 0.22, Math.sin(a) * 0.22))],
    n: [turned([...foot(0.33), [0.26, 0.16], [0.24, 0.2], [0, 0.2]]), knightHead],
    b: [turned([...foot(0.32), [0.23, 0.16], [0.18, 0.28], [0.14, 0.45], [0.12, 0.56], [0.2, 0.59], [0.2, 0.62], [0.13, 0.64], [0.15, 0.67],
      [0.17, 0.72], [0.175, 0.78], [0.16, 0.85], [0.12, 0.92], [0.07, 0.97], [0.03, 0.995], [0, 0.995]]), ball(0.05, 1.03)],
    q: [turned([...foot(0.35), [0.26, 0.16], [0.2, 0.3], [0.15, 0.55], [0.13, 0.7], [0.22, 0.73], [0.22, 0.76], [0.14, 0.78], [0.16, 0.81],
      [0.21, 0.92], [0.24, 1], [0.21, 1.02], [0.13, 1.02], [0.11, 1.06], [0.06, 1.1], [0, 1.11]]),
      ...ringOf(9, (a) => ball(0.035, 1.03, Math.cos(a) * 0.215, Math.sin(a) * 0.215)), ball(0.06, 1.15)],
    k: [turned([...foot(0.36), [0.27, 0.16], [0.21, 0.32], [0.16, 0.6], [0.14, 0.76], [0.23, 0.79], [0.23, 0.82], [0.15, 0.84], [0.17, 0.87],
      [0.21, 0.99], [0.22, 1.04], [0.16, 1.07], [0.12, 1.1], [0.07, 1.12], [0, 1.12]]), block(0.07, 0.26, 0.07, 1.25), block(0.2, 0.07, 0.07, 1.27)],
  };
  const GEO = Object.fromEntries(Object.entries(SHAPES).map(([k, parts]) => [k, mergeGeometries(parts)]));
  const NAMES = { p: 'Pawn', r: 'Rook', n: 'Knight', b: 'Bishop', q: 'Queen', k: 'King' };

  const at = (f, r) => new THREE.Vector3(f - 3.5, 0, 3.5 - r);
  const pieces = [];
  const setUp = (rank, row, white) => [...row].forEach((type, f) => {
    const mesh = new THREE.Mesh(GEO[type], white ? MAT.plain : MAT.black);
    if (type === 'n') mesh.rotation.y = f < 4 ? 0 : Math.PI; // knights look in along the rank, so you see their heads
    const p = { mesh, type, base: type, white, home: [f, rank], sq: [f, rank], y0: 0, lift: 0, liftV: 0 }; // y0: on the board, or the ground beside it
    mesh.userData.piece = p;
    mesh.position.copy(at(f, rank));
    boardGroup.add(mesh);
    pieces.push(p);
  });
  setUp(0, 'rnbqkbnr', true);
  setUp(1, 'pppppppp', true);
  setUp(6, 'pppppppp', false);
  setUp(7, 'rnbqkbnr', false);
  pieces.forEach((p, i) => { p.drop = 0; p.delay = i / (pieces.length - 1); }); // they land white first, rank by rank
  const meshes = pieces.map((p) => p.mesh);

  // ---- the card ----
  const card = {
    kind: root.querySelector('.board__kind'), title: root.querySelector('.board__title'), text: root.querySelector('.board__text'),
    items: root.querySelector('.board__items'), link: root.querySelector('.board__link'),
  };
  let said = [card.kind.textContent, card.title.textContent, card.text.textContent], peeking = false; // what the card last said, to put back after a look underneath
  const say = (...args) => { said = args; if (!peeking) write(...args); };
  const write = (kind, title, text, list = null) => {
    card.kind.textContent = kind;
    card.title.textContent = title;
    card.text.textContent = text;
    card.link.hidden = true;
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
  // picking a kind of piece lifts every one of them and reads out its side
  let picked = null;
  const pickSide = (type) => {
    const s = sideOf[type];
    picked = type;
    sel = null;
    say(`// ${s.pieceName}`, s.name, s.text, s.items);
    root.querySelectorAll('.board__side').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.piece === type)));
    wake();
  };
  root.querySelectorAll('.board__side').forEach((b) => b.addEventListener('click', () => pickSide(b.dataset.piece)));

  // ---- moving pieces: picked up, carried (a knight a little higher, over the others) and set down ----
  const moving = [];
  const glide = (p, to, ms) => new Promise((done) => { // to: a spot on the board, or on the ground beside it
    const from = p.mesh.position.clone().setY(p.y0);
    const far = from.distanceTo(to);
    p.y0 = to.y;
    if (!ms || !far) { p.mesh.position.copy(to); done(); return; }
    moving.push({ p, from, to: to.clone(), t0: performance.now(), ms, hop: p.type === 'n' ? 0.55 : 0.2 + far * 0.03, done });
    wake();
  });
  const sqOf = (name) => ['abcdefgh'.indexOf(name[0]), Number(name[1]) - 1];
  const nameOf = ([f, r]) => 'abcdefgh'[f] + (r + 1);
  const pieceOn = (name) => pieces.find((p) => p.sq && nameOf(p.sq) === name);
  const colourOf = (p) => (p.white ? 'w' : 'b');

  // ---- the game: you against Shadin's AI (chess-ai.js), which plays the way he does ----
  // There's always a game waiting, and you play the side nearest you, as at a real board: move a white piece and
  // it starts; turn the board round and pick up a black piece, and the AI opens as white. Before that, any piece
  // you touch tells you its side of the work.
  // when you win: a line that makes no sense, a "Why?" button, and an answer that makes even less
  const NONSENSE = [
    ['Life is like a soap.', 'Nobody knows. Now go away.'],
    ['Bananas are just yellow boomerangs that gave up.', 'I don’t have to explain myself to a winner. Go away.'],
    ['Tuesday is basically a cucumber.', 'Because it is. No more questions.'],
    ['My goldfish has a better LinkedIn than me.', 'It just does. Please leave.'],
    ['Socks disappear because they’re shy.', 'Nobody knows. Shoo.'],
    ['A chair is a table that gave up halfway.', 'You won. That’s enough answers for one day. Goodbye.'],
    ['Every potato is a little bit of a philosopher.', 'I said what I said. Off you go.'],
    ['Clouds are just the sky’s laundry.', 'Don’t look at me like that. Go away.'],
  ];
  let why = '';
  const KIND = '// You vs Shadin’s AI';
  let you = 'w'; // the side you play: whichever is nearest you when the game starts
  const btn = Object.fromEntries([...root.querySelectorAll('[data-act]')].map((b) => [b.dataset.act, b]));
  const sidesEl = root.querySelector('.board__sides');
  const intro = [card.kind.textContent, card.title.textContent, card.text.textContent];
  let mode = 'explore', game = new Chess(), brain = null, sel = null, lastMove = null;
  let reading = null; // his games (data/chess-style.json), read once the board is up
  const readBrain = () => (reading ||= import('../data/chess-style.json').then((m) => { brain = m.default; }).catch(() => { brain = {}; }));
  let busy = true, thinking = false;
  const show = (m) => { // explore: no move made yet; game: under way; over: a result on the card
    mode = m;
    btn.resign.hidden = m !== 'game';
    btn.again.hidden = m !== 'over';
    btn.why.hidden = true;
    sidesEl.hidden = m !== 'explore';
  };
  const setUpAgain = () => Promise.all(pieces.map((p) => {
    if (p.type !== p.base) { p.type = p.base; p.mesh.geometry = GEO[p.base]; }
    p.sq = p.home.slice();
    return glide(p, at(...p.home), reduced ? 0 : 650);
  }));
  const taken = { w: 0, b: 0 };
  // pieces you take stand to your right of the board; pieces it takes, to its right
  const besideBoard = (p) => {
    const c = colourOf(p), i = taken[c]++, side = (c !== you ? 1 : -1) * (you === 'w' ? 1 : -1);
    return new THREE.Vector3(side * (5.25 + Math.floor(i / 8) * 0.75), TABLE, side * ((i % 8) - 3.5) * 0.85);
  };
  const select = (p) => { sel = p; wake(); };
  const readSide = (type, yours) => {
    const s = sideOf[type];
    picked = null;
    say(`// ${s.pieceName}`, s.name, yours ? `${s.text} Move it to start a game against my AI.` : s.text, s.items);
  };
  const begin = () => { // the game starts: the side buttons go, and the card follows the game
    show('game');
    picked = null;
    root.querySelectorAll('.board__side').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  };
  const play = async (move) => {
    if (mode === 'explore') begin(); // your first move as white starts the game
    const m = game.move(move);
    const p = pieceOn(m.from), steps = [], ms = reduced ? 0 : 560;
    sel = null;
    if (m.captured) {
      const c = pieceOn(m.flags.includes('e') ? m.to[0] + m.from[1] : m.to);
      c.sq = null;
      steps.push(new Promise((r) => setTimeout(r, ms * 0.45)).then(() => glide(c, besideBoard(c), ms)));
    }
    p.sq = sqOf(m.to);
    steps.push(glide(p, at(...p.sq), ms));
    if (m.flags.includes('k') || m.flags.includes('q')) { // castling: the rook comes round too
      const rook = pieceOn((m.flags.includes('k') ? 'h' : 'a') + m.from[1]);
      rook.sq = sqOf((m.flags.includes('k') ? 'f' : 'd') + m.from[1]);
      steps.push(glide(rook, at(...rook.sq), ms));
    }
    await Promise.all(steps);
    if (m.promotion) { p.type = m.promotion; p.mesh.geometry = GEO[m.promotion]; }
    lastMove = m;
    wake();
    next();
  };
  const next = () => {
    if (mode !== 'game') return;
    if (game.isGameOver()) return over();
    if (game.turn() === you) {
      say(KIND, game.inCheck() ? 'Check! Your move' : 'Your move', `Shadin’s AI played ${lastMove.san}.`);
      return;
    }
    thinking = true;
    const n = game.history().length;
    const about = `My AI learned from ${brain?.games ? `${brain.games.toLocaleString('en')} of my games` : 'my games'} on Chess.com and plays like me.`;
    say(KIND, n <= 1 ? 'Game on' : 'Thinking…', n === 0 ? `You’re black, so my AI opens, as white. ${about}`
      : n === 1 ? `You played ${lastMove.san}. ${about}` : `You played ${lastMove.san}.`);
    setTimeout(async () => {
      await readBrain();
      thinking = false;
      if (mode === 'game') play(choose(game, brain));
    }, reduced ? 50 : 450 + Math.random() * 600);
  };
  const over = () => {
    show('over');
    if (game.isCheckmate()) {
      if (game.turn() !== you) {
        const [line, answer] = NONSENSE[Math.floor(Math.random() * NONSENSE.length)];
        say(KIND, 'You win!', line);
        why = answer;
        btn.why.hidden = false;
      } else say(KIND, 'Checkmate', `Shadin’s AI wins with ${lastMove.san}. That’s about how he plays, too. Play again?`);
    } else {
      say(KIND, 'A draw', game.isStalemate() ? 'Stalemate: no legal move, but no check either. Call it even.'
        : game.isThreefoldRepetition() ? 'The same position three times. Call it even.'
        : game.isInsufficientMaterial() ? 'Not enough pieces left for anyone to mate. Call it even.'
        : 'Fifty moves without a capture or a pawn move. Call it even.');
    }
  };
  btn.why.addEventListener('click', () => {
    said[2] = why;
    if (!peeking) card.text.textContent = why;
    btn.why.hidden = true;
  });
  btn.resign.addEventListener('click', () => {
    if (mode !== 'game') return;
    show('over');
    say(KIND, 'You resigned', 'Shadin’s AI takes this one. You’ll get it next time.');
  });
  btn.again.addEventListener('click', async () => {
    game = new Chess();
    sel = lastMove = null;
    taken.w = taken.b = 0;
    busy = true;
    show('explore');
    say(...intro);
    viewAim = { yaw: you === 'w' ? HOME : HOME + Math.PI, pitch: 0 }; // level again, your side in front of you
    await setUpAgain();
    busy = false;
  });

  // ---- pointing, dragging and tapping (on the stage; the canvas itself takes no clicks) ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const hit = (e) => {
    aim(e);
    const h = ray.intersectObjects(meshes, false)[0];
    return h ? h.object.userData.piece : null;
  };
  const squareAt = (e) => { // the square under the pointer, if it's on the board
    aim(e);
    const h = ray.intersectObject(top, false)[0];
    if (!h) return null;
    const v = boardGroup.worldToLocal(h.point.clone()), f = Math.round(v.x + 3.5), r = Math.round(3.5 - v.z);
    return f >= 0 && f < 8 && r >= 0 && r < 8 ? nameOf([f, r]) : null;
  };
  const tap = (e) => {
    if (mode === 'over' || busy || thinking || moving.length) return;
    if (mode === 'explore') you = Math.cos(yaw) >= 0 ? 'w' : 'b'; // you play the side nearest you
    const p = hit(e), target = squareAt(e);
    if (game.turn() !== you) { // black, before the first move: pick up one of yours and the AI opens
      if (mode !== 'explore') return;
      const pick = [p, target && pieceOn(target)].find((q) => q && q.sq && colourOf(q) === you);
      if (pick) { select(pick); begin(); next(); }
      else if (p && p.sq) readSide(p.type, false);
      return;
    }
    const legal = sel ? game.moves({ square: nameOf(sel.sq), verbose: true }).filter((x) => !x.promotion || x.promotion === 'q') : [];
    const to = (name) => legal.find((x) => x.to === name);
    // the square under the pointer comes first (a tall piece nearer you can stand over it), then the piece touched
    const m = (target && to(target)) || (p && p.sq && colourOf(p) !== you && to(nameOf(p.sq)));
    if (m) return play(m);
    // picking up: the piece touched, unless it can't move and one of yours that can is on the square beneath
    // (at the start the king stands in front of the e-pawn)
    const under = target && pieceOn(target);
    const mine = (q) => q && q.sq && colourOf(q) === you;
    const canMove = (q) => game.moves({ square: nameOf(q.sq) }).length > 0;
    const pick = mine(p) ? (!canMove(p) && mine(under) && canMove(under) ? under : p) : mine(under) ? under : null;
    if (mode === 'explore') { // before the game, every piece also tells you its side of the work
      const read = pick || (p && p.sq ? p : null);
      if (read) readSide(read.type, read === pick);
    } else if (sel && !pick && target) say(KIND, 'Your move', `Your ${NAMES[sel.type].toLowerCase()} can’t go to ${target}. Pick a piece, then a square.`);
    select(pick && pick !== sel ? pick : null);
  };
  let from = null, moved = 0, hovered = null, built = false;
  const point = (p, e) => {
    if (p && mode === 'game' && (!p.sq || colourOf(p) !== you || game.turn() !== you)) p = null; // in a game, only your own pieces answer
    // the read-out in the corner names what's under the pointer, in a few words, or says rest
    const square = !p && e ? squareAt(e) : null;
    readOut.textContent = peeking ? 'underneath' : p ? [p.sq && nameOf(p.sq), NAMES[p.type].toLowerCase(), mode === 'explore' && sideOf[p.type].name.toLowerCase()].filter(Boolean).join(' · ') : square || 'rest';
    if (p === hovered) return;
    hovered = p;
    stage.classList.toggle('is-pointing', !!p && mode !== 'over');
    wake();
  };
  // dragging turns the board any way: across spins it round, up and down tips it over (all the way, if you like)
  const HOME = Math.PI / 4; // turned 45°, as an isometric figure stands, with white's corner nearest you
  let yaw = HOME, yawV = 0, pitch = 0, viewAim = null;
  const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
  stage.addEventListener('pointerdown', (e) => { from = [e.clientX, e.clientY]; moved = 0; });
  addEventListener('pointermove', (e) => {
    if (from) {
      const dx = e.clientX - from[0], dy = e.clientY - from[1];
      moved += Math.abs(dx) + Math.abs(dy);
      from = [e.clientX, e.clientY];
      if (moved < 6) return; // still a tap
      yaw += dx * 0.008;
      yawV = dx * 0.008;
      pitch = wrap(pitch + dy * 0.008);
      viewAim = null;
      point(null);
      wake();
      return;
    }
    if (e.pointerType !== 'mouse' || !built || !near) return;
    const r = stage.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    point(inside ? hit(e) : null, e);
  });
  stage.addEventListener('pointerleave', () => point(null));
  addEventListener('pointerup', (e) => {
    if (from && moved < 6 && built) tap(e);
    from = null;
  });
  addEventListener('pointercancel', () => { from = null; });

  const finishBuild = () => {
    busy = false;
    show('explore');
    setTimeout(readBrain, 1500); // his games, ready before anyone's first move
  };

  // ---- putting itself together, as far as you've scrolled: 0 is in pieces in the air, 1 is set up ----
  const NONE = new THREE.Quaternion();
  const c01 = (t) => Math.max(0, Math.min(1, t)), easeOut = (t) => 1 - (1 - t) ** 3;
  let shown = reduced ? 1 : 0, settled = -1;
  const settle = (k) => {
    if (k === settled) return;
    settled = k;
    const b = easeOut(c01(k / 0.3)); // the frame rises first
    frameGroup.position.y = -(1 - b) * 3;
    frameGroup.visible = k > 0.001;
    for (const t of tiles) { // then the squares fly in and lock together
      const e = easeOut(c01((k - 0.1 - t.delay * 0.4) / 0.3));
      t.mesh.position.lerpVectors(t.from, t.home, e);
      t.mesh.quaternion.slerpQuaternions(t.spin, NONE, e);
      t.mesh.visible = k > 0.001;
    }
    for (const p of pieces) { // and the pieces drop on, falling faster as they go
      const e = c01((k - 0.6 - p.delay * 0.28) / 0.12);
      p.drop = 3 * (1 - e * e);
      p.mesh.visible = e > 0;
    }
  };
  const scrolled = () => { // how far the stage has come up the screen: 0 as it appears, 1 once it's well in view
    if (reduced || mode !== 'explore') return 1; // once a game has started, it stays together
    return c01((innerHeight - stage.getBoundingClientRect().top) / (innerHeight * 0.55));
  };

  // ---- size: the board sits in the middle of its canvas, sized to the stage ----
  const toCamera = new THREE.Vector3();
  const EL = Math.asin(0.5); // the 2:1 view of an isometric figure
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const unit = Math.min(stage.clientWidth * 0.84 / 12.8, stage.clientHeight * 0.92 / 8); // pixels per square; 12.8 is the board's diagonal, so it fits turned any way
    Object.assign(camera, { left: -w / 2 / unit, right: w / 2 / unit, top: h / 2 / unit, bottom: -h / 2 / unit });
    camera.position.set(0, Math.sin(EL), Math.cos(EL)).multiplyScalar(30);
    camera.lookAt(0, 0.2, 0);
    camera.updateProjectionMatrix();
    toCamera.copy(camera.position).normalize();
    wake();
  };
  new ResizeObserver(resize).observe(canvas);

  // ---- the frame loop, only while the board's section is near the screen ----
  let raf = 0, near = true, last = performance.now();
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!from) { yaw += yawV; yawV *= 0.9; if (Math.abs(yawV) < 1e-4) yawV = 0; } // a flick keeps turning, then slows
    if (viewAim && !from) { // back to the usual view: the nearest way round
      const target = viewAim.yaw + Math.PI * 2 * Math.round((yaw - viewAim.yaw) / (Math.PI * 2)), k = Math.min(1, dt * 6);
      yaw += (target - yaw) * k;
      pitch += (viewAim.pitch - pitch) * k;
      yawV = 0;
      if (Math.abs(target - yaw) < 1e-3 && Math.abs(pitch - viewAim.pitch) < 1e-3) { yaw = target; pitch = viewAim.pitch; viewAim = null; }
    }
    turnGroup.rotation.y = yaw;
    tiltGroup.rotation.x = pitch;
    const aimed = scrolled();
    shown += (aimed - shown) * Math.min(1, dt * 7);
    if (Math.abs(aimed - shown) < 1e-3) shown = aimed;
    settle(shown);
    built = shown > 0.97; // together enough to play on
    // turned far enough over that you're looking at the bottom?
    const facing = toCamera.y * Math.cos(pitch) + toCamera.z * Math.sin(pitch);
    if (facing < -0.15 && !peeking) {
      peeking = true;
      write('// Hey', 'Too curious, aren’t you?', 'Nothing under here but four felt pads. The game is on the other side.');
      readOut.textContent = 'underneath';
    } else if (facing > 0.05 && peeking) {
      peeking = false;
      write(...said);
      readOut.textContent = 'rest';
    }
    let springing = false;
    for (const p of pieces) { // the piece in hand (or the picked kind) is lifted off the board; the one under the pointer rises a little
      const up = sel === p || (mode === 'explore' && picked === p.type);
      const want = up ? 0.22 : p === hovered ? 0.14 : 0;
      const lit = up || p === hovered;
      p.mesh.material = p.white ? (lit ? MAT.whiteLit : MAT.plain) : (lit ? MAT.blackLit : MAT.black);
      p.liftV += (160 * (want - p.lift) - 17 * p.liftV) * dt;
      p.lift += p.liftV * dt;
      if (Math.abs(want - p.lift) > 1e-3 || Math.abs(p.liftV) > 1e-3) springing = true;
    }
    for (let i = moving.length - 1; i >= 0; i--) {
      const m = moving[i], k = Math.min(1, (now - m.t0) / m.ms), e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      m.p.mesh.position.lerpVectors(m.from, m.to, e);
      m.p.mesh.position.y += Math.sin(Math.PI * e) * m.hop;
      if (k >= 1) { m.p.mesh.position.copy(m.to); moving.splice(i, 1); m.done(); }
    }
    for (const p of pieces) if (!moving.some((m) => m.p === p)) p.mesh.position.y = p.y0 + p.lift + p.drop;
    draw();
    const busyFrame = moving.length || springing || yawV || viewAim || shown !== aimed;
    if (near && !document.hidden && busyFrame) raf = requestAnimationFrame(frame);
  };
  const drawn = new THREE.Vector2();
  const draw = () => { // the scene into the buffer, then the buffer onto the page as lines
    renderer.getDrawingBufferSize(drawn);
    if (buffer.width !== drawn.x || buffer.height !== drawn.y) {
      buffer.setSize(drawn.x, drawn.y);
      lines.uniforms.px.value.set(1 / drawn.x, 1 / drawn.y);
    }
    renderer.setRenderTarget(buffer);
    renderer.clear();
    renderer.render(world, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(linesScene, linesCam);
  };
  function wake() { if (!raf && near && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  // run while the section is within a screen of view; otherwise stop and hide the canvas
  new IntersectionObserver(([e]) => {
    near = e.isIntersecting;
    canvas.style.visibility = near ? 'visible' : 'hidden';
    if (near) wake();
  }, { rootMargin: '100% 0px' }).observe(root);
  document.addEventListener('visibilitychange', wake);
  addEventListener('scroll', wake, { passive: true });

  root.classList.add('is-live');
  resize();
  finishBuild();

}
