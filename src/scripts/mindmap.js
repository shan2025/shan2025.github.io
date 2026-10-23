// The map of ideas in the hero. Every point is something on this site; every line is a real connection.
// Visitors can drag points, click one to read about it, and drop one point on another to make their own
// connection (kept in their browser only). Without script, the plain list of links in the figure shows instead.

(() => {
  const svg = document.getElementById('map');
  const source = document.getElementById('map-data');
  if (!svg || !source) return;

  const NS = 'http://www.w3.org/2000/svg';
  const STORE = 'shadin-map-links';
  const figure = svg.closest('.map');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (id) => document.getElementById(id);
  const card = { title: $('map-title'), text: $('map-text'), link: $('map-link'), count: $('map-count'), reset: $('map-reset') };
  const intro = { title: card.title.textContent, text: card.text.textContent };
  const make = (tag, attrs = {}) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  const { nodes, links } = JSON.parse(source.textContent);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const RADIUS = { core: 20, hub: 11, leaf: 6.5 };
  const short = (s) => {
    if (s.length <= 24) return s;
    const cut = s.slice(0, 22);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  };

  // ---- connections: the site's own, plus the visitor's ----
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '[]');
      return saved.filter(([a, b]) => byId.has(a) && byId.has(b));
    } catch { return []; }
  };
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(mine)); } catch {} };
  let mine = load();
  let edges = [];
  const linked = (a, b) => edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));

  const gLinks = make('g');
  const gPulses = make('g');
  const gNodes = make('g');
  svg.append(gLinks, gPulses, gNodes);

  const buildEdges = () => {
    edges = [
      ...links.map(([a, b, s]) => ({ a, b, s: s ?? 1, user: false })),
      ...mine.map(([a, b]) => ({ a, b, s: 0.12, user: true })),
    ];
    gLinks.replaceChildren();
    for (const e of edges) {
      e.line = make('line', { class: `m-link${e.user ? ' is-user' : e.s < 1 ? ' is-weak' : ''}` });
      gLinks.append(e.line);
    }
    const n = mine.length;
    card.count.textContent = n ? `You’ve made ${n} connection${n === 1 ? '' : 's'}` : '';
    card.reset.hidden = !n;
  };

  for (const n of nodes) {
    n.r = RADIUS[n.kind];
    n.vx = 0; n.vy = 0;
    n.g = make('g', { class: `m-node is-${n.kind}`, tabindex: '0', role: 'button', 'aria-label': `${n.label}. ${n.text}` });
    n.dot = make('circle', { r: n.r });
    n.word = make('text', { y: n.kind === 'core' ? 7 : 5 });
    n.word.textContent = short(n.label);
    n.g.append(n.dot, n.word);
    gNodes.append(n.g);
  }
  buildEdges();

  // ---- layout: a small force simulation, settled before the first paint ----
  let W = 0, H = 0, alpha = 1;
  const size = () => {
    const r = svg.getBoundingClientRect();
    const oldW = W, oldH = H;
    W = Math.max(280, r.width); H = Math.max(320, r.height);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (oldW) for (const n of nodes) { n.x *= W / oldW; n.y *= H / oldH; }
  };
  const seed = () => {
    const cx = W / 2, cy = H / 2, m = Math.min(W, H);
    const hubs = nodes.filter((n) => n.kind !== 'core');
    nodes.forEach((n) => {
      if (n.kind === 'core') { n.x = cx; n.y = cy; return; }
      const i = hubs.indexOf(n);
      const a = (i / hubs.length) * Math.PI * 2;
      const d = (n.kind === 'hub' ? 0.22 : 0.38) * m;
      n.x = cx + Math.cos(a) * d; n.y = cy + Math.sin(a) * d;
    });
  };
  const rest = (e) => {
    const m = Math.sqrt(W * H);
    const ka = byId.get(e.a).kind, kb = byId.get(e.b).kind;
    if (e.user || e.s < 1) return 0.36 * m;
    if (ka === 'core' || kb === 'core') return 0.24 * m;
    return 0.15 * m;
  };
  const tick = () => {
    const K = W * H * 0.045;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        // the point in hand doesn't push the others away, or it could never be dropped on one
        if (a === held || b === held) continue;
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const f = (K / d2) * alpha;
        const d = Math.sqrt(d2);
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
    }
    for (const e of edges) {
      const a = byId.get(e.a), b = byId.get(e.b);
      if (a === held || b === held) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - rest(e)) * 0.03 * e.s * alpha;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
    }
    const cx = W / 2, cy = H / 2;
    for (const n of nodes) {
      if (n === held) { n.vx = 0; n.vy = 0; continue; }
      n.vx += (cx - n.x) * 0.003 * alpha;
      n.vy += (cy - n.y) * 0.003 * alpha;
      n.vx *= 0.78; n.vy *= 0.78;
      n.x += n.vx; n.y += n.vy;
      const padX = n.r + 24, padY = n.r + 18;
      n.x = Math.min(W - padX, Math.max(padX, n.x));
      n.y = Math.min(H - padY, Math.max(padY, n.y));
    }
    alpha = Math.max(0, alpha * 0.985);
  };
  const settle = (steps) => { for (let i = 0; i < steps; i++) tick(); };

  // ---- drawing ----
  const draw = () => {
    for (const e of edges) {
      const a = byId.get(e.a), b = byId.get(e.b);
      e.line.setAttribute('x1', a.x.toFixed(1)); e.line.setAttribute('y1', a.y.toFixed(1));
      e.line.setAttribute('x2', b.x.toFixed(1)); e.line.setAttribute('y2', b.y.toFixed(1));
    }
    for (const n of nodes) {
      n.g.setAttribute('transform', `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`);
      if (W < 600 && n.kind !== 'leaf') {
        // narrow screens: the big points carry their names underneath, where they can't collide sideways
        n.word.setAttribute('x', 0);
        n.word.setAttribute('y', n.r + 18);
        n.word.setAttribute('text-anchor', 'middle');
        continue;
      }
      const left = n.x > W * 0.62;
      n.word.setAttribute('x', left ? -(n.r + 9) : n.r + 9);
      n.word.setAttribute('y', n.kind === 'core' ? 7 : 5);
      n.word.setAttribute('text-anchor', left ? 'end' : 'start');
    }
    const now = performance.now();
    pulses = pulses.filter((p) => {
      const t = (now - p.t0) / p.dur;
      if (t >= 1) { p.dot.remove(); return false; }
      const a = byId.get(p.from), b = byId.get(p.to);
      const k = t < 0 ? 0 : 1 - Math.pow(1 - t, 3);
      p.dot.setAttribute('cx', (a.x + (b.x - a.x) * k).toFixed(1));
      p.dot.setAttribute('cy', (a.y + (b.y - a.y) * k).toFixed(1));
      p.dot.setAttribute('opacity', t < 0 ? 0 : 1);
      return true;
    });
  };

  // ---- the frame loop runs only while something is moving ----
  let frame = 0, pulses = [];
  const loop = () => {
    frame = 0;
    if (alpha > 0.004) tick();
    draw();
    if (alpha > 0.004 || pulses.length || held) frame = requestAnimationFrame(loop);
  };
  const wake = (heat = 0) => {
    alpha = Math.max(alpha, heat);
    if (reduced.matches) { settle(240); draw(); return; }
    if (!frame) frame = requestAnimationFrame(loop);
  };

  // ---- signals travelling along the connections, like a neuron firing ----
  const fire = (id, delay = 0) => {
    if (reduced.matches) return;
    edges.forEach((e, i) => {
      if (e.a !== id && e.b !== id) return;
      const dot = make('circle', { class: 'm-pulse', r: 4, opacity: 0 });
      gPulses.append(dot);
      pulses.push({ dot, from: id, to: e.a === id ? e.b : e.a, t0: performance.now() + delay + i * 12, dur: 650 });
    });
    wake();
  };

  // ---- reading a point ----
  let picked = null;
  const neighbours = (id) => new Set(edges.flatMap((e) => (e.a === id ? [e.b] : e.b === id ? [e.a] : [])));
  const light = (id) => {
    const near = id ? neighbours(id) : new Set();
    figure.classList.toggle('is-focus', !!id);
    for (const n of nodes) n.g.classList.toggle('is-lit', !!id && (n.id === id || near.has(n.id)));
    for (const e of edges) e.line.classList.toggle('is-lit', !!id && (e.a === id || e.b === id));
  };
  const show = (title, text, href) => {
    card.title.textContent = title;
    card.text.textContent = text;
    card.link.hidden = !href;
    if (href) {
      card.link.href = href;
      card.link.textContent = href.startsWith('#') ? `Go to ${title}` : `Open ${title}`;
    }
  };
  const pick = (n) => {
    picked = n ? n.id : null;
    light(picked);
    if (n) { show(n.label, n.text, n.href); fire(n.id); }
    else show(intro.title, intro.text, null);
  };

  // ---- dragging, and dropping one point on another to connect them ----
  let held = null, start = null, moved = false, target = null;
  const point = (ev) => {
    const r = svg.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  };
  const nearest = (p, not) => {
    let best = null, bestD = Infinity;
    for (const n of nodes) {
      if (n === not) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < n.r + 22 && d < bestD) { best = n; bestD = d; }
    }
    return best;
  };
  for (const n of nodes) {
    n.g.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      held = n; start = point(ev); moved = false; target = null;
      svg.setPointerCapture(ev.pointerId);
      wake(0.3);
    });
    n.g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(n); }
    });
    n.g.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse' && !held) light(n.id); });
    n.g.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse' && !held) light(picked); });
  }
  svg.addEventListener('pointermove', (ev) => {
    if (!held) return;
    const p = point(ev);
    if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 5) return;
    moved = true;
    held.x = p.x; held.y = p.y;
    const t = nearest(p, held);
    if (t !== target) {
      target?.g.classList.remove('is-target');
      target = t;
      target?.g.classList.add('is-target');
    }
    wake(0.25);
  });
  const drop = () => {
    if (!held) return;
    const n = held;
    held = null;
    if (!moved) pick(n);
    else if (target) {
      target.g.classList.remove('is-target');
      if (!linked(n.id, target.id)) {
        mine.push([n.id, target.id]);
        save();
        buildEdges();
        picked = n.id;
        light(n.id);
        show(`${n.label} + ${target.label}`, 'Connected. Your connections stay in this browser, so the map is a little yours now.', null);
        fire(n.id);
      } else {
        show(`${n.label} + ${target.label}`, 'These two are already connected.', null);
      }
      target = null;
    }
    wake(0.5);
  };
  svg.addEventListener('pointerup', drop);
  svg.addEventListener('pointercancel', drop);
  // a press on empty ground clears the reading (a click event would land on the svg after capture)
  svg.addEventListener('pointerdown', (ev) => { if (ev.target === svg) pick(null); });
  card.reset.addEventListener('click', () => {
    mine = [];
    save();
    buildEdges();
    pick(null);
    wake(0.6);
  });

  // ---- size, first layout, and an occasional signal while the map is on screen ----
  size();
  seed();
  settle(420);
  alpha = 0;
  draw();
  new ResizeObserver(() => { size(); wake(0.4); if (reduced.matches) { settle(200); draw(); } }).observe(svg);

  let onScreen = true;
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(figure);
  setInterval(() => {
    if (!onScreen || document.hidden || held || reduced.matches) return;
    const quiet = nodes.filter((n) => n.kind !== 'leaf' || Math.random() < 0.3);
    fire(quiet[Math.floor(Math.random() * quiet.length)].id);
  }, 2400);
})();
