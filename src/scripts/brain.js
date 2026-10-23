// The brain behind "Ask anything": a slowly turning cloud of neurons drawn on a canvas, no library.
// A handful of the neurons are real things from the site (projects, interests, writing). When a question
// or an answer mentions one, that neuron fires and the signal spreads to its neighbours.
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

  let W = 0, H = 0, R = 0, dpr = 1;
  let points = [], edges = [], neighbours = [], topics = [], pulses = [];

  // Points inside two slightly separated hemispheres, denser near the surface, like a cortex.
  const build = () => {
    seed = 7;
    const count = W < 640 ? 170 : 280;
    points = [];
    while (points.length < count) {
      const x = rand() * 2 - 1, y = rand() * 2 - 1, z = rand() * 2 - 1;
      const d = x * x / 1.0 + y * y / 0.62 + z * z / 0.8;
      if (d > 1 || d < 0.35 || Math.abs(x) < 0.06) continue; // shell only, with the fissure down the middle
      points.push({ x: x * 1.25, y: y * 0.95 - 0.05, z, glow: 0, topic: null });
    }
    // connect each neuron to its nearest few
    edges = [];
    neighbours = points.map(() => []);
    points.forEach((p, i) => {
      const near = points
        .map((q, j) => [j, (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2])
        .filter(([j]) => j !== i)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);
      for (const [j, d2] of near) {
        if (d2 > 0.16) continue;
        if (!neighbours[i].includes(j)) { neighbours[i].push(j); neighbours[j].push(i); edges.push([i, j]); }
      }
    });
    // the named neurons: spread out across the brain, on the surface side
    topics = TOPICS.map(([id, label, re], k) => {
      const i = Math.floor((k + 0.5) / TOPICS.length * points.length);
      points[i].topic = id;
      return { id, label, re, i };
    });
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
    R = Math.min(W * 0.36, H * 0.42, 460);
    build();
  };

  // ---- turning, the pointer, and drawing ----
  let angle = 0.6, tilt = -0.18, targetX = 0, targetY = 0, lookX = 0, lookY = 0;
  const project = (p) => {
    const ay = angle + lookX * 0.5, ax = tilt + lookY * 0.3;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
    const y1 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
    const f = 3 / (3 + z2);
    return { x: W / 2 + x1 * R * f, y: H * 0.38 + y1 * R * f, z: z2, f };
  };

  const draw = (now) => {
    ctx.clearRect(0, 0, W, H);
    const P = points.map(project);
    // synapses
    ctx.lineWidth = 1;
    for (const [i, j] of edges) {
      const a = P[i], b = P[j];
      const lit = Math.max(points[i].glow, points[j].glow);
      const depth = (2 - (a.z + b.z) / 2) / 3;
      ctx.strokeStyle = lit > 0.05 ? `rgba(${C.glow}, ${0.18 + lit * 0.6})` : `rgba(255, 255, 255, ${0.05 + depth * 0.07})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
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
    const order = P.map((p, i) => i).sort((a, b) => P[b].z - P[a].z);
    for (const i of order) {
      const p = P[i], n = points[i];
      const depth = (2 - p.z) / 3;
      const r = (n.topic ? 2.6 : 1.4) * p.f + n.glow * 3;
      ctx.fillStyle = n.glow > 0.05 ? C.accent : `rgba(255, 255, 255, ${0.25 + depth * 0.45})`;
      ctx.globalAlpha = n.glow > 0.05 ? 0.5 + n.glow * 0.5 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (n.glow > 0.05) {
        ctx.globalAlpha = n.glow * 0.25;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      n.glow *= 0.965;
    }
    // names of the neurons that are firing
    ctx.font = '600 13px Switzer, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const t of topics) {
      const n = points[t.i];
      if (n.glow < 0.15) continue;
      const p = P[t.i];
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, n.glow * 1.4)})`;
      ctx.fillText(t.label, p.x, p.y - 12);
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
    draw(now);
    const busy = pulses.length || points.some((p) => p.glow > 0.05);
    if (visible && !document.hidden && (!reduced.matches || busy)) raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };

  // a quiet heartbeat: now and then a random neuron fires on its own
  setInterval(() => {
    if (!visible || document.hidden || reduced.matches) return;
    const i = Math.floor(Math.random() * points.length);
    points[i].glow = 0.7;
    spread(i, 1, 0.5, performance.now());
  }, 900);

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    targetX = (e.clientX / innerWidth - 0.5) * 2;
    targetY = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  new ResizeObserver(() => { size(); C = colours(); if (reduced.matches) draw(performance.now()); wake(); }).observe(canvas);

  size();
  if (reduced.matches) draw(performance.now());
  wake();
})();
