import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, MapPin, Calendar, User, Wrench, AlertTriangle, FileText, MessageSquare, Plus, Upload, Loader2, AlertCircle } from 'lucide-react'
import apiClient from '@/lib/api'

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

const OrderDetail: NextPage = () => {
  const router = useRouter()
  const { id } = router.query
  const [order, setOrder] = useState<Order | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
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
  
  // Состояние для загрузки чата Авито
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [avitoChat, setAvitoChat] = useState<any>(null)
  const [avitoMessages, setAvitoMessages] = useState<any[]>([])
  const [showChatModal, setShowChatModal] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Функция для загрузки звонков
  const fetchCalls = async (callId: string) => {
    try {
      console.log('Загружаем звонки для callId:', callId)
      const response = await apiClient.getCallsByOrderId(callId)
      console.log('Ответ API:', response)
      if (response.success && response.data) {
        console.log('Устанавливаем звонки:', response.data)
        setCalls(response.data)
      } else {
        console.log('Нет данных в ответе')
      }
    } catch (error) {
      console.error('Ошибка загрузки звонков:', error)
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
          console.log('callId заказа:', response.data.callId)
          if (response.data.callId) {
            await fetchCalls(response.data.callId)
          } else {
            console.log('У заказа нет callId')
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
          
          if (totalNum > 5000) {
            newNotifications.push('Итог больше 5000₽ - необходимо прикрепить Договор')
          }
          
          if (expenseNum > 1001) {
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
        statusOrder: 'Отказ'
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
      console.error('Ошибка при сохранении данных модерна:', error)
      setNotifications(['Ошибка при сохранении данных модерна'])
      setTimeout(() => setNotifications([]), 4000)
    } finally {
      setIsUpdating(false)
    }
  }

  // Функция для открытия чата Авито
  const handleOpenAvitoChat = async () => {
    if (!order || !order.avitoChatId || !order.avitoName) {
      setNotifications(['У заказа не настроен чат Авито'])
      setTimeout(() => setNotifications([]), 4000)
      return
    }

    setIsLoadingChat(true)
    try {
      // Получаем данные чата
      const chatResponse = await apiClient.getOrderAvitoChat(order.id.toString())
      
      if (chatResponse.success && chatResponse.data) {
        const { chat, avitoName } = chatResponse.data
        
        // Получаем сообщения чата
        const messagesResponse = await apiClient.getAvitoChatMessages(
          avitoName, 
          order.avitoChatId, 
          { limit: 50, offset: 0 }
        )
        
        if (messagesResponse.success && messagesResponse.data) {
          setAvitoChat(chat)
          setAvitoMessages(messagesResponse.data)
          setShowChatModal(true)
          
          // Показываем уведомление об успешной загрузке
          setNotifications([`Чат Авито "${avitoName}" загружен`])
          setTimeout(() => setNotifications([]), 4000)
        } else {
          throw new Error('Не удалось загрузить сообщения чата')
        }
        
      } else {
        throw new Error(chatResponse.error || 'Не удалось получить данные чата')
      }
    } catch (error: any) {
      setNotifications([`Ошибка загрузки чата: ${error.message}`])
      setTimeout(() => setNotifications([]), 4000)
    } finally {
      setIsLoadingChat(false)
    }
  }

  // Функция для отправки сообщения в чат Авито
  const handleSendMessage = async () => {
    if (!order || !order.avitoChatId || !order.avitoName || !newMessage.trim()) {
      return
    }

    setIsSendingMessage(true)
    try {
      const response = await apiClient.sendAvitoMessage(
        order.avitoName,
        order.avitoChatId,
        newMessage.trim()
      )
      
      if (response.success) {
        // Очищаем поле ввода
        setNewMessage('')
        
        // Обновляем список сообщений
        const messagesResponse = await apiClient.getAvitoChatMessages(
          order.avitoName,
          order.avitoChatId,
          { limit: 50, offset: 0 }
        )
        
        if (messagesResponse.success && messagesResponse.data) {
          setAvitoMessages(messagesResponse.data)
        }
        
        // Показываем уведомление об успешной отправке
        setNotifications(['Сообщение отправлено'])
        setTimeout(() => setNotifications([]), 3000)
        
      } else {
        throw new Error(response.error || 'Не удалось отправить сообщение')
      }
    } catch (error: any) {
      setNotifications([`Ошибка отправки сообщения: ${error.message}`])
      setTimeout(() => setNotifications([]), 4000)
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Функция для загрузки изображения
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !order || !order.avitoName) return

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setNotifications(['Пожалуйста, выберите изображение'])
      setTimeout(() => setNotifications([]), 3000)
      return
    }

    // Проверяем размер файла (24 МБ)
    if (file.size > 24 * 1024 * 1024) {
      setNotifications(['Размер файла не должен превышать 24 МБ'])
      setTimeout(() => setNotifications([]), 3000)
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('uploadfile[]', file)

      const response = await apiClient.uploadAvitoImage(order.avitoName, formData)
      
      if (response.success && response.data) {
        // Получаем первый (и единственный) image_id из ответа
        const imageId = Object.keys(response.data)[0]
        
        if (imageId && order.avitoChatId) {
          // Отправляем сообщение с изображением
          const messageResponse = await apiClient.sendAvitoImageMessage(
            order.avitoName,
            order.avitoChatId,
            imageId
          )
          
          if (messageResponse.success) {
            // Обновляем список сообщений
            const messagesResponse = await apiClient.getAvitoChatMessages(
              order.avitoName,
              order.avitoChatId,
              { limit: 50, offset: 0 }
            )
            
            if (messagesResponse.success && messagesResponse.data) {
              setAvitoMessages(messagesResponse.data)
            }
            
            setNotifications(['Изображение отправлено'])
            setTimeout(() => setNotifications([]), 3000)
          } else {
            throw new Error(messageResponse.error || 'Не удалось отправить изображение')
          }
        } else {
          throw new Error('Не удалось получить ID изображения')
        }
      } else {
        throw new Error(response.error || 'Не удалось загрузить изображение')
      }
    } catch (error: any) {
      setNotifications([`Ошибка загрузки изображения: ${error.message}`])
      setTimeout(() => setNotifications([]), 4000)
    } finally {
      setIsUploadingImage(false)
      // Очищаем input
      event.target.value = ''
    }
  }

  // Универсальная функция для обновления статуса
  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return
    
    try {
      setIsUpdating(true)
      console.log('Обновляем статус заказа:', order.id, 'на:', newStatus)
      
      // Подготавливаем данные для отправки
      const updateData: any = {
        statusOrder: newStatus
      }
      
      // Если статус "Готово", добавляем финансовые данные
      if (newStatus === 'Готово') {
        const total = parseFloat(totalAmount) || 0
        const expense = parseFloat(expenseAmount) || 0
        const clean = total - expense
        const masterChange = clean / 2
        
        updateData.result = total
        updateData.expenditure = expense
        updateData.clean = clean
        updateData.masterChange = masterChange
        
        console.log('Отправляем финансовые данные:', updateData)
      }
      
      const response = await apiClient.updateOrder(order.id.toString(), updateData)
      
      console.log('Ответ от API:', response)
      
      if (response.success && response.data) {
        console.log('Статус успешно обновлен:', response.data)
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
          const clean = total - expense
          const masterChange = clean / 2
          setCleanAmount(clean.toString())
          setMasterChange(masterChange.toString())
          
          // Записываем приход в таблицу cash
          try {
            const cashData = {
              name: 'приход',
              amount: masterChange,
              city: order.city,
              note: `Итог по заказу: ${total}₽`,
              paymentPurpose: `Заказ №${order.id}`,
              nameCreate: order.master?.name || 'Неизвестный мастер'
            }
            
            console.log('Записываем в cash:', cashData)
            // await apiClient.createCashEntry(cashData)
            console.log('Приход успешно записан в таблицу cash')
          } catch (cashError) {
            console.error('Ошибка при записи в таблицу cash:', cashError)
          }
        }
        
        // Убираем автоматический редирект при статусе "Отказ" или "Незаказ"
        // if (newStatus === 'Отказ' || newStatus === 'Незаказ') {
        //   router.push('/orders')
        // }
      } else {
        console.error('Ошибка обновления статуса:', response.error)
        setError(response.error || 'Ошибка обновления заказа')
      }
    } catch (error: any) {
      console.error('Исключение при обновлении статуса:', error)
      setError(error.message || 'Ошибка обновления заказа')
    } finally {
      setIsUpdating(false)
    }
  }

  // Функция для проверки валидации сумм
  const validateAmounts = () => {
    const newNotifications: string[] = []
    
    const total = parseFloat(totalAmount) || 0
    const expense = parseFloat(expenseAmount) || 0
    
    if (total > 5000) {
      newNotifications.push('Итог больше 5000₽ - необходимо прикрепить Договор')
    }
    
    if (expense > 1001) {
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
              <div className="flex items-center justify-center space-x-2">
                {isUpdating ? (
                  'Обновление...'
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
                <span>Принять</span>
              </div>
            </Button>
            <Button 
              onClick={handleDeclineOrder}
              disabled={isUpdating}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              <div className="flex items-center justify-center space-x-2">
                {isUpdating ? (
                  'Обновление...'
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
                <span>Отказаться</span>
              </div>
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
            <div className="flex items-center justify-center space-x-2">
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
              <span>В пути</span>
            </div>
          </Button>
        )

      case 'В пути':
        return (
          <Button 
            onClick={() => handleUpdateStatus('В работе')}
            disabled={isUpdating}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
          >
            <div className="flex items-center justify-center space-x-2">
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
              <span>В работе</span>
            </div>
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
              <div className="flex items-center justify-center space-x-2">
                {isUpdating ? (
                  'Обновление...'
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
                <span>Провести</span>
              </div>
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
              <div className="flex items-center justify-center space-x-2">
                {isUpdating ? (
                  'Обновление...'
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
                <span>Модерн</span>
              </div>
            </Button>
            <Button 
              onClick={() => {
                setShowCloseButton(true)
                setActiveTab('documents')
              }}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
            >
              <div className="flex items-center justify-center space-x-2">
                {isUpdating ? (
                  'Обновление...'
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
                <span>Закрыть</span>
              </div>
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
              <div className="flex items-center justify-center space-x-2">
                {isUpdating ? (
                  'Обновление...'
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
                <span>Провести</span>
              </div>
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
                <div className="flex items-center justify-center space-x-2">
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                  <span>{isUpdating ? 'Сохранение...' : 'Сохранить'}</span>
                </div>
              </Button>
              <Button 
                onClick={() => setShowModernBlock(false)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Закрыть заказ</span>
                </div>
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
      <div>
        <Head>
          <title>Загрузка заказа...</title>
        </Head>
        <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="flex items-center space-x-2">
              <div className="text-white text-lg">Загрузка заказа...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Head>
          <title>Ошибка загрузки заказа</title>
        </Head>
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
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <Head>
          <title>Заказ не найден</title>
        </Head>
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
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Заказ №{order.id}</title>
      </Head>
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8">
          <div className="max-w-none mx-auto">
            <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
              
              {/* Заголовок */}
              <div className="mb-8">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-800 mb-4">
                    Заказ №{order.id}
                  </h1>
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
                      <h3 className="text-lg font-semibold text-white mb-4">Информация о клиенте</h3>
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
                  <div className="pt-6 border-t border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Техническая информация</h3>
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
                            <p className="text-white font-medium whitespace-pre-line text-sm">{order.note}</p>
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
                    <div className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-4">Информация по модерну</h3>
                      
                      <div className="space-y-4">
                        {/* Уведомления для модерна */}
                        {notifications.length > 0 && (
                          <div className="space-y-2">
                            {notifications.map((notification, index) => (
                              <div key={index} className={`p-3 rounded-lg border ${
                                notification.includes('Модерн записан') 
                                  ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                                  : 'bg-red-500/10 border-red-500/30 text-red-300'
                              }`}>
                                <p className="text-sm font-medium text-center">{notification}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="prepayment" className="text-white font-medium">Сумма предоплаты</Label>
                          <div className="relative">
                            <Input
                              id="prepayment"
                              type="number"
                              placeholder="0"
                              value={prepayment}
                              onChange={(e) => setPrepayment(e.target.value)}
                              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-sm">₽</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="closingDate" className="text-white font-medium">Дата закрытия</Label>
                          <Input
                            id="closingDate"
                            type="datetime-local"
                            value={dateClosmod}
                            onChange={(e) => setDateClosmod(e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="comment" className="text-white font-medium">Комментарий</Label>
                          <textarea
                            id="comment"
                            rows={4}
                            placeholder="Введите комментарий..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                    </div>
                  )}

                  {/* Поля ввода сумм - показываются если НЕ статус Модерн или блок модерна скрыт */}
                  {(order.statusOrder !== 'Модерн' || !showModernBlock) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="total" className="text-white font-medium">Итог</Label>
                        <div className="relative">
                          <Input
                            id="total"
                            type="number"
                            placeholder="0"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            disabled={isCompleted || order.statusOrder === 'Готово'}
                            className={`bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-8 ${(isCompleted || order.statusOrder === 'Готово') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-sm">₽</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expense" className="text-white font-medium">Расход</Label>
                        <div className="relative">
                          <Input
                            id="expense"
                            type="number"
                            placeholder="0"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            disabled={isCompleted || order.statusOrder === 'Готово'}
                            className={`bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-8 ${(isCompleted || order.statusOrder === 'Готово') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-sm">₽</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Текст "Чистыми" и "Сдача мастера" - показывается после завершения или при статусе "Готово" */}
                  {(isCompleted || order.statusOrder === 'Готово') && (
                    <div className="pt-4 border-t border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-white font-medium">Чистыми:</p>
                          <p className="text-green-400 text-lg font-semibold">{cleanAmount}₽</p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-white font-medium">Сдача мастера:</p>
                          <p className="text-blue-400 text-lg font-semibold">{masterChange}₽</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Уведомления о валидации - показываются если НЕ статус Модерн или блок модерна скрыт */}
                  {(order.statusOrder !== 'Модерн' || !showModernBlock) && notifications.length > 0 && (
                    <div className="space-y-2">
                      {notifications.map((notification, index) => (
                        <div key={index} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <p className="text-yellow-300 text-sm font-medium">{notification}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Документы - показываются если НЕ статус Модерн или блок модерна скрыт */}
                  {(order.statusOrder !== 'Модерн' || !showModernBlock) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Документы</h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-medium">Договор</span>
                            </div>
                            {order.statusOrder !== 'Готово' && order.statusOrder !== 'Незаказ' && order.statusOrder !== 'Отказ' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                              >
                                Прикрепить
                              </Button>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.bsoDoc ? (
                              <span className="text-green-400">Файл прикреплен: {order.bsoDoc}</span>
                            ) : (
                              'Файл не прикреплен'
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-medium">Чек расхода</span>
                            </div>
                            {order.statusOrder !== 'Готово' && order.statusOrder !== 'Незаказ' && order.statusOrder !== 'Отказ' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                              >
                                Прикрепить
                              </Button>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.expenditureDoc ? (
                              <span className="text-green-400">Файл прикреплен: {order.expenditureDoc}</span>
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
                    <h3 className="text-lg font-semibold text-white">Записи звонков</h3>
                    <div className="space-y-3">
                      {calls.length > 0 ? (
                        calls.map((call) => (
                          <div key={call.id} className="p-3 sm:p-4 bg-gray-700/30 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-medium text-sm sm:text-base">
                                  {call.status === 'incoming' ? 'Входящий' : 'Исходящий'} звонок
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm text-gray-600">
                                {new Date(call.dateCreate).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            <div className="space-y-1 mb-3">
                              <p className="text-xs sm:text-sm text-gray-300">
                                Клиент: {call.phoneClient}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-300">
                                Оператор: {call.operator?.name || 'Неизвестно'}
                              </p>
                            </div>
                            {call.recordingUrl && (
                              <div className="mt-3">
                                <audio 
                                  controls 
                                  className="w-full h-10 sm:h-12"
                                  style={{ 
                                    background: 'rgba(55, 65, 81, 0.5)',
                                    borderRadius: '8px'
                                  }}
                                >
                                  <source src={call.recordingUrl} type="audio/mpeg" />
                                  Ваш браузер не поддерживает аудио элемент.
                                </audio>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-gray-700/30 rounded-lg text-center">
                          <p className="text-gray-600">Записи звонков не найдены</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Чат Авито */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Чат Авито</h3>
                    {order.avitoChatId && order.avitoName ? (
                      <Button
                        onClick={handleOpenAvitoChat}
                        disabled={isLoadingChat}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-4 h-auto"
                      >
                        <div className="flex items-center justify-center space-x-3">
                          <div className="text-left">
                            <div className="font-semibold">
                              {isLoadingChat ? 'Загружаем чат...' : 'Просмотреть чат Авито'}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ) : (
                      <div className="p-4 bg-gray-700/30 rounded-lg text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <span className="text-gray-600 font-medium">Чат Авито не настроен</span>
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
        </div>
        
        {/* Фиксированные кнопки внизу экрана */}
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
          <div className="max-w-md mx-auto">
            {/* Уведомление о заблокированных кнопках */}
            {notifications.length > 0 && order?.statusOrder === 'В работе' && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm font-medium text-center">
                  Завершить заказ можно только после прикрепления всех необходимых документов
                </p>
              </div>
            )}
            
            {/* Ошибка валидации */}
            {validationError && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm font-medium text-center">
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

      {/* Модальное окно чата Авито */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            {/* Заголовок модального окна */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Чат Авито</h3>
                </div>
              </div>
              <Button
                onClick={() => setShowChatModal(false)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-0"
              >
                Закрыть
              </Button>
            </div>

            {/* Информация о чате */}
            {avitoChat && (
              <div className="p-4 border-b border-gray-700 bg-gray-700/30">
                <div className="flex items-center space-x-4">
                  {avitoChat.users && avitoChat.users.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {avitoChat.users[0].name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {avitoChat.users[0].name || 'Неизвестный пользователь'}
                        </p>
                      </div>
                    </div>
                  )}
                  {avitoChat.context?.value && (
                    <div className="ml-auto text-right">
                      <p className="text-white font-medium text-sm">
                        {avitoChat.context.value.title}
                      </p>
                      {avitoChat.context.value.price_string && (
                        <p className="text-green-400 text-sm">
                          {avitoChat.context.value.price_string}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Сообщения чата */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {avitoMessages.length > 0 ? (
                avitoMessages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.direction === 'out'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      <div className="text-sm">
                        {message.content?.text && (
                          <p className="whitespace-pre-wrap">{message.content.text}</p>
                        )}
                        {message.content?.image && (
                          <div className="mt-2">
                            <img
                              src={message.content.image.sizes?.['640x480'] || message.content.image.sizes?.['140x105']}
                              alt="Изображение"
                              className="max-w-full h-auto rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                // Открываем изображение в модальном окне
                                const imageUrl = message.content.image.sizes?.['1280x960'] || 
                                               message.content.image.sizes?.['640x480'] || 
                                               message.content.image.sizes?.['140x105']
                                if (imageUrl) {
                                  window.open(imageUrl, '_blank')
                                }
                              }}
                            />
                          </div>
                        )}
                        {message.content?.voice && (
                          <div className="mt-2 p-3 bg-gray-600 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-medium">Голосовое сообщение</p>
                                <p className="text-gray-600 text-xs">ID: {message.content.voice.voice_id}</p>
                              </div>
                              <button className="text-green-400 hover:text-green-300">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {message.content?.call && (
                          <div className="mt-2 p-3 bg-gray-600 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-medium">Звонок</p>
                                <p className="text-gray-600 text-xs">
                                  {message.content.call.status === 'missed' ? 'Пропущенный' : 'Завершенный'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {message.content?.item && (
                          <div className="mt-2 p-2 bg-gray-600 rounded">
                            <p className="font-medium">{message.content.item.title}</p>
                            {message.content.item.price_string && (
                              <p className="text-green-400">{message.content.item.price_string}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.created * 1000).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-600 py-8">
                  <p>Сообщения не найдены</p>
                </div>
              )}
            </div>

            {/* Поле ввода сообщения */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isSendingMessage || isUploadingImage}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploadingImage}
                />
                <label
                  htmlFor="image-upload"
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                    isUploadingImage
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isUploadingImage ? (
                    'Загрузка...'
                  ) : (
                    'Изображение'
                  )}
                </label>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSendingMessage || isUploadingImage}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6"
                >
                  {isSendingMessage ? (
                    'Отправка...'
                  ) : (
                    'Отправить'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail
