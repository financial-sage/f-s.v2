/**
 * Applies theme class + theme-color early to avoid a flash and to tint
 * Android PWA system chrome (status / nav bar) with the app background.
 * Storage key: fsage:theme = 'light' | 'dark' | 'system'
 */
export function ThemeScript() {
  const code = `
(function () {
  try {
    var key = 'fsage:theme';
    var light = '#f7f4ee';
    var dark = '#0f1729';
    var stored = localStorage.getItem(key) || 'system';
    var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    root.style.colorScheme = isDark ? 'dark' : 'light';
    var color = isDark ? dark : light;
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length) {
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', color);
    } else {
      var meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', color);
      document.head.appendChild(meta);
    }
  } catch (e) {}
})();`;

  return <script id="fsage-theme" dangerouslySetInnerHTML={{ __html: code }} />;
}
