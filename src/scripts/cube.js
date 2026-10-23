// The cube section. The 3D scene (three.js, in cube-scene.js) is heavy, so it only loads once the section is
// close to the screen; the rest of the page stays light. Without script or WebGL, the plain list inside the
// section shows instead.

const root = document.getElementById('cube');
if (root && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    import('./cube-scene.js').then((m) => m.start(root)).catch(() => {});
  }, { rootMargin: '800px 0px' });
  io.observe(root);
}
