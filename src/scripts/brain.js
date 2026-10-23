// The brain on the first screen: a slowly turning cloud of neurons drawn on a canvas, no library.
// On arrival the neurons fly in from all around and settle into two hemispheres; each link forms once both
// of its ends have arrived, with a signal sent across it, and afterwards it keeps making new links now and then.
// A handful of the neurons are real things from the site (projects, interests, writing) and carry their names.
// When a question or an answer in the chat mentions one, that neuron fires and the signal spreads.
// Other scripts trigger it with:  window.dispatchEvent(new CustomEvent('brain:fire', { detail: text }))

(() => {
  const canvas = document.getElementById('brain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

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
  ];

  // ---- a seeded random, so the brain has the same shape on every visit ----
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // forming: every neuron flies in from somewhere around the screen; the named ones arrive last
  const T0 = performance.now();
  const FORMED = 3800; // ms after load by which everything has arrived
  const ease = (t) => 1 - (1 - t) ** 3;

  let W = 0, H = 0, R = 0, dpr = 1;
  let points = [], edges = [], neighbours = [], topics = [], pulses = [];
  let extra = 0; // links made after forming

  // Points inside two slightly separated hemispheres, denser near the surface, like a cortex.
  const build = () => {
    seed = 7;
    const count = W < 640 ? 170 : 280;
    points = [];
    while (points.length < count) {
      const x = rand() * 2 - 1, y = rand() * 2 - 1, z = rand() * 2 - 1;
      const d = x * x / 1.0 + y * y / 0.62 + z * z / 0.8;
      if (d > 1 || d < 0.35 || Math.abs(x) < 0.06) continue; // shell only, with the fissure down the middle
      // where it flies in from: a random direction, well outside the brain
      const u = rand() * 2 - 1, a = rand() * Math.PI * 2, far = 2.2 + rand() * 1.6, ring = Math.sqrt(1 - u * u);
      points.push({
        tx: x * 1.25, ty: y * 0.95 - 0.05, tz: z,
        sx: ring * Math.cos(a) * far, sy: u * far, sz: ring * Math.sin(a) * far,
        delay: rand() * 1500, dur: 1200 + rand() * 700,
        x: 0, y: 0, z: 0, seen: 0, here: false, glow: 0, topic: null,
      });
    }
    // connect each neuron to its nearest few
    edges = [];
    neighbours = points.map(() => []);
    points.forEach((p, i) => {
      const near = points
        .map((q, j) => [j, (p.tx - q.tx) ** 2 + (p.ty - q.ty) ** 2 + (p.tz - q.tz) ** 2])
        .filter(([j]) => j !== i)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);
      for (const [j, d2] of near) {
        if (d2 > 0.16) continue;
        if (!neighbours[i].includes(j)) { neighbours[i].push(j); neighbours[j].push(i); edges.push({ i, j, born: null }); }
      }
    });
    // the named neurons: as far from each other as possible (so their names don't pile up), arriving after the rest
    const picked = [points.reduce((best, q, i) => (q.tx > points[best].tx ? i : best), 0)];
    while (picked.length < TOPICS.length) {
      let best = 0, bestD = -1;
      points.forEach((q, i) => {
        const d = Math.min(...picked.map((j) => (q.tx - points[j].tx) ** 2 + (q.ty - points[j].ty) ** 2 + (q.tz - points[j].tz) ** 2));
        if (d > bestD) { bestD = d; best = i; }
      });
      picked.push(best);
    }
    pulses = [];
    topics = TOPICS.map(([id, label, re], k) => {
      const i = picked[k];
      points[i].topic = id;
      points[i].delay = 1700 + k * 70;
      return { id, label, re, i };
    });
    extra = 0;
    form(performance.now(), true);
  };

  // move every neuron along its path in, and grow the links whose ends have both arrived
  let formed = false;
  const form = (now, quiet = false) => {
    const t = now - T0;
    if (reduced.matches || t > FORMED + 2000) {
      if (!formed || quiet) {
        for (const p of points) { p.x = p.tx; p.y = p.ty; p.z = p.tz; p.seen = 1; p.here = true; }
        for (const e of edges) if (e.born === null) e.born = -1e9;
      }
      formed = true;
      return;
    }
    for (const p of points) {
      const k = Math.max(0, Math.min(1, (t - p.delay) / p.dur));
      const e = ease(k);
      p.x = p.sx + (p.tx - p.sx) * e; p.y = p.sy + (p.ty - p.sy) * e; p.z = p.sz + (p.tz - p.sz) * e;
      p.seen = Math.min(1, k * 2);
      if (k >= 1 && !p.here) {
        p.here = true;
        if (p.topic) p.glow = 1; // a named neuron lights up as it lands, and shows its name
      }
    }
    for (const e of edges) {
      if (e.born !== null || !points[e.i].here || !points[e.j].here) continue;
      e.born = now;
      if (!quiet && Math.random() < 0.3) pulses.push({ from: e.i, to: e.j, t0: now, dur: 380, hops: 0, power: 0.55 });
    }
  };

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

  // how far the page has scrolled from the opening towards the chat (0 → 1): the brain dims and its names fade
  // and once the chat is scrolling away, the brain goes with it rather than sitting behind the cube
  let p = 0;
  const mind = canvas.parentElement;
  const scrolled = () => {
    p = Math.max(0, Math.min(1, scrollY / (innerHeight * 0.85)));
    const leaving = Math.max(0, Math.min(1, (mind.getBoundingClientRect().bottom - innerHeight * 0.35) / (innerHeight * 0.65)));
    canvas.style.opacity = String((1 - 0.3 * p) * leaving);
  };

  // ---- turning, the pointer, and drawing ----
  let angle = 0.6, tilt = -0.18, targetX = 0, targetY = 0, lookX = 0, lookY = 0;
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
    // synapses: each fades in from the moment it formed
    ctx.lineWidth = 1;
    for (const e of edges) {
      if (e.born === null) continue;
      const grow = Math.min(1, (now - e.born) / 600);
      const a = P[e.i], b = P[e.j];
      const lit = Math.max(points[e.i].glow, points[e.j].glow);
      const depth = (2 - (a.z + b.z) / 2) / 3;
      ctx.strokeStyle = lit > 0.05 ? `rgba(${C.glow}, ${(0.18 + lit * 0.6) * grow})` : `rgba(255, 255, 255, ${(0.05 + depth * 0.07) * grow})`;
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
      const r = (n.topic ? 2.6 : 1.4) * q.f + n.glow * 3;
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
    // names: every named neuron shows its name on the opening screen; further down, only the ones firing
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
    form(now);
    draw(now);
    const busy = !formed || pulses.length || points.some((q) => q.glow > 0.05);
    if (visible && !document.hidden && (!reduced.matches || busy)) raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };

  // a quiet heartbeat: now and then a random neuron fires on its own
  setInterval(() => {
    if (!formed || !visible || document.hidden || reduced.matches) return;
    const i = Math.floor(Math.random() * points.length);
    points[i].glow = 0.7;
    spread(i, 1, 0.5, performance.now());
  }, 900);

  // and it keeps learning: every so often two nearby neurons that weren't linked make a new link
  setInterval(() => {
    if (!formed || !visible || document.hidden || reduced.matches || extra >= 90) return;
    const i = Math.floor(Math.random() * points.length), a = points[i];
    let best = -1, bestD = 0.3;
    points.forEach((b, j) => {
      if (j === i || neighbours[i].includes(j)) return;
      const d2 = (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2 + (a.tz - b.tz) ** 2;
      if (d2 < bestD) { bestD = d2; best = j; }
    });
    if (best < 0) return;
    const now = performance.now();
    neighbours[i].push(best); neighbours[best].push(i);
    edges.push({ i, j: best, born: now });
    extra++;
    a.glow = 0.9;
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

  scrolled();
  size();
  if (reduced.matches) draw(performance.now());
  wake();
})();
