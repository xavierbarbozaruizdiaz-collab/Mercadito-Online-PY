// Script para desregistrar el Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(function(success) {
        if(success) {
          console.log('Service Worker desregistrado exitosamente');
          // Limpiar cachés también
          caches.keys().then(function(cacheNames) {
            return Promise.all(
              cacheNames.map(function(cacheName) {
                return caches.delete(cacheName);
              })
            );
          }).then(function() {
            console.log('Cachés limpiados');
            // Recargar la página después de limpiar
            window.location.reload();
          });
        }
      });
    }
  });
}

