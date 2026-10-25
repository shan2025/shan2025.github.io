// The chess board section. The 3D scene (three.js, in board-scene.js) is heavy, so it loads quietly once the page
// itself has loaded (or sooner, if the section comes near). Without script or WebGL, the plain list inside the
// section shows instead.

const root = document.getElementById('board');
if (root) {
  let started = false;
  const load = () => {
    if (started) return;
    started = true;
    import('./board-scene.js').then((m) => m.start(root)).catch(() => root.classList.add('no-3d'));
  };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '1200px 0px' });
  io.observe(root);
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  if (document.readyState === 'complete') idle(load);
  else addEventListener('load', () => idle(load), { once: true });
}
