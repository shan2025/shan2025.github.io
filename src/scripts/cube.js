// The cube: a 3×3 puzzle cube in CSS 3D (no library). Each face is one side of the work; the centre
// square names it and the others are things on that side. Layers really turn: every small cube keeps its
// own position and orientation, so a scramble truly mixes the colours and solving truly unmixes them.
// When the cube first scrolls into view it scrambles itself, then solves. Without script, the plain list
// inside the section shows instead.

(() => {
  const root = document.getElementById('cube');
  const source = document.getElementById('cube-data');
  if (!root || !source) return;
  const stage = root.querySelector('.cube__stage');
  const orbit = root.querySelector('.cube__orbit');
  const puzzle = root.querySelector('.cube__puzzle');
  const card = {
    kind: root.querySelector('.cube__kind'),
    title: root.querySelector('.cube__title'),
    text: root.querySelector('.cube__text'),
    items: root.querySelector('.cube__items'),
    link: root.querySelector('.cube__link'),
  };
  const scrambleBtn = root.querySelector('[data-act="scramble"]');
  const solveBtn = root.querySelector('[data-act="solve"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const faces = JSON.parse(source.textContent);
  const faceBy = Object.fromEntries(faces.map((f) => [f.key, f]));

  // ---- geometry: x right, y down, z towards the viewer (CSS axes) ----
  // which square of a face a small cube sits on, as seen from outside that face
  const NORMALS = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0], top: [0, -1, 0], bottom: [0, 1, 0] };
  const SQUARE = {
    front: ([x, y]) => [y + 1, x + 1],
    back: ([x, y]) => [y + 1, 1 - x],
    right: ([, y, z]) => [y + 1, 1 - z],
    left: ([, y, z]) => [y + 1, z + 1],
    top: ([x, , z]) => [z + 1, x + 1],
    bottom: ([x, , z]) => [1 - z, x + 1],
  };
  const PLANE = {
    front: 'translateZ(var(--half))',
    back: 'rotateY(180deg) translateZ(var(--half))',
    right: 'rotateY(90deg) translateZ(var(--half))',
    left: 'rotateY(-90deg) translateZ(var(--half))',
    top: 'rotateX(90deg) translateZ(var(--half))',
    bottom: 'rotateX(-90deg) translateZ(var(--half))',
  };
  const ROT = {
    x: (c, s) => [[1, 0, 0], [0, c, -s], [0, s, c]],
    y: (c, s) => [[c, 0, s], [0, 1, 0], [-s, 0, c]],
    z: (c, s) => [[c, -s, 0], [s, c, 0], [0, 0, 1]],
  };
  const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((sum, a, k) => sum + a * B[k][j], 0)));
  const apply = (A, v) => A.map((row) => row.reduce((sum, a, k) => sum + a * v[k], 0));
  const quarter = (axis, dir) => ROT[axis](0, dir); // a 90° turn, in whole numbers
  const matrix3d = (R) => `matrix3d(${R[0][0]},${R[1][0]},${R[2][0]},0,${R[0][1]},${R[1][1]},${R[2][1]},0,${R[0][2]},${R[1][2]},${R[2][2]},0,0,0,0,1)`;

  // ---- build the 26 small cubes, with a sticker on every face that is on the outside ----
  let cubies = [];
  const build = () => {
    puzzle.replaceChildren();
    cubies = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      const el = document.createElement('div');
      el.className = 'cb';
      const pos = [x, y, z];
      for (const [key, n] of Object.entries(NORMALS)) {
        const plane = document.createElement('div');
        plane.className = 'cb__plane';
        plane.style.transform = PLANE[key];
        const outside = n.every((v, i) => !v || v === pos[i]);
        if (outside) {
          const f = faceBy[key];
          const [row, col] = SQUARE[key](pos);
          const index = row * 3 + col;
          const centre = index === 4;
          const slot = centre ? -1 : index < 4 ? index : index - 1;
          const item = centre ? null : f.items[slot];
          const sticker = document.createElement('span');
          sticker.className = `cb__sticker${centre ? ' is-centre' : ''}${!centre && !item ? ' is-plain' : ''}`;
          sticker.style.setProperty('--c', f.colour);
          sticker.style.setProperty('--ci', f.ink);
          sticker.textContent = centre ? f.name : item ? item.label || item.title : '';
          sticker.dataset.face = key;
          if (item) sticker.dataset.item = slot;
          plane.append(sticker);
        }
        el.append(plane);
      }
      puzzle.append(el);
      const c = { el, pos, R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], tilt: [Math.random() * 60 - 30, Math.random() * 60 - 30] };
      place(c);
      cubies.push(c);
    }
  };
  // gap: how far apart the small cubes have drifted (0 = a solid cube), see "coming apart" below
  let gap = 0;
  const GAP = 0.9;
  const place = (c, extra = '') => {
    const k = 1 + gap, t = gap / GAP;
    c.el.style.transform = `${extra} translate3d(calc(${c.pos[0] * k} * var(--s)), calc(${c.pos[1] * k} * var(--s)), calc(${c.pos[2] * k} * var(--s))) rotateX(${c.tilt[0] * t}deg) rotateY(${c.tilt[1] * t}deg) ${matrix3d(c.R)}`;
  };

  // ---- turning one layer: animate it, then bake the turn into each small cube ----
  const AXIS = { x: 0, y: 1, z: 2 };
  let busy = false;
  const turn = (move, ms) => new Promise((done) => {
    const [axis, layer, dir] = move;
    const group = cubies.filter((c) => c.pos[AXIS[axis]] === layer);
    const finish = () => {
      const Q = quarter(axis, dir);
      for (const c of group) {
        c.pos = apply(Q, c.pos).map(Math.round);
        c.R = mul(Q, c.R).map((r) => r.map(Math.round));
        c.el.style.transition = 'none';
        place(c);
      }
      puzzle.offsetWidth; // let the snap land before the next turn animates
      done();
    };
    if (!ms) { finish(); return; }
    // start from an explicit 0° turn, so the layer swings round in an arc instead of sliding through
    const spin = `rotate${axis.toUpperCase()}`;
    for (const c of group) { c.el.style.transition = 'none'; place(c, `${spin}(0deg)`); }
    puzzle.offsetWidth;
    for (const c of group) {
      c.el.style.transition = `transform ${ms}ms cubic-bezier(0.45, 0, 0.25, 1)`;
      place(c, `${spin}(${dir * 90}deg)`);
    }
    setTimeout(finish, ms + 20);
  });

  // ---- scramble and solve: solving replays the scramble backwards ----
  let history = [];
  const randomMove = (last) => {
    for (;;) {
      const axis = 'xyz'[Math.floor(Math.random() * 3)];
      const layer = [-1, 1][Math.floor(Math.random() * 2)];
      const dir = Math.random() < 0.5 ? 1 : -1;
      if (!last || last[0] !== axis || last[1] !== layer) return [axis, layer, dir];
    }
  };
  const run = async (moves, ms) => {
    busy = true;
    controls();
    for (const m of moves) await turn(m, reduced.matches ? 0 : ms);
    busy = false;
    controls();
  };
  const controls = () => {
    scrambleBtn.disabled = busy;
    solveBtn.disabled = busy || !history.length;
  };
  const scramble = async (n = 16, ms = 260) => {
    const moves = [];
    for (let i = 0; i < n; i++) moves.push(randomMove(moves.at(-1) || history.at(-1)));
    history.push(...moves);
    await run(moves, ms);
  };
  const solve = async (ms = 230) => {
    const back = history.slice().reverse().map(([a, l, d]) => [a, l, -d]);
    history = [];
    await run(back, ms);
    say('Solved', 'Back in order', 'Every side of my work, sorted again. Tap a square to read about it.');
  };
  scrambleBtn.addEventListener('click', () => { if (!busy) scramble(); });
  solveBtn.addEventListener('click', () => { if (!busy && history.length) solve(); });

  // ---- the card beside the cube ----
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
  const showFace = (key) => {
    const f = faceBy[key];
    root.style.setProperty('--picked', f.colour);
    say(`One side of the cube`, f.name, f.text, null, f.items);
  };
  const showItem = (key, slot) => {
    const f = faceBy[key], it = f.items[slot];
    root.style.setProperty('--picked', f.colour);
    say(it.kind || f.name, it.title, it.text, it.href || null);
  };
  root.querySelectorAll('.cube__side').forEach((b) => b.addEventListener('click', () => showFace(b.dataset.face)));

  // ---- turning the whole cube by dragging, and telling a drag from a tap ----
  let rx = -24, ry = -36, from = null, moved = 0;
  const view = () => { orbit.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
  stage.addEventListener('pointerdown', (e) => { from = [e.clientX, e.clientY]; moved = 0; });
  addEventListener('pointermove', (e) => {
    if (!from) return;
    const dx = e.clientX - from[0], dy = e.clientY - from[1];
    moved += Math.abs(dx) + Math.abs(dy);
    from = [e.clientX, e.clientY];
    ry += dx * 0.45;
    rx = Math.max(-75, Math.min(75, rx - dy * 0.35));
    view();
  });
  addEventListener('pointerup', () => { from = null; });
  stage.addEventListener('click', (e) => {
    const s = e.target.closest('.cb__sticker');
    if (!s || moved > 6) return;
    if (s.dataset.item !== undefined) showItem(s.dataset.face, Number(s.dataset.item));
    else if (s.classList.contains('is-centre')) showFace(s.dataset.face);
  });

  // ---- coming apart: away from the middle of the screen the small cubes drift apart and tilt, and they
  // click back together as the cube scrolls to the centre. A mouse over the cube parts them a little. ----
  let aim = 0, hovering = false, raf = 0, introStarted = false;
  const measure = () => {
    const r = stage.getBoundingClientRect();
    const d = Math.min(1, Math.abs(r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2));
    const apart = Math.max(0, Math.min(1, (d - 0.15) / 0.65));
    aim = reduced.matches ? 0 : GAP * apart * apart * (3 - 2 * apart) + (hovering ? 0.1 : 0);
    if (d < 0.2 && !introStarted) intro();
  };
  const tick = () => {
    raf = 0;
    if (!busy) { // a layer mid-turn keeps its spacing until the turn lands
      measure();
      gap = Math.abs(aim - gap) < 0.002 ? aim : gap + (aim - gap) * 0.14;
      for (const c of cubies) place(c);
    }
    if (busy || gap !== aim) raf = requestAnimationFrame(tick);
  };
  const nudge = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', nudge, { passive: true });
  addEventListener('resize', nudge);
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; nudge(); } });
  stage.addEventListener('pointerleave', () => { hovering = false; nudge(); });

  // ---- first look: scramble, pause, solve (once, when the cube reaches the middle of the screen) ----
  const intro = async () => {
    introStarted = true;
    if (reduced.matches) return;
    await new Promise((r) => setTimeout(r, 600));
    if (busy || history.length) return; // the visitor got there first
    await scramble(14, 180);
    await new Promise((r) => setTimeout(r, 700));
    await solve(170);
    say('How it works', 'Pick a square', 'Each colour is one side of my work. Tap a square to read about it, or tap the side buttons below to see everything on that side.');
  };

  build();
  measure();
  gap = aim; // no fly-in on page load; the movement belongs to scrolling
  for (const c of cubies) place(c);
  view();
  root.classList.add('is-live');
  controls();
})();
