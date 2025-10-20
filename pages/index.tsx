import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const Home: React.FC = () => {
  const router = useRouter()

  useEffect(() => {
    // Редирект на страницу логина
    router.replace('/login')
  }, [router])

  return (
    <>
      <Head>
        <title>Новые Схемы</title>
        <meta name="description" content="Система управления клиентами Новые Схемы" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-800 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/25 mx-auto">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Новые Схемы</h1>
          <p className="text-gray-300">Перенаправление...</p>
        </div>
      </div>
    </>
  )
}

export default Home
