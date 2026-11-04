// Tabs in the panel under the hero: click or use the arrow keys. Without script every pane is shown.
(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return;
  const show = (tab, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
  };
  show(tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0]);
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => {
      show(t);
      // on a phone the tabs slide sideways: bring the chosen one fully into view, without moving the page
      const row = t.parentElement;
      row.scrollTo({ left: t.offsetLeft - row.offsetLeft - (row.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
    });
    t.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      show(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });
})();
