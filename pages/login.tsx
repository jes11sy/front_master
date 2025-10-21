import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import apiClient from '@/lib/api'

const loginSchema = z.object({
  login: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
  remember: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

const Login: NextPage = () => {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      remember: false,
    }
  })

  const rememberMe = watch('remember')

  // Восстанавливаем состояние "Запомнить меня" и проверяем авторизацию при загрузке
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rememberMeValue = localStorage.getItem('remember_me') === 'true'
      if (rememberMeValue) {
        setValue('remember', true)
      }

      // Проверяем, есть ли уже токен авторизации
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      if (token) {
        // Если есть токен, перенаправляем на главную страницу
        router.push('/orders')
      }
    }
  }, [setValue, router])

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    try {
      const response = await apiClient.login(data.login, data.password, data.remember)
      
      if (response.success) {
        // Перенаправляем на страницу заказов
        router.push('/orders')
      } else {
        setError(response.error || 'Ошибка авторизации')
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка авторизации. Попробуйте снова.')
    }
  }

  return (
    <>
      <Head>
        <title>Вход в Новые Схемы</title>
        <meta name="description" content="Войдите в систему Новые Схемы" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-black/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="Новые Схемы"
                width={96}
                height={96}
                className="rounded-xl"
              />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="login" className="text-gray-200 font-medium text-sm">
                  Логин
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login"
                    type="text"
                    placeholder="Введите логин"
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20"
                    {...register('login')}
                  />
                </div>
                {errors.login && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.login.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200 font-medium text-sm">
                  Пароль
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Введите пароль"
                    className="pl-10 pr-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setValue('remember', checked as boolean)}
                  className="border-gray-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <Label 
                  htmlFor="remember" 
                  className="text-gray-300 text-sm cursor-pointer"
                >
                  Запомнить меня
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  'Войти в систему'
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400">
                © 2025 Новые Схемы. Все права защищены.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default Login