/* Small same-origin MedBook theme bridge, only active when embedded. */
(() => {
  let parentBody;
  try {
    if (window.parent === window || window.parent.location.origin !== window.location.origin) return;
    parentBody = window.parent.document.body;
  } catch (_) { return; }
  const root = document.documentElement;
  root.classList.add('medbook-embedded');
  const sync = () => {
    const theme = parentBody.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    if (root.getAttribute('data-theme') !== theme) root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  };
  sync();
  new MutationObserver(sync).observe(parentBody, { attributes:true, attributeFilter:['data-theme'] });
  // SnapText's own theme toggle may update its root. The host theme is authoritative.
  new MutationObserver(sync).observe(root, { attributes:true, attributeFilter:['data-theme'] });
})();
