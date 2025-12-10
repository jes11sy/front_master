'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLayout } from '@/components/layout-context'

export default function NotFound() {
  const router = useRouter()
  const { setHideLayout } = useLayout()

  useEffect(() => {
    setHideLayout(true)
    return () => setHideLayout(false)
  }, [setHideLayout])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-white/20">404</h1>
        </div>
        
        <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 md:p-12 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl animate-fade-in max-w-md mx-auto" style={{borderColor: '#114643'}}>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Страница не найдена
          </h2>
          <p className="text-gray-600 mb-8">
            К сожалению, запрашиваемая страница не существует или была удалена.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-2 border-teal-600 text-teal-600 hover:bg-teal-50"
            >
              ← Назад
            </Button>
            <Button
              onClick={() => router.push('/orders')}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              На главную
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
