'use client'

import { useEffect } from 'react'

/**
 * Компонент для регистрации Service Worker
 * Должен быть добавлен в root layout
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
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
                  // Новая версия доступна
                  console.log('[SW] New version available')
                  
                  // Можно показать уведомление пользователю
                  if (confirm('Доступна новая версия приложения. Обновить?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  }
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
  }, [])

  return null
}

