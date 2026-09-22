(function () {
  try {
    var stored = localStorage.getItem('idp_theme');
    var valid = ['light', 'dark', 'system', 'high-contrast'];
    var mode = valid.indexOf(stored) !== -1 ? stored : 'light';
    var resolved = mode;
    if (mode === 'system') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.classList.add('theme-' + resolved);
    root.style.colorScheme = resolved === 'light' ? 'light' : 'dark';
  } catch (e) {
    document.documentElement.classList.add('theme-light');
  }
})();
