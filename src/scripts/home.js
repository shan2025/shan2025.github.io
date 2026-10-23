// Home page behaviour besides the map. Everything works without it; it adds the reveals and a
// friendlier email from the contact form.

// Reveal once, as each part comes into view.
(() => {
  const targets = [...document.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );
  targets.forEach((el) => io.observe(el));
})();

// Contact form: open the visitor's email app with a readable message instead of raw form data.
(() => {
  const form = document.querySelector('form[data-mailto]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new FormData(form);
    const subject = `A note from ${d.get('name')}`;
    const body = `${d.get('message')}\n\n${d.get('name')}\n${d.get('email')}`;
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
