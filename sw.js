/* BatiSuivi — service worker (mode hors-ligne, etape 1) */
const CACHE = 'batisuivi-cache-v142';
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(['./','./index.html']); }).catch(function(){}));
});
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ if(k!==CACHE) return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try{ url = new URL(req.url); }catch(_){ return; }
  // Donnees live (Firebase, fonctions, IA) : ne pas intercepter, laisser passer au reseau
  if(/firebasedatabase\.app|firebaseio|identitytoolkit|securetoken|cloudfunctions|generativelanguage|anthropic/.test(url.host)) return;
  var isHTML = req.mode === 'navigate' || url.pathname === '/' || url.pathname.slice(-1) === '/' || url.pathname.indexOf('index.html') !== -1;
  if(isHTML){
    // Reseau d'abord (toujours la derniere version en ligne), cache en secours (hors-ligne)
    e.respondWith(
      fetch(req).then(function(res){ var cp = res.clone(); caches.open(CACHE).then(function(c){ c.put('./index.html', cp); }); return res; })
      .catch(function(){ return caches.match('./index.html').then(function(r){ return r || caches.match(req); }); })
    );
    return;
  }
  // Librairies / polices : cache d'abord, reseau ensuite
  e.respondWith(
    caches.match(req).then(function(r){
      return r || fetch(req).then(function(res){
        if(res && res.ok && url.protocol === 'https:'){ var cp = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); }
        return res;
      }).catch(function(){ return r; });
    })
  );
});
