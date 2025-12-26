// 🔴 АГРЕССИВНОЕ УДАЛЕНИЕ SERVICE WORKER
// Выполняется ДО загрузки React, сразу при загрузке страницы

(function() {
  console.log('[SW-Unregister] Starting aggressive Service Worker removal...')
  
  if ('serviceWorker' in navigator) {
    // 1. Удаляем все Service Workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      if (registrations.length > 0) {
        console.log('[SW-Unregister] Found', registrations.length, 'Service Workers')
        
        registrations.forEach(function(registration) {
          registration.unregister().then(function(success) {
            if (success) {
              console.log('[SW-Unregister] ✅ Unregistered SW:', registration.scope)
            }
          })
        })
      } else {
        console.log('[SW-Unregister] No Service Workers found')
      }
    }).catch(function(err) {
      console.error('[SW-Unregister] Error getting registrations:', err)
    })
    
    // 2. Очищаем все кэши
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        if (cacheNames.length > 0) {
          console.log('[SW-Unregister] Found', cacheNames.length, 'caches')
          
          cacheNames.forEach(function(cacheName) {
            caches.delete(cacheName).then(function(success) {
              if (success) {
                console.log('[SW-Unregister] ✅ Deleted cache:', cacheName)
              }
            })
          })
        } else {
          console.log('[SW-Unregister] No caches found')
        }
      }).catch(function(err) {
        console.error('[SW-Unregister] Error clearing caches:', err)
      })
    }
  } else {
    console.log('[SW-Unregister] Service Worker not supported')
  }
})()

