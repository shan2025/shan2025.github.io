// The neurons on the first screen, drawn on a canvas, no library.
// On arrival they fly in from all around and settle into a brain; each link forms once both of its ends have
// arrived, with a signal sent across it. Then, like a brain rewiring itself, they let go of their links, drift
// into a new shape (an idea: a light bulb) and wire up again, before coming back to the brain.
// A handful of the neurons are real things from the site (projects, interests, writing) and carry their names.
// When a question or an answer in the chat mentions one, that neuron fires and the signal spreads.
// Other scripts trigger it with:  window.dispatchEvent(new CustomEvent('brain:fire', { detail: text }))

(() => {
  const canvas = document.getElementById('brain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mind = canvas.parentElement;

  // ---- the topics a conversation can light up: [id, label, pattern] ----
  const TOPICS = [
    ['finchat', 'FinChat', /finchat|plato|aurelius|rasha|nova|sentinel|agent|telegram|brief/i],
    ['hancod', 'Hancod', /hancod|growth manager|business analyst|intern/i],
    ['wallet', 'Wallet risk', /wallet|crypto/i],
    ['falcon', 'Falcon 9', /falcon|spacex|landing|capstone/i],
    ['mock', 'Mock interviews', /mock interview|interview system|placement/i],
    ['certs', 'Certifications', /certif|coursera|ibm|anthropic academy|course/i],
    ['fintech', 'Fintech', /fintech|financial|finance|mba/i],
    ['ai', 'AI agents', /\bai\b|agent|llm|rag|model context|mcp|generative/i],
    ['evals', 'Evals', /eval|recall|accuracy|worked|test/i],
    ['growth', 'Growth', /growth|acquisition|conversion|marketing/i],
    ['product', 'Product', /product|spec|fsd|frd|requirement|roadmap|uat/i],
    ['data', 'Data', /data|sql|python|power bi|tableau|machine learning|ml\b/i],
    ['writing', 'Writing', /writ|post|blog|note|substack|article/i],
    ['hire', 'Say hello', /hire|hiring|role|job|contact|email|reach|open to|résumé|resume|cv/i],
    ['psychology', 'Psychology', /psycholog|behaviou?r|bias|decision/i],
    ['neuro', 'Neuroscience', /neuro|brain|cognit/i],
    ['philosophy', 'Philosophy', /philosoph|ethic|conscious|meaning/i],
  ];

  // ---- a seeded random, so the shapes are the same on every visit ----
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const T0 = performance.now();
  const ease = (t) => 1 - (1 - t) ** 3;

  // ---- the shapes the neurons can take, each as one target point per neuron ----
  // a brain: two slightly separated hemispheres, denser near the surface, like a cortex
  const brainShape = (n) => {
    const pts = [];
    while (pts.length < n) {
      const x = rand() * 2 - 1, y = rand() * 2 - 1, z = rand() * 2 - 1;
      const d = x * x / 1.0 + y * y / 0.62 + z * z / 0.8;
      if (d > 1 || d < 0.35 || Math.abs(x) < 0.06) continue; // shell only, with the fissure down the middle
      pts.push([x * 1.25, y * 0.95 - 0.05, z]);
    }
    return pts;
  };
  // an idea: a light bulb, with its glass, a screw base and a filament
  const bulbShape = (n) => {
    const pts = [];
    while (pts.length < n) {
      const r = rand();
      if (r < 0.68) {
        const u = rand() * 2 - 1, a = rand() * Math.PI * 2, ring = Math.sqrt(1 - u * u);
        if (u > 0.72) continue; // open at the bottom, where the neck joins
        const k = 0.78 + rand() * 0.05;
        pts.push([ring * Math.cos(a) * k, -0.32 + u * k, ring * Math.sin(a) * k]);
      } else if (r < 0.9) {
        const a = rand() * Math.PI * 2, band = Math.floor(rand() * 4);
        pts.push([Math.cos(a) * (0.36 - band * 0.025), 0.36 + band * 0.12 + (rand() - 0.5) * 0.03, Math.sin(a) * (0.36 - band * 0.025)]);
      } else {
        const t = rand();
        pts.push([(t - 0.5) * 0.5, -0.22 + Math.abs(Math.sin(t * Math.PI * 4)) * 0.18, (rand() - 0.5) * 0.05]);
      }
    }
    return pts.map(([x, y, z]) => [x * 0.9, y * 0.9, z * 0.9]);
  };
  // the links of a shape: each neuron to its nearest few
  const wire = (pts, maxD2) => {
    const edges = [], neighbours = pts.map(() => []);
    pts.forEach((p, i) => {
      const near = pts
        .map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2])
        .filter(([j]) => j !== i)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);
      for (const [j, d2] of near) {
        if (d2 > maxD2 || neighbours[i].includes(j)) continue;
        neighbours[i].push(j); neighbours[j].push(i); edges.push([i, j]);
      }
    });
    return { edges, neighbours };
  };

  let W = 0, H = 0, R = 0, dpr = 1;
  let points = [], shapes = [], links = [], neighbours = [], topics = [], pulses = [];
  let shape = 0, settled = false, extra = 0;
  let angle = 0.6, tilt = -0.18, targetX = 0, targetY = 0, lookX = 0, lookY = 0;

  const build = () => {
    seed = 7;
    const n = W < 640 ? 170 : 280;
    const brain = brainShape(n);
    shapes = [
      { pts: brain, facing: false, ...wire(brain, 0.16) }, // turns slowly in space
      { pts: bulbShape(n), facing: true }, // always faces you
    ];
    for (const s of shapes.slice(1)) Object.assign(s, wire(s.pts, 0.08));
    // every neuron starts somewhere well outside, and flies in
    points = brain.map(() => {
      const u = rand() * 2 - 1, a = rand() * Math.PI * 2, far = 2.2 + rand() * 1.6, ring = Math.sqrt(1 - u * u);
      const sx = ring * Math.cos(a) * far, sy = u * far, sz = ring * Math.sin(a) * far;
      return { x: sx, y: sy, z: sz, sx, sy, sz, m0: reduced.matches ? -1e9 : T0, delay: rand() * 1500, dur: 1200 + rand() * 700, seen: 0, here: false, glow: 0, topic: null };
    });
    // the named neurons: as far from each other as possible (so their names don't pile up), arriving after the rest
    const picked = [brain.reduce((best, q, i) => (q[0] > brain[best][0] ? i : best), 0)];
    while (picked.length < TOPICS.length) {
      let best = 0, bestD = -1;
      brain.forEach((q, i) => {
        const d = Math.min(...picked.map((j) => (q[0] - brain[j][0]) ** 2 + (q[1] - brain[j][1]) ** 2 + (q[2] - brain[j][2]) ** 2));
        if (d > bestD) { bestD = d; best = i; }
      });
      picked.push(best);
    }
    topics = TOPICS.map(([id, label, re], k) => {
      const i = picked[k];
      points[i].topic = id;
      points[i].delay = 1700 + k * 70;
      return { id, label, re, i };
    });
    shape = 0; extra = 0; pulses = [];
    neighbours = shapes[0].neighbours.map((a) => a.slice());
    links = shapes[0].edges.map(([i, j]) => ({ i, j, born: null, dying: null }));
    form(performance.now(), true);
  };

  // where neuron i is heading: its point in the current shape (turned to face you, for the shapes that do)
  const target = (i) => {
    const s = shapes[shape], q = s.pts[i];
    if (!s.facing) return q;
    const c = Math.cos(angle), n = Math.sin(angle);
    return [q[0] * c - q[2] * n, q[1], q[0] * n + q[2] * c];
  };

  // move every neuron along its path, grow the links whose ends have both arrived, let go of the old ones
  const form = (now, quiet = false) => {
    let all = true;
    points.forEach((p, i) => {
      const k = Math.max(0, Math.min(1, (now - p.m0 - p.delay) / p.dur));
      const e = ease(k), [tx, ty, tz] = target(i);
      p.x = p.sx + (tx - p.sx) * e; p.y = p.sy + (ty - p.sy) * e; p.z = p.sz + (tz - p.sz) * e;
      p.seen = Math.max(p.seen, Math.min(1, k * 2));
      if (k < 1) all = false;
      else if (!p.here) {
        p.here = true;
        if (p.topic && shape === 0) p.glow = 1; // a named neuron lights up as it lands, and shows its name
      }
    });
    for (const l of links) {
      if (l.born !== null || l.dying !== null || !points[l.i].here || !points[l.j].here) continue;
      l.born = quiet || reduced.matches ? -1e9 : now;
      if (!quiet && Math.random() < 0.3) pulses.push({ from: l.i, to: l.j, t0: now, dur: 380, hops: 0, power: 0.55 });
    }
    links = links.filter((l) => l.dying === null || now - l.dying < 500);
    settled = all;
  };

  // neuroplasticity: drop the links, drift into shape k, wire up again
  const morph = (k, now) => {
    if (k === shape) return;
    for (const l of links) if (l.dying === null) l.dying = now;
    shape = k;
    for (const p of points) {
      p.sx = p.x; p.sy = p.y; p.sz = p.z;
      p.m0 = now; p.delay = Math.random() * 500; p.dur = 900 + Math.random() * 500; p.here = false;
    }
    neighbours = shapes[k].neighbours.map((a) => a.slice());
    links.push(...shapes[k].edges.map(([i, j]) => ({ i, j, born: null, dying: null })));
    settled = false;
  };

  // the shapes it steps through, one per click: brain → idea → brain → …
  const ORDER = [1, 0];
  let step = 0;
  const plasticity = (now) => {
    // below the opening it always settles back to a brain; the click-driven changes only happen up top
    if (p > 0.2 && shape !== 0) { morph(0, now); step = 0; }
  };
  // a click on the brain (while it's the opening and has settled) reshapes it to the next form
  const reshape = () => {
    if (reduced.matches || p > 0.2 || !settled) return;
    morph(ORDER[step++ % ORDER.length], performance.now());
    wake();
  };
  canvas.addEventListener('click', reshape);

  const colours = () => {
    const cs = getComputedStyle(document.documentElement);
    return { accent: cs.getPropertyValue('--accent').trim() || '#fcd34d', glow: cs.getPropertyValue('--g2').trim() || '245, 158, 11', ink: cs.getPropertyValue('--ink').trim() || '#f6f2ea' };
  };
  let C = colours();

  const size = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W * 0.38, H * 0.34, 440);
    build();
  };

  // how far the page has scrolled from the opening towards the chat (0 → 1). The page uses it (as --p) to
  // fade the opening out and bring the chat and the glow in; the brain dims, and leaves with the chat.
  let p = 0;
  const scrolled = () => {
    p = Math.max(0, Math.min(1, scrollY / (innerHeight * 0.85)));
    mind.parentElement.style.setProperty('--p', p.toFixed(3));
    const leaving = Math.max(0, Math.min(1, (mind.getBoundingClientRect().bottom - innerHeight * 0.35) / (innerHeight * 0.65)));
    canvas.style.opacity = String((1 - 0.3 * p) * leaving);
    wake();
  };

  // ---- drawing ----
  const project = (q) => {
    const ay = angle + lookX * 0.5, ax = tilt + lookY * 0.3;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const x1 = q.x * cy + q.z * sy, z1 = -q.x * sy + q.z * cy;
    const y1 = q.y * cx - z1 * sx, z2 = q.y * sx + z1 * cx;
    const f = 3 / (3 + Math.max(-2.4, z2));
    return { x: W / 2 + x1 * R * f, y: H * 0.4 + y1 * R * f, z: z2, f };
  };

  const draw = (now) => {
    ctx.clearRect(0, 0, W, H);
    const P = points.map(project);
    // synapses: each grows from the moment it formed, and fades as it's let go
    ctx.lineWidth = 1;
    for (const l of links) {
      if (l.born === null) continue;
      const grow = Math.min(1, (now - l.born) / 600);
      const fade = l.dying === null ? 1 : Math.max(0, 1 - (now - l.dying) / 500);
      const a = P[l.i], b = P[l.j];
      const lit = Math.max(points[l.i].glow, points[l.j].glow);
      const depth = (2 - (a.z + b.z) / 2) / 3;
      const alpha = (lit > 0.05 ? 0.18 + lit * 0.6 : 0.05 + depth * 0.07) * grow * fade;
      ctx.strokeStyle = lit > 0.05 ? `rgba(${C.glow}, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * grow, a.y + (b.y - a.y) * grow); ctx.stroke();
    }
    // signals travelling along synapses
    pulses = pulses.filter((s) => {
      const t = (now - s.t0) / s.dur;
      if (t >= 1) { points[s.to].glow = Math.max(points[s.to].glow, s.power); if (s.hops > 0) spread(s.to, s.hops - 1, s.power * 0.7, now); return false; }
      if (t < 0) return true;
      const a = P[s.from], b = P[s.to];
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.2, 0, Math.PI * 2); ctx.fill();
      return true;
    });
    // neurons, back to front
    const order = P.map((_, i) => i).sort((a, b) => P[b].z - P[a].z);
    for (const i of order) {
      const q = P[i], n = points[i];
      if (!n.seen) continue;
      const depth = Math.max(0, Math.min(1, (2 - q.z) / 3));
      const r = (n.topic && shape === 0 ? 2.6 : 1.4) * q.f + n.glow * 3;
      ctx.fillStyle = n.glow > 0.05 ? C.accent : `rgba(255, 255, 255, ${0.25 + depth * 0.45})`;
      ctx.globalAlpha = (n.glow > 0.05 ? 0.5 + n.glow * 0.5 : 1) * n.seen;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
      if (n.glow > 0.05) {
        ctx.globalAlpha = n.glow * 0.25;
        ctx.beginPath(); ctx.arc(q.x, q.y, r * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      n.glow *= 0.965;
    }
    // names: in the brain, every named neuron shows its name on the opening screen; further down, only the ones firing
    if (shape !== 0) return;
    ctx.font = `600 ${W < 640 ? 10.5 : 13}px Switzer, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (const t of topics) {
      const n = points[t.i];
      if (!n.here) continue;
      const alpha = Math.max(Math.min(1, n.glow * 1.4), 0.6 * (1 - p));
      if (alpha < 0.05) continue;
      const q = P[t.i];
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillText(t.label, q.x, q.y - 12);
    }
  };

  const spread = (i, hops, power, now) => {
    for (const j of neighbours[i]) {
      pulses.push({ from: i, to: j, t0: now + Math.random() * 120, dur: 420 + Math.random() * 260, hops, power });
    }
  };

  // ---- firing from conversation text ----
  const fireText = (text) => {
    if (!text) return;
    const now = performance.now();
    const hits = topics.filter((t) => t.re.test(text));
    for (const t of hits.slice(0, 4)) {
      points[t.i].glow = 1;
      if (!reduced.matches) spread(t.i, 3, 0.85, now);
    }
    wake();
  };
  window.addEventListener('brain:fire', (e) => fireText(String(e.detail || '')));

  // ---- the frame loop, paused when the brain is off screen or the tab is hidden ----
  let raf = 0, visible = true, last = performance.now();
  const loop = (now) => {
    raf = 0;
    const dt = Math.min(64, now - last); last = now;
    if (!reduced.matches) angle += dt * 0.00008;
    lookX += (targetX - lookX) * 0.05; lookY += (targetY - lookY) * 0.05;
    plasticity(now);
    form(now);
    draw(now);
    const busy = !settled || pulses.length || points.some((q) => q.glow > 0.05);
    if (visible && !document.hidden && (!reduced.matches || busy)) raf = requestAnimationFrame(loop);
  };
  function wake() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  // a quiet heartbeat: now and then a random neuron fires on its own
  setInterval(() => {
    if (!settled || !visible || document.hidden || reduced.matches) return;
    const i = Math.floor(Math.random() * points.length);
    points[i].glow = 0.7;
    spread(i, 1, 0.5, performance.now());
  }, 900);

  // and while it's a brain it keeps learning: now and then two nearby neurons that weren't linked make a link
  setInterval(() => {
    if (shape !== 0 || !settled || !visible || document.hidden || reduced.matches || extra >= 90) return;
    const brain = shapes[0].pts, i = Math.floor(Math.random() * points.length), a = brain[i];
    let best = -1, bestD = 0.3;
    brain.forEach((b, j) => {
      if (j === i || neighbours[i].includes(j)) return;
      const d2 = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      if (d2 < bestD) { bestD = d2; best = j; }
    });
    if (best < 0) return;
    const now = performance.now();
    neighbours[i].push(best); neighbours[best].push(i);
    links.push({ i, j: best, born: now, dying: null });
    extra++;
    points[i].glow = 0.9;
    pulses.push({ from: i, to: best, t0: now, dur: 600, hops: 1, power: 0.8 });
    wake();
  }, 1600);

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    targetX = (e.clientX / innerWidth - 0.5) * 2;
    targetY = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  addEventListener('scroll', scrolled, { passive: true });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  new ResizeObserver(() => { size(); C = colours(); if (reduced.matches) draw(performance.now()); wake(); }).observe(canvas);

  size();
  scrolled();
  if (reduced.matches) draw(performance.now());
  wake();
})();
