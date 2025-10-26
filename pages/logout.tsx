import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import apiClient from '@/lib/api'

const Logout: React.FC = () => {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Очищаем токены и данные авторизации
        await apiClient.logout()
      } catch (error) {
        console.error('Ошибка при выходе из системы:', error)
        // Даже если произошла ошибка, очищаем локальные данные
        apiClient.clearToken()
      } finally {
        // Перенаправляем на страницу логина
        router.push('/login')
      }
    }

    handleLogout()
  }, [router])

  return (
    <>
      <Head>
        <title>Выход из системы</title>
        <meta name="description" content="Выход из системы Новые Схемы" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-800 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/25 mx-auto">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Выход из системы</h1>
          <p className="text-gray-300">Перенаправление на страницу входа...</p>
        </div>
      </div>
    </>
  )
}

export default Logout
