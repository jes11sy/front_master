import type { Metadata } from 'next'
import '../styles/globals.css'
import { ToastProvider } from '@/components/ui/toast'
import MasterLayout from '@/components/master-layout'
import { LayoutProvider } from '@/components/layout-context'

export const metadata: Metadata = {
  title: 'Новые схемы',
  description: 'CRM Мастера',
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <LayoutProvider>
          <ToastProvider>
            <MasterLayout>
              {children}
            </MasterLayout>
          </ToastProvider>
        </LayoutProvider>
      </body>
    </html>
  )
}

