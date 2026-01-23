import type { Metadata } from 'next'
import '../styles/globals.css'
import { ToastProvider } from '@/components/ui/toast'
import MasterLayout from '@/components/master-layout'
import { LayoutProvider } from '@/components/layout-context'
import ClientLayout from '@/components/client-layout'

export const metadata: Metadata = {
  title: 'Новые схемы',
  description: 'CRM Мастера',
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        {/* 🔴 АГРЕССИВНОЕ УДАЛЕНИЕ SERVICE WORKER - выполняется ДО загрузки React */}
        <script src="/unregister-sw.js" />
      </head>
      <body>
        <LayoutProvider>
          <ToastProvider>
            <MasterLayout>
              <ClientLayout>
                {children}
              </ClientLayout>
            </MasterLayout>
          </ToastProvider>
        </LayoutProvider>
      </body>
    </html>
  )
}

