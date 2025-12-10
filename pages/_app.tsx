import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'
import { ToastProvider } from '@/components/ui/toast'
import MasterLayout from '@/components/master-layout'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Новые схемы</title>
        <meta name="description" content="CRM Мастера" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/logo.png" />
      </Head>
      <ToastProvider>
        <MasterLayout>
          <Component {...pageProps} />
        </MasterLayout>
      </ToastProvider>
    </>
  )
}
