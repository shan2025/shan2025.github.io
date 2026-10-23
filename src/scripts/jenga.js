// The Jenga tower: every block is a project, a certificate, a skill or a note. Pull one out to read it.
// Pull a load-bearing one and everything above it falls: "it ran" until it didn't.
// Built with CSS 3D (no library); the wood grain is painted once on a canvas. Blocks are real buttons, so the
// keyboard works too; without script the plain list inside the section shows instead.

(() => {
  const root = document.getElementById('jenga');
  const source = document.getElementById('jenga-data');
  if (!root || !source) return;
  const stage = root.querySelector('.jenga__stage');
  const tower = root.querySelector('.jenga__tower');
  const card = {
    kind: root.querySelector('.jenga__kind'),
    title: root.querySelector('.jenga__title'),
    text: root.querySelector('.jenga__text'),
    link: root.querySelector('.jenga__link'),
    reset: root.querySelector('.jenga__reset'),
    count: root.querySelector('.jenga__count'),
  };
  const intro = { kind: card.kind.textContent, title: card.title.textContent, text: card.text.textContent };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const PER = 3;

  // Real towers have plain blocks too; a few sit between the labelled ones.
  const PLAIN = { type: 'plain', kind: 'Plain wood', title: 'Just wood', text: 'Every tower needs a few blocks that only hold things up. Try another one.' };
  const content = JSON.parse(source.textContent);
  const plainAt = new Set([4, 8, 13, 17, 20, 25, 28, 32, 34]);
  const items = [];
  for (let i = 0, c = 0; c < content.length || plainAt.has(i); i++) items.push(plainAt.has(i) ? PLAIN : content[c++]);
  while (items.length % PER) items.push(PLAIN);
  const layers = items.length / PER;
  root.style.setProperty('--layers', layers);

  // ---- seeded randomness, so the tower is the same "messy" tower on every visit ----
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---- wood: long faces get grain, the ends get growth rings; a few variants so no two blocks match ----
  // painted once, then shared by every face as a short blob: URL
  const paint = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const bin = atob(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  };
  const grain = (tone) => paint(600, 140, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, `hsl(${34 + tone * 4}, ${48 + tone * 6}%, ${80 - tone * 5}%)`);
    base.addColorStop(1, `hsl(${32 + tone * 4}, ${46 + tone * 6}%, ${74 - tone * 5}%)`);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const y = rand() * h, amp = 1 + rand() * 5, freq = 0.004 + rand() * 0.01, phase = rand() * 6;
      g.strokeStyle = `rgba(${120 + rand() * 30}, ${72 + rand() * 20}, ${30 + rand() * 15}, ${0.05 + rand() * 0.16})`;
      g.lineWidth = 0.4 + rand() * 1.8;
      g.beginPath();
      for (let x = 0; x <= w; x += 6) g.lineTo(x, y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1) * amp * 0.3);
      g.stroke();
    }
    if (rand() < 0.5) { // a small knot
      const kx = 80 + rand() * (w - 160), ky = 20 + rand() * (h - 40);
      for (let r = 9; r > 1; r -= 1.6) { g.strokeStyle = `rgba(110, 62, 24, ${0.12 + (9 - r) * 0.03})`; g.lineWidth = 1; g.beginPath(); g.ellipse(kx, ky, r * 2.2, r, 0, 0, Math.PI * 2); g.stroke(); }
    }
  });
  const rings = (tone) => paint(160, 100, (g, w, h) => {
    g.fillStyle = `hsl(${30 + tone * 4}, ${44 + tone * 5}%, ${70 - tone * 5}%)`; g.fillRect(0, 0, w, h);
    const cx = -40 + rand() * 60, cy = h + 20 + rand() * 60;
    for (let r = 6; r < 260; r += 5 + rand() * 4) { g.strokeStyle = `rgba(105, 58, 22, ${0.1 + rand() * 0.14})`; g.lineWidth = 0.8 + rand(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
  });
  const sides = [0, 0.4, 0.8, 1.2, 1.6, 2].map(grain);
  const ends = [0, 0.8, 1.6].map(rings);

  // ---- build the tower: layers alternate direction, three blocks each, never perfectly straight ----
  const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  let blocks = [];
  const build = () => {
    seed = 11;
    if (!tower.querySelector('.jenga__floor')) {
      const floor = document.createElement('div');
      floor.className = 'jenga__floor';
      tower.append(floor);
    }
    tower.querySelector('.jenga__sway')?.remove();
    const sway = document.createElement('div');
    sway.className = 'jenga__sway';
    tower.append(sway);
    blocks = items.map((it, k) => {
      const layer = Math.floor(k / PER), slot = k % PER;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `blk${it.type === 'plain' ? ' blk--plain' : ''}`;
      el.setAttribute('aria-label', it.type === 'plain' ? 'Plain wood block. Pull it out.' : `${it.title}. ${it.kind}. Pull this block out.`);
      const s = el.style;
      s.setProperty('--layer', layer);
      s.setProperty('--slot', slot - 1);
      s.setProperty('--turn', layer % 2 ? '90deg' : '0deg');
      s.setProperty('--jx', `${((rand() - 0.5) * 0.12).toFixed(3)}`);
      s.setProperty('--jz', `${((rand() - 0.5) * 0.05).toFixed(3)}`);
      s.setProperty('--jr', `${((rand() - 0.5) * 1.6).toFixed(2)}deg`);
      s.setProperty('--tone', (0.93 + rand() * 0.12).toFixed(3));
      const side = sides[Math.floor(rand() * sides.length)], end = ends[Math.floor(rand() * ends.length)];
      for (const f of FACES) {
        const face = document.createElement('span');
        face.className = `blk__face blk__${f}`;
        const tex = f === 'left' || f === 'right' ? end : side;
        face.style.backgroundImage = `var(--light), url(${tex})`;
        face.style.backgroundPosition = `0 0, ${Math.floor(rand() * 300)}px ${Math.floor(rand() * 40)}px`;
        if ((f === 'front' || f === 'back') && it.type !== 'plain') {
          const label = document.createElement('span');
          label.className = 'blk__label';
          label.textContent = it.label || it.title;
          face.append(label);
        }
        el.append(face);
      }
      sway.append(el);
      return { el, it, layer, slot, out: false, fallen: false };
    });
    root.classList.remove('is-fallen');
    card.reset.hidden = true;
    pulled = 0;
    count();
    show(intro.kind, intro.title, intro.text, null);
  };

  const show = (kind, title, text, href) => {
    card.kind.textContent = kind;
    card.title.textContent = title;
    card.text.textContent = text;
    card.link.hidden = !href;
    if (href) card.link.href = href;
  };
  let pulled = 0;
  const count = () => { card.count.textContent = pulled ? `${pulled} of ${items.length} blocks pulled` : ''; };

  // ---- would the tower still stand? A layer with something above it falls when it is empty,
  // or when only one outer block is left (the middle alone, or both sides, still hold).
  const weakLayer = () => {
    const top = Math.max(...blocks.filter((b) => !b.out).map((b) => b.layer));
    for (let L = 0; L < top; L++) {
      const left = blocks.filter((b) => b.layer === L && !b.out);
      if (!left.length) return L;
      if (left.length === 1 && left[0].slot !== 1) return L;
    }
    return -1;
  };

  // Blocks fall away from the tower, land flat or on their side, and bounce once.
  const collapse = (L) => {
    root.classList.add('is-fallen');
    const falling = blocks.filter((b) => !b.out && b.layer >= L);
    falling.forEach((b, n) => {
      const a = Math.random() * Math.PI * 2;
      const r = 2.3 + Math.random() * 2.2 + Math.min(6, b.layer - L) * 0.15; // clear of the base that still stands
      const onSide = Math.random() < 0.35;
      const s = b.el.style;
      s.setProperty('--fx', (Math.cos(a) * r).toFixed(2));
      s.setProperty('--fz', (Math.sin(a) * r * 0.6 - 0.5).toFixed(2)); // a little towards the back, so nothing lands out of frame
      s.setProperty('--fr', `${Math.round(Math.random() * 360)}deg`);
      s.setProperty('--ft', onSide ? `${Math.random() < 0.5 ? 90 : -90}deg` : '0deg');
      s.setProperty('--fy', onSide ? '-0.2' : '0');
      s.setProperty('--delay', `${reduced.matches ? 0 : (b.layer - L) * 45 + n * 6}ms`);
      b.fallen = true;
      b.el.disabled = true;
      b.el.classList.add('is-fallen');
    });
    show('The tower fell', 'It ran. It didn’t hold.', 'That block was load-bearing. Everything looked fine until it was pulled, which is exactly why I check what actually happened, not just the status.', null);
    card.reset.hidden = false;
  };

  const pull = (b) => {
    if (b.out || b.fallen || root.classList.contains('is-fallen')) return;
    b.out = true;
    pulled += 1;
    count();
    b.el.classList.add('is-out');
    b.el.disabled = true;
    show(b.it.kind, b.it.title, b.it.text, b.it.href);
    card.reset.hidden = false;
    const L = weakLayer();
    if (L < 0) return;
    if (reduced.matches) { collapse(L); return; }
    // a moment of hope: the tower sways, then gives way
    setTimeout(() => root.classList.add('is-wobbling'), 450);
    setTimeout(() => { root.classList.remove('is-wobbling'); collapse(L); }, 1350);
  };

  // ---- turning the tower by dragging, and telling a drag from a click ----
  let turn = -32, from = null, moved = 0;
  const apply = () => tower.style.setProperty('--ry', `${turn}deg`);
  stage.addEventListener('pointerdown', (e) => { from = e.clientX; moved = 0; });
  addEventListener('pointermove', (e) => {
    if (from === null) return;
    const dx = e.clientX - from;
    moved += Math.abs(dx);
    from = e.clientX;
    turn += dx * 0.4;
    apply();
  });
  addEventListener('pointerup', () => { from = null; });
  stage.addEventListener('click', (e) => {
    const el = e.target.closest('.blk');
    if (!el || (e.detail !== 0 && moved > 6)) return; // e.detail is 0 for keyboard presses
    const b = blocks.find((x) => x.el === el);
    if (b) pull(b);
  });
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { turn -= 15; apply(); }
    if (e.key === 'ArrowRight') { turn += 15; apply(); }
  });
  card.reset.addEventListener('click', build);

  root.classList.add('is-live');
  apply();
  build();
})();
