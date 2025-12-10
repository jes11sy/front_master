'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, MapPin, Calendar, User, Wrench, AlertTriangle, FileText, MessageSquare, Plus, Upload, Loader2, AlertCircle } from 'lucide-react'
import apiClient from '@/lib/api'
import { CallButton } from '@/components/CallButton'

interface Order {
  id: number
  rk: string
  city: string
  typeOrder: string
  clientName: string
  phone: string
  address: string
  dateMeeting: string
  statusOrder: string
  result: number | null
  avitoName: string | null
  avitoChatId: string | null
  typeEquipment: string
  problem: string
  note: string | null
  callId?: string | null
  bsoDoc?: string | null
  expenditureDoc?: string | null
  operator?: {
    id: number
    name: string
    login: string
  }
  master?: {
    id: number
    name: string
    cities: string
  }
}

interface Call {
  id: number
  rk: string
  city: string
  phoneClient: string
  phoneAts: string
  dateCreate: string
  status: string
  recordingPath?: string | null
  recordingUrl?: string | null
  operator?: {
    id: number
    name: string
  }
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [recordingUrls, setRecordingUrls] = useState<{ [key: number]: string }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('info')
  const [totalAmount, setTotalAmount] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])
  const [showModernBlock, setShowModernBlock] = useState(true)
  const [showDocumentsTab, setShowDocumentsTab] = useState(false)
  const [showCloseButton, setShowCloseButton] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [cleanAmount, setCleanAmount] = useState('')
  const [masterChange, setMasterChange] = useState('')
  
  // Состояния для полей модерна
  const [prepayment, setPrepayment] = useState('')
  const [dateClosmod, setDateClosmod] = useState('')
  const [comment, setComment] = useState('')

  // Состояния для файлов
  const [bsoFile, setBsoFile] = useState<File | null>(null)
  const [expenditureFile, setExpenditureFile] = useState<File | null>(null)

  // Функция для извлечения имени файла из URL
  const getFileNameFromUrl = (url: string): string => {
    try {
      // Убираем query параметры (все после ?)
      const urlWithoutQuery = url.split('?')[0]
      // Извлекаем имя файла (последняя часть после /)
      const fileName = urlWithoutQuery.split('/').pop() || 'файл'
      return decodeURIComponent(fileName)
    } catch {
      return 'файл'
    }
  }

  // Функция для загрузки звонков
  const fetchCalls = async (orderId: string) => {
    try {
      const response = await apiClient.getCallsByOrderId(orderId)
      if (response.success && response.data) {
        setCalls(response.data)
      }
    } catch (error) {
      // Тихо обрабатываем ошибку загрузки звонков
    }
  }

  // Получаем прямые S3 URL для записей
  useEffect(() => {
    const loadRecordingUrls = () => {
      const urls: { [key: number]: string } = {}
      
      for (const call of calls) {
        if (call.recordingUrl) {
          // Используем прямой S3 URL
          const s3Url = `https://s3.twcstorage.ru/f7eead03-crmfiles/${call.recordingUrl}`
          urls[call.id] = s3Url
        }
      }
      
      setRecordingUrls(urls)
    }

    if (calls.length > 0) {
      loadRecordingUrls()
    }
  }, [calls])

  // Функция для обработки выбора файла
  const handleFileSelect = async (file: File, type: 'bso' | 'expenditure') => {
    if (!order) return

    try {
      setIsUpdating(true)
      
      // Определяем папку на S3 в зависимости от типа файла
      const folder = type === 'bso' ? 'director/orders/bso_doc' : 'director/orders/expenditure_doc'
      
      // Загружаем файл на S3 в указанную папку
      const response = await apiClient.uploadFile(file, folder)
      
      if (response.success && response.data?.url) {
        // Обновляем заказ с путём к файлу
        const updateData: any = {}
        if (type === 'bso') {
          updateData.bsoDoc = response.data.url
          setBsoFile(file)
        } else {
          updateData.expenditureDoc = response.data.url
          setExpenditureFile(file)
        }
        
        const updateResponse = await apiClient.updateOrder(order.id.toString(), updateData)
        
        if (updateResponse.success && updateResponse.data) {
          setOrder(updateResponse.data)
          
          // Перепроверяем валидацию с обновленными данными
          const newNotifications: string[] = []
          const total = parseFloat(totalAmount) || 0
          const expense = parseFloat(expenseAmount) || 0
          
          if (total > 5000 && !updateResponse.data.bsoDoc) {
            newNotifications.push('Итог больше 5000₽ - необходимо прикрепить Договор')
          }
          
          if (expense > 1001 && !updateResponse.data.expenditureDoc) {
            newNotifications.push('Расход больше 1001₽ - необходимо прикрепить чек расхода')
          }
          
          // Если нет уведомлений о валидации, показываем успех
          if (newNotifications.length === 0) {
            setNotifications([`Файл успешно загружен`])
            setTimeout(() => setNotifications([]), 3000)
          } else {
            setNotifications(newNotifications)
          }
        }
      }
    } catch (error) {
      setNotifications(['Ошибка загрузки файла'])
      setTimeout(() => setNotifications([]), 3000)
    } finally {
      setIsUpdating(false)
    }
  }

  // Загружаем заказ из API
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError('')
        const response = await apiClient.getOrderById(id as string)
        
        if (response.success && response.data) {
          setOrder(response.data)
          const total = response.data.result?.toString() || ''
          const expense = response.data.expenditure?.toString() || ''
          setTotalAmount(total)
          setExpenseAmount(expense)
          
          // Загружаем звонки если есть callId
          if (response.data.callId) {
            await fetchCalls(response.data.id.toString())
          }
          
              // Если статус "Готово", устанавливаем флаги и вычисляем значения
              if (response.data.statusOrder === 'Готово') {
                setIsCompleted(true)
                const clean = response.data.clean || 0
                const masterChange = response.data.masterChange || 0
                setCleanAmount(clean.toString())
                setMasterChange(masterChange.toString())
              }
              
              // Загружаем данные модерна
              setPrepayment(response.data.prepayment?.toString() || '')
              setDateClosmod(response.data.dateClosmod ? new Date(response.data.dateClosmod).toISOString().slice(0, 16) : '')
              setComment(response.data.comment || '')
              
              // Устанавливаем showModernBlock в зависимости от статуса
              setShowModernBlock(response.data.statusOrder === 'Модерн')
          
          // Валидация при загрузке
          const newNotifications: string[] = []
          const totalNum = parseFloat(total) || 0
          const expenseNum = parseFloat(expense) || 0
          
          // Проверяем, нужен ли договор и прикреплен ли он
          if (totalNum > 5000 && !response.data.bsoDoc) {
            newNotifications.push('Итог больше 5000₽ - необходимо прикрепить Договор')
          }
          
          // Проверяем, нужен ли чек расхода и прикреплен ли он
          if (expenseNum > 1001 && !response.data.expenditureDoc) {
            newNotifications.push('Расход больше 1001₽ - необходимо прикрепить чек расхода')
          }
          
          setNotifications(newNotifications)
        } else {
          setError(response.error || 'Заказ не найден')
        }
      } catch (error: any) {
        setError(error.message || 'Ошибка загрузки заказа')
        // Если ошибка авторизации, перенаправляем на логин
        if (error.message?.includes('401') || error.message?.includes('токен')) {
          router.push('/login')
        }
        // Если недостаточно прав, перенаправляем на список заказов
        if (error.message?.includes('403') || error.message?.includes('Недостаточно прав')) {
          router.push('/orders')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id, router])

  // Переключаемся на вкладку "Информация" если активна скрытая вкладка
  useEffect(() => {
    if (order && order.statusOrder === 'Ожидает' && (activeTab === 'documents' || activeTab === 'communications')) {
      setActiveTab('info')
    } else if (order && (order.statusOrder === 'Принял' || order.statusOrder === 'В пути') && activeTab === 'documents') {
      setActiveTab('info')
    }
  }, [order, activeTab])

  // Функция для принятия заказа
  const handleAcceptOrder = async () => {
    if (!order) return
    
    try {
      setIsUpdating(true)
      const response = await apiClient.updateOrder(order.id.toString(), {
        statusOrder: 'Принял'
      })
      
      if (response.success && response.data) {
        setOrder(response.data)
      } else {
        setError(response.error || 'Ошибка обновления заказа')
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка обновления заказа')
    } finally {
      setIsUpdating(false)
    }
  }

  // Функция для отказа от заказа
  const handleDeclineOrder = async () => {
    if (!order) return
    
    try {
      setIsUpdating(true)
      const response = await apiClient.updateOrder(order.id.toString(), {
        masterId: null
      })
      
      if (response.success && response.data) {
        setOrder(response.data)
        router.push('/orders')
      } else {
        setError(response.error || 'Ошибка обновления заказа')
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка обновления заказа')
    } finally {
      setIsUpdating(false)
    }
  }

  // Функция для сохранения данных модерна
  const handleSaveModerData = async () => {
    if (!order) return
    
    setIsUpdating(true)
    try {
      const updateData = {
        prepayment: prepayment ? parseFloat(prepayment) : null,
        dateClosmod: dateClosmod ? new Date(dateClosmod + 'Z').toISOString() : null,
        comment: comment || null
      }
      
      const response = await apiClient.updateOrder(order.id.toString(), updateData)
      
      if (response.success) {
        setOrder(response.data)
        // Показываем уведомление об успешном сохранении
        setNotifications(['Модерн записан!'])
        setTimeout(() => setNotifications([]), 4000)
      }
    } catch (error) {
      setNotifications(['Ошибка при сохранении данных модерна'])
      setTimeout(() => setNotifications([]), 4000)
    } finally {
      setIsUpdating(false)
    }
  }

  // Универсальная функция для обновления статуса
  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return
    
    try {
      setIsUpdating(true)
      
      // Подготавливаем данные для отправки
      const updateData: any = {
        statusOrder: newStatus
      }
      
      // Если статус "Готово", добавляем финансовые данные
      if (newStatus === 'Готово') {
        const total = parseFloat(totalAmount) || 0
        const expense = parseFloat(expenseAmount) || 0
        let clean = total - expense
        
        // Проверка для заказов со статусом "Модерн": если прошло 7+ дней от даты встречи, чистыми минимум 3000
        if (order.statusOrder === 'Модерн' && order.dateMeeting) {
          const meetingDate = new Date(order.dateMeeting)
          const today = new Date()
          const daysDiff = Math.floor((today.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysDiff >= 7 && clean < 3000) {
            clean = 3000
          }
        }
        
        // Новая логика: если чистыми <= 5000, то 60%, иначе 50%
        const masterChange = clean <= 5000 ? clean * 0.6 : clean * 0.5
        
        updateData.result = total
        updateData.expenditure = expense
        updateData.clean = clean
        updateData.masterChange = masterChange
        updateData.cashSubmissionStatus = 'Не отправлено'
      }
      
      const response = await apiClient.updateOrder(order.id.toString(), updateData)
      
      if (response.success && response.data) {
        setOrder(response.data)
        
        if (newStatus === 'Модерн') {
          setActiveTab('documents')
          setShowModernBlock(true)
        }
        
        if (newStatus === 'Готово') {
          setActiveTab('documents')
          setIsCompleted(true)
          // Вычисляем чистыми и сдачу мастера для отображения
          const total = parseFloat(totalAmount) || 0
          const expense = parseFloat(expenseAmount) || 0
          let clean = total - expense
          
          // Проверка для заказов со статусом "Модерн": если прошло 7+ дней от даты встречи, чистыми минимум 3000
          if (order.statusOrder === 'Модерн' && order.dateMeeting) {
            const meetingDate = new Date(order.dateMeeting)
            const today = new Date()
            const daysDiff = Math.floor((today.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysDiff >= 7 && clean < 3000) {
              clean = 3000
            }
          }
          
          // Новая логика: если чистыми <= 5000, то 60%, иначе 50%
          const masterChange = clean <= 5000 ? clean * 0.6 : clean * 0.5
          setCleanAmount(clean.toString())
          setMasterChange(masterChange.toString())
        }
        
        // Убираем автоматический редирект при статусе "Отказ" или "Незаказ"
        // if (newStatus === 'Отказ' || newStatus === 'Незаказ') {
        //   router.push('/orders')
        // }
      } else {
        setError(response.error || 'Ошибка обновления заказа')
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка обновления заказа')
    } finally {
      setIsUpdating(false)
    }
  }

  // Функция для проверки валидации сумм
  const validateAmounts = () => {
    if (!order) return
    
    const newNotifications: string[] = []
    
    const total = parseFloat(totalAmount) || 0
    const expense = parseFloat(expenseAmount) || 0
    
    // Проверяем, нужен ли договор и прикреплен ли он
    if (total > 5000 && !order.bsoDoc) {
      newNotifications.push('Итог больше 5000₽ - необходимо прикрепить Договор')
    }
    
    // Проверяем, нужен ли чек расхода и прикреплен ли он
    if (expense > 1001 && !order.expenditureDoc) {
      newNotifications.push('Расход больше 1001₽ - необходимо прикрепить чек расхода')
    }
    
    setNotifications(newNotifications)
  }

  // Функция для проверки обязательных полей
  const validateRequiredFields = () => {
    if (!totalAmount.trim()) {
      setValidationError('Необходимо ввести итог')
      return false
    }
    if (!expenseAmount.trim()) {
      setValidationError('Необходимо ввести расход')
      return false
    }
    setValidationError('')
    return true
  }

  // Проверяем валидацию при изменении сумм
  useEffect(() => {
    if (totalAmount || expenseAmount) {
      validateAmounts()
    } else {
      setNotifications([])
    }
  }, [totalAmount, expenseAmount])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Ожидает': 'bg-yellow-500/20 text-yellow-800 border-yellow-500/30',
      'Принял': 'bg-blue-500/20 text-blue-800 border-blue-500/30',
      'В пути': 'bg-purple-500/20 text-purple-800 border-purple-500/30',
      'В работе': 'bg-orange-500/20 text-orange-800 border-orange-500/30',
      'Готово': 'bg-green-500/20 text-green-800 border-green-500/30',
      'Отказ': 'bg-red-500/20 text-red-800 border-red-500/30',
      'Модерн': 'bg-cyan-500/20 text-cyan-800 border-cyan-500/30',
      'Незаказ': 'bg-gray-500/20 text-gray-800 border-gray-500/30'
    }

    return (
      <Badge className={variants[status] || 'bg-gray-500/20 text-gray-800 border-gray-500/30'}>
        {status}
      </Badge>
    )
  }

  const getOrderTypeBadge = (orderType: string) => {
    const variants: Record<string, string> = {
      'Впервые': 'bg-green-500/20 text-green-800 border-green-500/30',
      'Повтор': 'bg-blue-500/20 text-blue-800 border-blue-500/30',
      'Гарантия': 'bg-purple-500/20 text-purple-800 border-purple-500/30'
    }

    return (
      <Badge className={variants[orderType] || 'bg-gray-500/20 text-gray-800 border-gray-500/30'}>
        {orderType}
      </Badge>
    )
  }

  // Функция для рендеринга кнопок в зависимости от статуса
  const renderActionButtons = () => {
    if (!order) return null

    const status = order.statusOrder
    const hasUnfulfilledRequirements = notifications.length > 0

    switch (status) {
      case 'Ожидает':
        return (
          <>
            <Button 
              onClick={handleAcceptOrder}
              disabled={isUpdating}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              {isUpdating ? 'Обновление...' : 'Принять'}
            </Button>
            <Button 
              onClick={handleDeclineOrder}
              disabled={isUpdating}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              {isUpdating ? 'Обновление...' : 'Отказаться'}
            </Button>
          </>
        )

      case 'Принял':
        return (
          <Button 
            onClick={() => handleUpdateStatus('В пути')}
            disabled={isUpdating}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
          >
            {isUpdating ? (
              <span className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Обновление...</span>
              </span>
            ) : (
              'В пути'
            )}
          </Button>
        )

      case 'В пути':
        return (
          <Button 
            onClick={() => handleUpdateStatus('В работе')}
            disabled={isUpdating}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
          >
            {isUpdating ? (
              <span className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Обновление...</span>
              </span>
            ) : (
              'В работе'
            )}
          </Button>
        )

      case 'В работе':
        if (showCloseButton) {
          return (
            <Button 
              onClick={() => {
                if (validateRequiredFields()) {
                  const total = parseFloat(totalAmount) || 0
                  const expense = parseFloat(expenseAmount) || 0
                  const newStatus = (total === 0 && expense === 0) ? 'Отказ' : 'Готово'
                  handleUpdateStatus(newStatus)
                }
              }}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              {isUpdating ? 'Обновление...' : 'Провести'}
            </Button>
          )
        }
        return (
          <>
            <Button 
              onClick={() => handleUpdateStatus('Модерн')}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              {isUpdating ? 'Обновление...' : 'Модерн'}
            </Button>
            <Button 
              onClick={() => {
                setShowCloseButton(true)
                setActiveTab('documents')
              }}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              {isUpdating ? 'Обновление...' : 'Закрыть'}
            </Button>
          </>
        )

      case 'Модерн':
        if (!showModernBlock) {
          return (
            <Button 
              onClick={() => {
                if (validateRequiredFields()) {
                  const total = parseFloat(totalAmount) || 0
                  const expense = parseFloat(expenseAmount) || 0
                  const newStatus = (total === 0 && expense === 0) ? 'Отказ' : 'Готово'
                  handleUpdateStatus(newStatus)
                }
              }}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              {isUpdating ? 'Обновление...' : 'Провести'}
            </Button>
          )
        } else {
          return (
            <>
              <Button 
                onClick={handleSaveModerData}
                disabled={isUpdating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Сохранение...</span>
                  </span>
                ) : (
                  'Сохранить'
                )}
              </Button>
              <Button 
                onClick={() => setShowModernBlock(false)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
              >
                Закрыть заказ
              </Button>
            </>
          )
        }

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="flex items-center space-x-2">
            <div className="text-white text-lg">Загрузка заказа...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="text-red-300 text-lg mb-4">{error}</div>
            <Button 
              onClick={() => router.push('/orders')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Вернуться к списку заказов
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="text-white text-xl mb-4">Заказ не найден</div>
            <Button onClick={() => router.push('/orders')} className="bg-green-600 hover:bg-green-700">
              Вернуться к заказам
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8 pb-24 md:pb-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
              
              {/* Заголовок */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
                    Заказ №{order.id}
                  </h1>
                  <CallButton 
                    orderId={order.id}
                    clientPhone={order.phone}
                    clientName={order.clientName}
                  />
                </div>
              </div>

              {/* Вкладки */}
              <Card className="bg-white border-gray-200 shadow-lg">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-2 sm:space-x-4 lg:space-x-8 px-2 sm:px-4 lg:px-6 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('info')}
                      className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'info'
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-600 hover:text-teal-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">Информация по заказу</span>
                      <span className="sm:hidden">Информация</span>
                    </button>
                {(order.statusOrder === 'В работе' && showCloseButton) || (order.statusOrder !== 'Ожидает' && order.statusOrder !== 'Принял' && order.statusOrder !== 'В пути' && order.statusOrder !== 'В работе') && (
                  <button
                    onClick={() => setActiveTab('documents')}
                      className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'documents'
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-600 hover:text-teal-600 hover:border-gray-300'
                      }`}
                  >
                    <span>Итог</span>
                  </button>
                )}
                {order.statusOrder !== 'Ожидает' && (
                  <button
                    onClick={() => setActiveTab('communications')}
                    className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                      activeTab === 'communications'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-600 hover:text-teal-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">Записи звонков / Чат Авито</span>
                    <span className="sm:hidden">Звонки / Чат</span>
                  </button>
                )}
              </nav>
            </div>

            <CardContent className="p-6">
              {/* Вкладка: Информация по заказу */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Основная информация */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Основная информация</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-gray-600">Рекламная компания</p>
                            <p className="text-gray-800 font-medium">{order.rk}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-gray-600">Город</p>
                            <p className="text-gray-800 font-medium">{order.city}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-gray-600">Имя аккаунта</p>
                            <p className="text-gray-800 font-medium">{order.avitoName || order.rk}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-gray-600">Тип заказа</p>
                            <div className="mt-1">{getOrderTypeBadge(order.typeOrder)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-gray-600">Статус</p>
                            <div className="mt-1">{getStatusBadge(order.statusOrder)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Информация о клиенте */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Информация о клиенте</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-gray-600">Имя клиента</p>
                            <p className="text-gray-800 font-medium">{order.clientName}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm text-gray-600">Телефон</p>
                            <p className="text-gray-800 font-medium">{order.phone}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">Адрес</p>
                            <p className="text-gray-800 font-medium">{order.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Техническая информация */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Техническая информация</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm text-gray-600">Направление</p>
                          <p className="text-gray-800 font-medium">{order.typeEquipment}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm text-gray-600">Дата встречи</p>
                          <p className="text-gray-800 font-medium">{new Date(order.dateMeeting).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC'
                          })}</p>
                        </div>
                      </div>
                    </div>
                    
                      <div className="mt-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">Проблема</p>
                            <p className="text-gray-800 font-medium">{order.problem}</p>
                          </div>
                        </div>
                      </div>
                    
                    {order.note && (
                      <div className="mt-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">Примечания</p>
                            <p className="text-gray-800 font-medium whitespace-pre-line text-sm">{order.note}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Вкладка: Сумма и документы */}
              {activeTab === 'documents' && ((order.statusOrder === 'В работе' && showCloseButton) || (order.statusOrder !== 'Ожидает' && order.statusOrder !== 'Принял' && order.statusOrder !== 'В пути' && order.statusOrder !== 'В работе')) && (
                <div className="space-y-6">
                  {/* Блок модерна - показывается при статусе Модерн и флаге showModernBlock */}
                  {order.statusOrder === 'Модерн' && showModernBlock && (
                    <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Информация по модерну</h3>
                      
                      <div className="space-y-4">
                        {/* Уведомления для модерна */}
                        {notifications.length > 0 && (
                          <div className="space-y-2">
                            {notifications.map((notification, index) => (
                              <div key={index} className={`p-3 rounded-lg border ${
                                notification.includes('Модерн записан') 
                                  ? 'bg-green-50 border-green-200 text-green-700' 
                                  : 'bg-red-50 border-red-200 text-red-700'
                              }`}>
                                <p className="text-sm font-medium text-center">{notification}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="prepayment" className="text-gray-700 font-medium">Сумма предоплаты</Label>
                          <div className="relative">
                            <Input
                              id="prepayment"
                              type="number"
                              placeholder="0"
                              value={prepayment}
                              onChange={(e) => setPrepayment(e.target.value)}
                              className="bg-white border-gray-200 text-gray-800 placeholder-gray-400 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₽</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="closingDate" className="text-gray-700 font-medium">Дата закрытия</Label>
                          <Input
                            id="closingDate"
                            type="datetime-local"
                            value={dateClosmod}
                            onChange={(e) => setDateClosmod(e.target.value)}
                            className="bg-white border-gray-200 text-gray-800"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="comment" className="text-gray-700 font-medium">Комментарий</Label>
                          <textarea
                            id="comment"
                            rows={4}
                            placeholder="Введите комментарий..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                    </div>
                  )}

                  {/* Поля ввода сумм - показываются если НЕ статус Модерн или блок модерна скрыт */}
                  {(order.statusOrder !== 'Модерн' || !showModernBlock) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="total" className="text-gray-700 font-medium">Итог</Label>
                        <div className="relative">
                          <Input
                            id="total"
                            type="number"
                            placeholder="0"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            disabled={isCompleted || order.statusOrder === 'Готово'}
                            className={`bg-white border-gray-200 text-gray-800 placeholder-gray-400 pr-8 ${(isCompleted || order.statusOrder === 'Готово') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₽</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expense" className="text-gray-700 font-medium">Расход</Label>
                        <div className="relative">
                          <Input
                            id="expense"
                            type="number"
                            placeholder="0"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            disabled={isCompleted || order.statusOrder === 'Готово'}
                            className={`bg-white border-gray-200 text-gray-800 placeholder-gray-400 pr-8 ${(isCompleted || order.statusOrder === 'Готово') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₽</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Текст "Чистыми" и "Сдача мастера" - показывается после завершения или при статусе "Готово" */}
                  {(isCompleted || order.statusOrder === 'Готово') && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-gray-700 font-medium">Чистыми:</p>
                          <p className="text-green-600 text-lg font-semibold">{cleanAmount}₽</p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-gray-700 font-medium">Сдача мастера:</p>
                          <p className="text-blue-600 text-lg font-semibold">{masterChange}₽</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Уведомления о валидации - показываются если НЕ статус Модерн или блок модерна скрыт */}
                  {(order.statusOrder !== 'Модерн' || !showModernBlock) && notifications.length > 0 && (
                    <div className="space-y-2">
                      {notifications.map((notification, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-yellow-700 text-sm font-medium">{notification}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Документы - показываются если НЕ статус Модерн или блок модерна скрыт */}
                  {(order.statusOrder !== 'Модерн' || !showModernBlock) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">Документы</h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-800 font-medium">Договор</span>
                            </div>
                            {order.statusOrder !== 'Готово' && order.statusOrder !== 'Незаказ' && order.statusOrder !== 'Отказ' && (
                              <div className="relative">
                                <input
                                  type="file"
                                  id="bso-upload"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileSelect(file, 'bso')
                                  }}
                                />
                                <label htmlFor="bso-upload">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-teal-600 border-teal-600 text-white hover:bg-teal-700"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      document.getElementById('bso-upload')?.click()
                                    }}
                                  >
                                    Прикрепить
                                  </Button>
                                </label>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.bsoDoc ? (
                              <span className="text-green-600">Файл прикреплен: {bsoFile?.name || getFileNameFromUrl(order.bsoDoc)}</span>
                            ) : (
                              'Файл не прикреплен'
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-800 font-medium">Чек расхода</span>
                            </div>
                            {order.statusOrder !== 'Готово' && order.statusOrder !== 'Незаказ' && order.statusOrder !== 'Отказ' && (
                              <div className="relative">
                                <input
                                  type="file"
                                  id="expenditure-upload"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileSelect(file, 'expenditure')
                                  }}
                                />
                                <label htmlFor="expenditure-upload">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="bg-teal-600 border-teal-600 text-white hover:bg-teal-700"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      document.getElementById('expenditure-upload')?.click()
                                    }}
                                  >
                                    Прикрепить
                                  </Button>
                                </label>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.expenditureDoc ? (
                              <span className="text-green-600">Файл прикреплен: {expenditureFile?.name || getFileNameFromUrl(order.expenditureDoc)}</span>
                            ) : (
                              'Файл не прикреплен'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Вкладка: Записи звонков / Чат Авито */}
              {activeTab === 'communications' && order.statusOrder !== 'Ожидает' && (
                <div className="space-y-6">
                  {/* Записи звонков */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Записи звонков</h3>
                    <div className="space-y-3">
                      {calls.length > 0 ? (
                        calls.map((call) => (
                          <div key={call.id} className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-800 font-medium text-sm sm:text-base">
                                  {call.status === 'incoming' ? 'Входящий' : 'Исходящий'} звонок
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm text-gray-500">
                                {new Date(call.dateCreate).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            {recordingUrls[call.id] && (
                              <div className="mt-3">
                                <audio 
                                  controls 
                                  className="w-full h-10 sm:h-12"
                                  style={{ 
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none'
                                  }}
                                >
                                  <source src={recordingUrls[call.id]} type="audio/mpeg" />
                                  Ваш браузер не поддерживает аудио элемент.
                                </audio>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                          <p className="text-gray-600">Записи звонков не найдены</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Чат Авито */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Чат Авито</h3>
                    {order.avitoChatId && order.avitoName ? (
                      <button
                        onClick={() => router.push(`/orders/${order.id}/avito`)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
                      >
                        Открыть чат Авито
                      </button>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <span className="text-gray-700 font-medium">Чат Авито не настроен</span>
                        </div>
                        <p className="text-gray-500 text-sm">
                          У этого заказа не указан ID чата Авито или имя аккаунта
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Кнопки действий - для десктопа (inline) */}
          <div className="hidden md:block mt-6 md:mt-8 pb-4">
            {/* Уведомление о заблокированных кнопках */}
            {notifications.length > 0 && order?.statusOrder === 'В работе' && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium text-center">
                  Завершить заказ можно только после прикрепления всех необходимых документов
                </p>
              </div>
            )}
            
            {/* Ошибка валидации */}
            {validationError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium text-center">
                  {validationError}
                </p>
              </div>
            )}
            
            <div className="flex space-x-3 w-full max-w-2xl mx-auto">
              {renderActionButtons()}
            </div>
          </div>
        </div>
        
        {/* Фиксированные кнопки на мобильных устройствах */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-[#114643] via-[#114643] to-transparent pt-6">
          <div className="max-w-md mx-auto">
            {/* Уведомление о заблокированных кнопках для мобильных */}
            {notifications.length > 0 && order?.statusOrder === 'В работе' && (
              <div className="mb-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg backdrop-blur-sm">
                <p className="text-red-100 text-sm font-medium text-center">
                  Завершить заказ можно только после прикрепления всех необходимых документов
                </p>
              </div>
            )}
            
            {/* Ошибка валидации для мобильных */}
            {validationError && (
              <div className="mb-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg backdrop-blur-sm">
                <p className="text-red-100 text-sm font-medium text-center">
                  {validationError}
                </p>
              </div>
            )}
            
            <div className="flex space-x-3 w-full">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

