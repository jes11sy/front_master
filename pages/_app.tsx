import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { ToastProvider } from '@/components/ui/toast'
import MasterLayout from '@/components/master-layout'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <MasterLayout>
        <Component {...pageProps} />
      </MasterLayout>
    </ToastProvider>
  )
}
