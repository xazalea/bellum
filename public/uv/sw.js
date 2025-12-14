importScripts('uv.bundle.js');
importScripts('uv.config.js');
importScripts(__uv$config.sw || 'uv.sw.js');

// Wrapper SW used by Cherri-style UIs (expects /uv/sw.js to exist).
// We intentionally reuse our root UV config/prefix (/service/uv/).
const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      if (uv.route(event)) return await uv.fetch(event);
      return await fetch(event.request);
    })(),
  );
});
