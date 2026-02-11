import type { Metadata } from 'next'
import '../styles/globals.css'
import { ToastProvider } from '@/components/ui/toast'
import MasterLayout from '@/components/master-layout'
import { LayoutProvider } from '@/components/layout-context'
import ClientLayout from '@/components/client-layout'
import Script from 'next/script'
import { ServiceWorkerRegister } from '@/components/push/ServiceWorkerRegister'
// import { PushPermissionBanner } from '@/components/push/PushNotificationManager'

export const metadata: Metadata = {
  title: 'Новые схемы',
  description: 'CRM Мастера',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/images/images/pwa_light.png', media: '(prefers-color-scheme: light)' },
      { url: '/images/images/pwa_dark.png', media: '(prefers-color-scheme: dark)' },
    ],
    shortcut: '/images/images/favicon.png',
    apple: [
      { url: '/images/images/pwa_light.png', media: '(prefers-color-scheme: light)' },
      { url: '/images/images/pwa_dark.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'НС Мастер',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#0d5c4b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Критические стили - ДОЛЖНЫ быть первыми для предотвращения мерцания */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Базовые стили до загрузки React */
              html, body {
                background-color: white;
              }
              html.dark, html.dark body {
                background-color: #1e2530 !important;
              }
              /* Навигация */
              nav.nav-main, aside.sidebar-main, header.header-main, main.main-content {
                background-color: white !important;
                transition: none !important;
              }
              html.dark nav.nav-main, html.dark aside.sidebar-main, html.dark header.header-main, html.dark main.main-content {
                background-color: #1e2530 !important;
              }
              nav.nav-main, aside.sidebar-main, header.header-main {
                border-color: #e5e7eb !important;
              }
              html.dark nav.nav-main, html.dark aside.sidebar-main, html.dark header.header-main {
                border-color: rgba(255, 255, 255, 0.15) !important;
              }
              /* Скрываем контент пока тема не определена */
              html:not(.theme-ready) body {
                visibility: hidden;
              }
              html.theme-ready body {
                visibility: visible;
              }
            `,
          }}
        />
        {/* Скрипт инициализации темы - ДОЛЖЕН быть сразу после стилей */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('design-storage');
                  var isDark = false;
                  if (stored) {
                    var data = JSON.parse(stored);
                    isDark = data.state && data.state.theme === 'dark';
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.backgroundColor = '#1e2530';
                    document.documentElement.style.colorScheme = 'dark';
                    document.body && (document.body.style.backgroundColor = '#1e2530');
                  }
                  // Показываем контент сразу после определения темы
                  document.documentElement.classList.add('theme-ready');
                  // Добавляем класс hydrated для плавных переходов
                  requestAnimationFrame(function() {
                    document.documentElement.classList.add('hydrated');
                  });
                } catch (e) {
                  document.documentElement.classList.add('theme-ready');
                }
              })();
            `,
          }}
        />
        <Script id="error-handler" strategy="beforeInteractive">
          {`
            // Глобальная обработка необработанных ошибок
            window.addEventListener('error', function(event) {
              console.error('Global error caught:', event.error);
              event.preventDefault();
            });
            
            // Обработка необработанных промисов
            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled promise rejection:', event.reason);
              event.preventDefault();
            });
          `}
        </Script>
      </head>
      <body className="font-myriad transition-colors duration-0">
        <ServiceWorkerRegister />
        <LayoutProvider>
          <ToastProvider>
            <ClientLayout>
              <MasterLayout>
                {children}
              </MasterLayout>
            </ClientLayout>
            {/* PushPermissionBanner убран - системный диалог вызывается из настроек */}
          </ToastProvider>
        </LayoutProvider>
      </body>
    </html>
  )
}
