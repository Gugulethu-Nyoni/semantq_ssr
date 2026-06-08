// packages/@semantq/ssr/lib/Hydration.js

export function injectHydrationState(html, data, meta = {}) {
  const stateId = 'semantqql-ssr-state';
  
  const stateScript = `
    <script type="application/json" id="${stateId}">
      ${JSON.stringify({ data, meta, timestamp: Date.now() })}
    </script>
    <script>
      (function() {
        const el = document.getElementById('${stateId}');
        if (el) {
          try {
            const state = JSON.parse(el.textContent);
            el.remove();
            window.dispatchEvent(new CustomEvent('semantqql:hydrate', { detail: state }));
          } catch(e) {
            console.warn('SSR hydration failed:', e);
          }
        }
      })();
    </script>
  `;
  
  return html.replace('</body>', `${stateScript}</body>`);
}