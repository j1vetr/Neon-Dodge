self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.matchAll(); })
      .then(function (cls) {
        cls.forEach(function (c) { c.navigate(c.url); });
      })
      .then(function () { return self.registration.unregister(); })
  );
});
