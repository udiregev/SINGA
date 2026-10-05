/* Singa app-shell service worker.
   Lets the PWA install reliably on tablets/phones and opens instantly on
   repeat visits. Only caches this app's own files (same-origin) — it never
   touches Supabase, Google Fonts, or the Supabase CDN script, so sign-in
   and data always go straight to the network.
   Bump CACHE_NAME whenever the shell file list changes, so old caches get
   cleaned up automatically on the next visit. */
const CACHE_NAME = 'singa-shell-v2';
const SHELL_FILES = [
  'singa-app.html',
  'singa-site.html',
  'manifest-app.json',
  'manifest-site.json',
  'singa-script-part1.js',
  'singa-script-part2.js',
  'singa-script-part3.js',
  'singa-script-part4.js',
  'singa-script-part5.js',
  'singa-script-part6.js',
  'singa-script-part7.js',
  'singa-script-part8.js',
  'singa-script-part9.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(SHELL_FILES); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  const url = new URL(e.request.url);
  if(url.origin !== location.origin) return; // never intercept cross-origin (Supabase, fonts, CDN)
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      const network = fetch(e.request).then(function(resp){
        if(resp && resp.ok){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, resp.clone()); });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
