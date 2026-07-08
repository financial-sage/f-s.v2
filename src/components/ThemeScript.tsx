/**
 * Applies theme class early to avoid a flash.
 * Storage key: fsage:theme = 'light' | 'dark' | 'system'
 */
export function ThemeScript() {
  const code = `
(function () {
  try {
    var key = 'fsage:theme';
    var stored = localStorage.getItem(key) || 'system';
    var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
  } catch (e) {}
})();`;

  return <script id="fsage-theme" dangerouslySetInnerHTML={{ __html: code }} />;
}

