// The Jenga tower: every block is a project, a certificate, a skill or a note. Pull one out to read it.
// Pull a load-bearing one and everything above it falls: "it ran" until it didn't.
// Built with CSS 3D (no library). Blocks are real buttons, so the keyboard works too; without script
// the plain list inside the section shows instead.

(() => {
  const root = document.getElementById('jenga');
  const source = document.getElementById('jenga-data');
  if (!root || !source) return;
  const stage = root.querySelector('.jenga__stage');
  const tower = root.querySelector('.jenga__tower');
  const card = {
    box: root.querySelector('.jenga__card'),
    kind: root.querySelector('.jenga__kind'),
    title: root.querySelector('.jenga__title'),
    text: root.querySelector('.jenga__text'),
    link: root.querySelector('.jenga__link'),
    reset: root.querySelector('.jenga__reset'),
    count: root.querySelector('.jenga__count'),
  };
  const intro = { kind: card.kind.textContent, title: card.title.textContent, text: card.text.textContent };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const items = JSON.parse(source.textContent);
  const PER = 3;
  const layers = Math.ceil(items.length / PER);

  // ---- build the tower: layers alternate direction, three blocks each ----
  const faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  let blocks = [];
  const build = () => {
    tower.replaceChildren();
    blocks = items.map((it, k) => {
      const layer = Math.floor(k / PER), slot = k % PER;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `blk blk--${it.type}`;
      el.setAttribute('aria-label', `${it.title}. ${it.kind}. Pull this block out.`);
      el.style.setProperty('--layer', layer);
      el.style.setProperty('--slot', slot - 1);
      el.style.setProperty('--turn', layer % 2 ? '90deg' : '0deg');
      for (const f of faces) {
        const face = document.createElement('span');
        face.className = `blk__face blk__${f}`;
        if (f === 'front' || f === 'back') face.textContent = it.title;
        el.append(face);
      }
      tower.append(el);
      return { el, it, layer, slot, out: false, fallen: false };
    });
    root.classList.remove('is-fallen');
    root.style.setProperty('--layers', layers);
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
  // or when only one outer block is left (real Jenga: the middle alone, or both sides, still hold).
  const weakLayer = () => {
    const top = Math.max(...blocks.filter((b) => !b.out).map((b) => b.layer));
    for (let L = 0; L < top; L++) {
      const left = blocks.filter((b) => b.layer === L && !b.out);
      if (!left.length) return L;
      if (left.length === 1 && left[0].slot !== 1) return L;
    }
    return -1;
  };

  const collapse = (L) => {
    root.classList.add('is-fallen');
    const falling = blocks.filter((b) => !b.out && b.layer >= L);
    falling.forEach((b, n) => {
      const spread = 1 + Math.min(4, b.layer - L) * 0.25;
      b.fallen = true;
      b.el.style.setProperty('--fx', `${(Math.random() - 0.5) * 4.5 * spread}`);
      b.el.style.setProperty('--fz', `${(Math.random() - 0.5) * 3.5 * spread}`);
      b.el.style.setProperty('--fr', `${(Math.random() - 0.5) * 140}deg`);
      b.el.style.setProperty('--ft', `${(Math.random() - 0.5) * 70}deg`);
      b.el.style.setProperty('--delay', `${reduced.matches ? 0 : (b.layer - L) * 60 + n * 8}ms`);
      b.el.classList.add('is-fallen');
      b.el.disabled = true;
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
    if (L >= 0) setTimeout(() => collapse(L), reduced.matches ? 0 : 650);
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
