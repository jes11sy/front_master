'use client'

import { useEffect } from 'react'

/**
 * Проверка, является ли устройство мобильным (Android/iOS)
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  
  // Проверка на Android
  const isAndroid = /android/i.test(userAgent)
  
  // Проверка на iOS
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
  
  return isAndroid || isIOS
}

/**
 * Компонент для регистрации Service Worker
 * Должен быть добавлен в root layout
 * Работает ТОЛЬКО на мобильных устройствах (Android/iOS)
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // 🔴 SERVICE WORKER ВРЕМЕННО ОТКЛЮЧЕН
    console.log('[SW] Service Worker is temporarily disabled')
    
    // Удаляем все существующие Service Workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0) {
          console.log('[SW] Unregistering all Service Workers...')
          registrations.forEach((registration) => {
            registration.unregister()
          })
          
          // Очищаем все кеши
          if ('caches' in window) {
            caches.keys().then((cacheNames) => {
              cacheNames.forEach((cacheName) => {
                caches.delete(cacheName)
                console.log('[SW] Cache deleted:', cacheName)
              })
            })
          }
        }
      })
    }
    
    return

    /* 
    // ========== ЗАКОММЕНТИРОВАННЫЙ КОД SERVICE WORKER ==========
    // Раскомментируйте этот блок, чтобы включить Service Worker обратно
    
    // Проверяем, что это мобильное устройство
    if (!isMobileDevice()) {
      console.log('[SW] Desktop detected, unregistering Service Worker...')
      
      // Удаляем Service Worker на десктопе, если он был зарегистрирован ранее
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.length > 0) {
            console.log('[SW] Found', registrations.length, 'Service Workers, unregistering...')
            registrations.forEach((registration) => {
              registration.unregister()
            })
            
            // Очищаем все кеши
            if ('caches' in window) {
              caches.keys().then((cacheNames) => {
                cacheNames.forEach((cacheName) => {
                  caches.delete(cacheName)
                  console.log('[SW] Cache deleted:', cacheName)
                })
              })
            }
          }
        })
      }
      
      return
    }

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          })

          console.log('[SW] Service Worker registered:', registration.scope)

          // Проверяем обновления каждый час
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)

          // Обрабатываем обновление Service Worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // Новая версия доступна - обновляем автоматически
                  console.log('[SW] New version available, updating automatically...')
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                  // Перезагрузка произойдёт автоматически через controllerchange
                }
              })
            }
          })

          // Перезагружаем страницу когда новый SW активируется
          let refreshing = false
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true
              window.location.reload()
            }
          })
        } catch (error) {
          console.error('[SW] Registration failed:', error)
        }
      }

      registerServiceWorker()
    }
    */
  }, [])

  return null
}

