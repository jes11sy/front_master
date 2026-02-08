'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ChevronLeft, Phone } from 'lucide-react'
import apiClient from '@/lib/api'
import { useMultipleFileUpload } from '@/hooks/useMultipleFileUpload'
import { MultipleFileUpload } from '@/components/MultipleFileUpload'
import { LoadingScreen, LoadingSpinner } from '@/components/ui/loading-screen'
import { useDesignStore } from '@/store/design.store'

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
  bsoDoc?: string[] | null
  expenditureDoc?: string[] | null
  expenditure?: number | null
  clean?: number | null
  masterChange?: number | null
  prepayment?: number | null
  dateClosmod?: string | null
  comment?: string | null
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

function OrderDetailPageContent() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  // Тема
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
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
  const [showCloseButton, setShowCloseButton] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [cleanAmount, setCleanAmount] = useState('')
  const [masterChange, setMasterChange] = useState('')
  
  // Состояния для полей модерна
  const [prepayment, setPrepayment] = useState('')
  const [dateClosmod, setDateClosmod] = useState('')
  const [comment, setComment] = useState('')

  // Хуки для множественной загрузки файлов
  const bsoUpload = useMultipleFileUpload(10)
  const expenditureUpload = useMultipleFileUpload(10)
  
  // Ref для предотвращения дублирующихся запросов
  const callsFetchedRef = useRef<Set<string>>(new Set())
  const orderFetchedRef = useRef(false)

  // Функция для загрузки звонков
  const fetchCalls = async (orderId: string) => {
    if (callsFetchedRef.current.has(orderId)) return
    callsFetchedRef.current.add(orderId)
    
    try {
      const response = await apiClient.getCallsByOrderId(orderId)
      if (response.success && response.data) {
        setCalls(response.data)
      }
    } catch {
      callsFetchedRef.current.delete(orderId)
    }
  }

  // Получаем прямые S3 URL для записей
  useEffect(() => {
    const loadRecordingUrls = () => {
      const urls: { [key: number]: string } = {}
      for (const call of calls) {
        if (call.recordingUrl) {
          const s3Url = `https://s3.twcstorage.ru/f7eead03-crmfiles/${call.recordingUrl}`
          urls[call.id] = s3Url
        }
      }
      setRecordingUrls(urls)
    }
    if (calls.length > 0) loadRecordingUrls()
  }, [calls])

  // Загружаем заказ из API
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || orderFetchedRef.current) return
      orderFetchedRef.current = true
      
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
          
          if (response.data.callId) {
            await fetchCalls(response.data.id.toString())
          }
          
          if (response.data.statusOrder === 'Готово') {
            setIsCompleted(true)
            setCleanAmount((response.data.clean || 0).toString())
            setMasterChange((response.data.masterChange || 0).toString())
          }
          
          setPrepayment(response.data.prepayment?.toString() || '')
          setDateClosmod(response.data.dateClosmod ? new Date(response.data.dateClosmod).toISOString().slice(0, 16) : '')
          setComment(response.data.comment || '')
          setShowModernBlock(response.data.statusOrder === 'Модерн')
          
          if (response.data.bsoDoc && Array.isArray(response.data.bsoDoc) && response.data.bsoDoc.length > 0) {
            bsoUpload.setExistingPreviews(response.data.bsoDoc)
          }
          if (response.data.expenditureDoc && Array.isArray(response.data.expenditureDoc) && response.data.expenditureDoc.length > 0) {
            expenditureUpload.setExistingPreviews(response.data.expenditureDoc)
          }
          
          // Валидация
          const newNotifications: string[] = []
          const totalNum = parseFloat(total) || 0
          const expenseNum = parseFloat(expense) || 0
          
          if (totalNum > 5000 && (!response.data.bsoDoc || response.data.bsoDoc.length === 0)) {
            newNotifications.push('Итог больше 5000₽ - необходимо прикрепить Договор')
          }
          if (expenseNum > 1001 && (!response.data.expenditureDoc || response.data.expenditureDoc.length === 0)) {
            newNotifications.push('Расход больше 1001₽ - необходимо прикрепить чек расхода')
          }
          setNotifications(newNotifications)
        } else {
          setError(response.error || 'Заказ не найден')
          orderFetchedRef.current = false
        }
      } catch (error: any) {
        setError(error.message || 'Ошибка загрузки заказа')
        orderFetchedRef.current = false
        if (error.message?.includes('401') || error.message?.includes('токен')) {
          router.push('/login')
        }
        if (error.message?.includes('403') || error.message?.includes('Недостаточно прав')) {
          router.push('/orders')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id])

  // Переключаемся на вкладку "Информация" если активна скрытая вкладка
  useEffect(() => {
    if (order && order.statusOrder === 'Ожидает' && (activeTab === 'documents' || activeTab === 'communications')) {
      setActiveTab('info')
    } else if (order && (order.statusOrder === 'Принял' || order.statusOrder === 'В пути') && activeTab === 'documents') {
      setActiveTab('info')
    }
  }, [order, activeTab])

  // Очистка blob URL
  useEffect(() => {
    const bsoCleanup = bsoUpload.cleanup
    const expenditureCleanup = expenditureUpload.cleanup
    return () => {
      bsoCleanup()
      expenditureCleanup()
    }
  }, [bsoUpload.cleanup, expenditureUpload.cleanup])

  // Функция для принятия заказа
  const handleAcceptOrder = async () => {
    if (!order) return
    try {
      setIsUpdating(true)
      const response = await apiClient.updateOrder(order.id.toString(), { statusOrder: 'Принял' })
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
      const response = await apiClient.updateOrder(order.id.toString(), { masterId: null })
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

  // Функция для сохранения файлов
  const saveFiles = async () => {
    if (!order) return
    const failedUploads: string[] = []
    
    try {
      const newBsoFiles = bsoUpload.files.filter(f => f.file !== null).map(f => f.file!);
      let bsoDocPaths: string[] = [];
      
      if (newBsoFiles.length > 0) {
        const bsoResults = await Promise.allSettled(
          newBsoFiles.map(file => apiClient.uploadFile(file, 'director/orders/bso_doc'))
        );
        
        bsoResults.forEach((result, index) => {
          if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value?.success)) {
            failedUploads.push(`Договор БСО: ${newBsoFiles[index].name}`)
          }
        })
        
        const newBsoPaths = bsoResults
          .filter((res): res is PromiseFulfilledResult<any> => 
            res.status === 'fulfilled' && res.value?.success && res.value?.data?.key)
          .map(res => res.value.data.key);
        
        const existingBsoPaths = bsoUpload.files.filter(f => f.file === null).map(f => f.preview);
        bsoDocPaths = [...existingBsoPaths, ...newBsoPaths];
      } else {
        bsoDocPaths = bsoUpload.files.filter(f => f.file === null).map(f => f.preview);
      }
      
      const newExpenditureFiles = expenditureUpload.files.filter(f => f.file !== null).map(f => f.file!);
      let expenditureDocPaths: string[] = [];
      
      if (newExpenditureFiles.length > 0) {
        const expenditureResults = await Promise.allSettled(
          newExpenditureFiles.map(file => apiClient.uploadFile(file, 'director/orders/expenditure_doc'))
        );
        
        expenditureResults.forEach((result, index) => {
          if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value?.success)) {
            failedUploads.push(`Чек расхода: ${newExpenditureFiles[index].name}`)
          }
        })
        
        const newExpenditurePaths = expenditureResults
          .filter((res): res is PromiseFulfilledResult<any> => 
            res.status === 'fulfilled' && res.value?.success && res.value?.data?.key)
          .map(res => res.value.data.key);
        
        const existingExpenditurePaths = expenditureUpload.files.filter(f => f.file === null).map(f => f.preview);
        expenditureDocPaths = [...existingExpenditurePaths, ...newExpenditurePaths];
      } else {
        expenditureDocPaths = expenditureUpload.files.filter(f => f.file === null).map(f => f.preview);
      }
      
      if (failedUploads.length > 0) {
        setNotifications([`Не удалось загрузить: ${failedUploads.join(', ')}`])
        setTimeout(() => setNotifications([]), 5000)
      }
      
      if (bsoDocPaths.length > 0 || expenditureDocPaths.length > 0 || newBsoFiles.length > 0 || newExpenditureFiles.length > 0) {
        const updateData: any = { bsoDoc: bsoDocPaths, expenditureDoc: expenditureDocPaths };
        const response = await apiClient.updateOrder(order.id.toString(), updateData);
        if (response.success && response.data) {
          setOrder(response.data);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // Универсальная функция для обновления статуса
  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return
    
    try {
      setIsUpdating(true)
      await saveFiles()
      
      const updateData: any = { statusOrder: newStatus }
      
      if (newStatus === 'Готово') {
        const total = parseFloat(totalAmount) || 0
        const expense = parseFloat(expenseAmount) || 0
        let clean = total - expense
        
        if (order.statusOrder === 'Модерн' && order.dateMeeting) {
          const meetingDate = new Date(order.dateMeeting)
          const today = new Date()
          const daysDiff = Math.floor((today.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24))
          if (daysDiff >= 7 && clean < 3000) clean = 3000
        }
        
        const masterChangeVal = clean <= 5000 ? clean * 0.6 : clean * 0.5
        updateData.result = total
        updateData.expenditure = expense
        updateData.clean = clean
        updateData.masterChange = masterChangeVal
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
          const total = parseFloat(totalAmount) || 0
          const expense = parseFloat(expenseAmount) || 0
          let clean = total - expense
          
          if (order.statusOrder === 'Модерн' && order.dateMeeting) {
            const meetingDate = new Date(order.dateMeeting)
            const today = new Date()
            const daysDiff = Math.floor((today.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff >= 7 && clean < 3000) clean = 3000
          }
          
          const masterChangeVal = clean <= 5000 ? clean * 0.6 : clean * 0.5
          setCleanAmount(clean.toString())
          setMasterChange(masterChangeVal.toString())
        }
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
    const hasBsoFiles = (order.bsoDoc && order.bsoDoc.length > 0) || bsoUpload.files.length > 0
    const hasExpenditureFiles = (order.expenditureDoc && order.expenditureDoc.length > 0) || expenditureUpload.files.length > 0
    
    if (total > 5000 && !hasBsoFiles) {
      newNotifications.push('Итог больше 5000₽ - необходимо прикрепить Договор')
    }
    if (expense > 1001 && !hasExpenditureFiles) {
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

  // Проверяем валидацию при изменении сумм или файлов
  useEffect(() => {
    if (totalAmount || expenseAmount) {
      validateAmounts()
    } else {
      setNotifications([])
    }
  }, [totalAmount, expenseAmount, bsoUpload.files, expenditureUpload.files])

  // Получить цвет статуса
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Ожидает': isDark ? 'bg-yellow-900/40 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
      'Принял': isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700',
      'В пути': isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-700',
      'В работе': isDark ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700',
      'Готово': isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700',
      'Отказ': isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700',
      'Модерн': isDark ? 'bg-cyan-900/40 text-cyan-400' : 'bg-cyan-100 text-cyan-700',
      'Незаказ': isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700'
    }
    return colors[status] || (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700')
  }

  // Получить цвет типа заказа
  const getOrderTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Впервые': isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700',
      'Повтор': isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700',
      'Гарантия': isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-700'
    }
    return colors[type] || (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700')
  }

  // Функция для рендеринга кнопок действий
  const renderActionButtons = () => {
    if (!order) return null
    const status = order.statusOrder
    const hasUnfulfilledRequirements = notifications.length > 0

    const buttonBase = "flex-1 font-medium py-3 text-base rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"

    switch (status) {
      case 'Ожидает':
        return (
          <>
            <button 
              onClick={handleAcceptOrder}
              disabled={isUpdating}
              className={`${buttonBase} bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white`}
            >
              {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Обновление...</> : 'Принять'}
            </button>
            <button 
              onClick={handleDeclineOrder}
              disabled={isUpdating}
              className={`${buttonBase} bg-red-600 hover:bg-red-700 text-white`}
            >
              {isUpdating ? 'Обновление...' : 'Отказаться'}
            </button>
          </>
        )

      case 'Принял':
        return (
          <button 
            onClick={() => handleUpdateStatus('В пути')}
            disabled={isUpdating}
            className={`${buttonBase} bg-purple-600 hover:bg-purple-700 text-white`}
          >
            {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Обновление...</> : 'В пути'}
          </button>
        )

      case 'В пути':
        return (
          <button 
            onClick={() => handleUpdateStatus('В работе')}
            disabled={isUpdating}
            className={`${buttonBase} bg-orange-600 hover:bg-orange-700 text-white`}
          >
            {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Обновление...</> : 'В работе'}
          </button>
        )

      case 'В работе':
        if (showCloseButton) {
          return (
            <button 
              onClick={() => {
                if (validateRequiredFields()) {
                  const total = parseFloat(totalAmount) || 0
                  const expense = parseFloat(expenseAmount) || 0
                  const newStatus = (total === 0 && expense === 0) ? 'Отказ' : 'Готово'
                  handleUpdateStatus(newStatus)
                }
              }}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className={`${buttonBase} bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white`}
            >
              {isUpdating ? 'Обновление...' : 'Провести'}
            </button>
          )
        }
        return (
          <>
            <button 
              onClick={() => handleUpdateStatus('Модерн')}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className={`${buttonBase} bg-blue-600 hover:bg-blue-700 text-white`}
            >
              {isUpdating ? 'Обновление...' : 'Модерн'}
            </button>
            <button 
              onClick={() => {
                setShowCloseButton(true)
                setActiveTab('documents')
              }}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className={`${buttonBase} bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white`}
            >
              {isUpdating ? 'Обновление...' : 'Закрыть'}
            </button>
          </>
        )

      case 'Модерн':
        if (!showModernBlock) {
          return (
            <button 
              onClick={() => {
                if (validateRequiredFields()) {
                  const total = parseFloat(totalAmount) || 0
                  const expense = parseFloat(expenseAmount) || 0
                  const newStatus = (total === 0 && expense === 0) ? 'Отказ' : 'Готово'
                  handleUpdateStatus(newStatus)
                }
              }}
              disabled={isUpdating || hasUnfulfilledRequirements}
              className={`${buttonBase} bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white`}
            >
              {isUpdating ? 'Обновление...' : 'Провести'}
            </button>
          )
        }
        return (
          <>
            <button 
              onClick={handleSaveModerData}
              disabled={isUpdating}
              className={`${buttonBase} bg-blue-600 hover:bg-blue-700 text-white`}
            >
              {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</> : 'Сохранить'}
            </button>
            <button 
              onClick={() => setShowModernBlock(false)}
              className={`${buttonBase} bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white`}
            >
              Закрыть заказ
            </button>
          </>
        )

      default:
        return null
    }
  }

  // === РЕНДЕРИНГ ===

  if (loading) {
    return <LoadingScreen message="Загрузка заказа" />
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <div className="text-center">
          <p className={`text-lg mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          <button 
            onClick={() => router.push('/orders')}
            className="px-6 py-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Заказ не найден</p>
          <button 
            onClick={() => router.push('/orders')}
            className="px-6 py-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors"
          >
            Вернуться к заказам
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="pb-24 md:pb-8">
        {/* Шапка */}
        <div className={`sticky top-0 z-40 ${isDark ? 'bg-[#2a3441]' : 'bg-white'} shadow-sm`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.back()}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#3a4451]' : 'hover:bg-gray-100'}`}
              >
                <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
              <div>
                <h1 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  Заказ #{order.id}
                </h1>
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusColor(order.statusOrder)}`}>
                {order.statusOrder}
              </span>
            </div>
            
            {/* Кнопка звонка */}
            <a 
              href={`tel:${order.phone}`}
              className="p-2.5 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors"
            >
              <Phone className="w-5 h-5" />
            </a>
          </div>

          {/* Табы */}
          <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'info'
                  ? 'text-[#0d5c4b]'
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Информация
              {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5c4b]" />}
            </button>
            
            {((order.statusOrder === 'В работе' && showCloseButton) || 
              !['Ожидает', 'Принял', 'В пути', 'В работе'].includes(order.statusOrder)) && (
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'documents'
                    ? 'text-[#0d5c4b]'
                    : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Итог
                {activeTab === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5c4b]" />}
              </button>
            )}
            
            {order.statusOrder !== 'Ожидает' && (
              <button
                onClick={() => setActiveTab('communications')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'communications'
                    ? 'text-[#0d5c4b]'
                    : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Звонки / Чат
                {activeTab === 'communications' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5c4b]" />}
              </button>
            )}
          </div>
        </div>

        {/* Контент */}
        <div className="p-4 space-y-4">
          {/* Вкладка: Информация */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Блок: Заказ */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                <div className={`px-4 py-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Заказ</h3>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип</div>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getOrderTypeColor(order.typeOrder)}`}>
                      {order.typeOrder || '-'}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>РК</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.rk || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Источник</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.avitoName || order.rk || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Направление</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.typeEquipment || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Блок: Клиент */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                <div className={`px-4 py-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Клиент</h3>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.city || '-'}</div>
                  </div>
                  <div className="p-4 col-span-2 sm:col-span-1">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Имя</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.clientName || '-'}</div>
                  </div>
                  <div className="p-4">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Телефон</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.phone || '-'}</div>
                  </div>
                  <div className="p-4 col-span-2 sm:col-span-1">
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Адрес</div>
                    <div className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.address || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Блок: Детали */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                <div className={`px-4 py-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Детали</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата встречи</div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {order.dateMeeting ? new Date(order.dateMeeting).toLocaleDateString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
                        }) : '-'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Проблема</div>
                    <div className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.problem || '-'}</div>
                  </div>
                  {order.note && (
                    <div>
                      <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Примечания</div>
                      <div className={`text-sm whitespace-pre-line ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{order.note}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Вкладка: Итог и документы */}
          {activeTab === 'documents' && ((order.statusOrder === 'В работе' && showCloseButton) || !['Ожидает', 'Принял', 'В пути', 'В работе'].includes(order.statusOrder)) && (
            <div className="space-y-4">
              {/* Блок модерна */}
              {order.statusOrder === 'Модерн' && showModernBlock && (
                <div className={`rounded-xl p-4 ${isDark ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-200'}`}>
                  <h3 className={`font-medium mb-4 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>Информация по модерну</h3>
                  
                  {notifications.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {notifications.map((notification, index) => (
                        <div key={index} className={`p-3 rounded-lg ${
                          notification.includes('Модерн записан') 
                            ? isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                            : isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700'
                        }`}>
                          <p className="text-sm font-medium text-center">{notification}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Сумма предоплаты</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          placeholder="0"
                          value={prepayment}
                          onChange={(e) => setPrepayment(e.target.value)}
                          className={`pr-8 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>₽</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Дата закрытия</Label>
                      <Input
                        type="datetime-local"
                        value={dateClosmod}
                        onChange={(e) => setDateClosmod(e.target.value)}
                        className={`mt-1 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                    
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Комментарий</Label>
                      <textarea
                        rows={3}
                        placeholder="Введите комментарий..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] ${
                          isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Поля ввода сумм */}
              {(order.statusOrder !== 'Модерн' || !showModernBlock) && (
                <div className={`rounded-xl shadow-sm p-4 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Итог</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          placeholder="0"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          disabled={isCompleted || order.statusOrder === 'Готово'}
                          className={`pr-8 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${
                            (isCompleted || order.statusOrder === 'Готово') ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>₽</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Расход</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          placeholder="0"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          disabled={isCompleted || order.statusOrder === 'Готово'}
                          className={`pr-8 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${
                            (isCompleted || order.statusOrder === 'Готово') ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>₽</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Чистыми и Сдача мастера */}
                  {(isCompleted || order.statusOrder === 'Готово') && (
                    <div className={`mt-4 pt-4 border-t grid grid-cols-2 gap-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div>
                        <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Чистыми</div>
                        <div className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-[#0d5c4b]'}`}>{cleanAmount}₽</div>
                      </div>
                      <div>
                        <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Сдача мастера</div>
                        <div className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-blue-600'}`}>{masterChange}₽</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Уведомления */}
              {(order.statusOrder !== 'Модерн' || !showModernBlock) && notifications.length > 0 && (
                <div className="space-y-2">
                  {notifications.map((notification, index) => (
                    <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-yellow-900/40 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                      <p className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>{notification}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Документы */}
              {(order.statusOrder !== 'Модерн' || !showModernBlock) && (
                <div className={`rounded-xl shadow-sm p-4 space-y-4 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                  <h3 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Документы</h3>
                  <MultipleFileUpload
                    label="Договор БСО"
                    files={bsoUpload.files}
                    dragOver={bsoUpload.dragOver}
                    setDragOver={bsoUpload.setDragOver}
                    handleFiles={bsoUpload.handleFiles}
                    removeFile={bsoUpload.removeFile}
                    disabled={['Готово', 'Незаказ', 'Отказ'].includes(order.statusOrder)}
                    canAddMore={bsoUpload.canAddMore}
                  />
                  <MultipleFileUpload
                    label="Чеки расходов"
                    files={expenditureUpload.files}
                    dragOver={expenditureUpload.dragOver}
                    setDragOver={expenditureUpload.setDragOver}
                    handleFiles={expenditureUpload.handleFiles}
                    removeFile={expenditureUpload.removeFile}
                    disabled={['Готово', 'Незаказ', 'Отказ'].includes(order.statusOrder)}
                    canAddMore={expenditureUpload.canAddMore}
                  />
                </div>
              )}
            </div>
          )}

          {/* Вкладка: Звонки и Чат */}
          {activeTab === 'communications' && order.statusOrder !== 'Ожидает' && (
            <div className="space-y-4">
              {/* Записи звонков */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                <div className={`px-4 py-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Записи звонков</h3>
                </div>
                <div className="p-4">
                  {calls.length > 0 ? (
                    <div className="space-y-3">
                      {calls.map((call) => (
                        <div key={call.id} className={`p-3 rounded-lg ${isDark ? 'bg-[#3a4451]' : 'bg-white border border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                              {call.status === 'incoming' ? 'Входящий' : 'Исходящий'}
                            </span>
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(call.dateCreate).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          {recordingUrls[call.id] && (
                            <audio controls className="w-full h-10">
                              <source src={recordingUrls[call.id]} type="audio/mpeg" />
                            </audio>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Записи не найдены</p>
                  )}
                </div>
              </div>

              {/* Чат Авито */}
              <div className={`rounded-xl shadow-sm ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                <div className={`px-4 py-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Чат Авито</h3>
                </div>
                <div className="p-4">
                  {order.avitoChatId && order.avitoName ? (
                    <button
                      onClick={() => router.push(`/orders/${order.id}/avito`)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Открыть чат Авито
                    </button>
                  ) : (
                    <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Чат Авито не настроен
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки действий - десктоп */}
        <div className="hidden md:block px-4 mt-4">
          {notifications.length > 0 && order?.statusOrder === 'В работе' && (
            <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-red-900/40 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium text-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                Завершить заказ можно только после прикрепления всех документов
              </p>
            </div>
          )}
          
          {validationError && (
            <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-red-900/40 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium text-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>{validationError}</p>
            </div>
          )}
          
          <div className="flex gap-3 max-w-2xl mx-auto">
            {renderActionButtons()}
          </div>
        </div>
      </div>
      
      {/* Кнопки действий - мобильные */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 p-4 z-50 ${isDark ? 'bg-[#1e2530]' : 'bg-white'} border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {notifications.length > 0 && order?.statusOrder === 'В работе' && (
          <div className={`mb-3 p-2 rounded-lg ${isDark ? 'bg-red-900/40' : 'bg-red-50'}`}>
            <p className={`text-xs font-medium text-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              Прикрепите все документы
            </p>
          </div>
        )}
        
        {validationError && (
          <div className={`mb-3 p-2 rounded-lg ${isDark ? 'bg-red-900/40' : 'bg-red-50'}`}>
            <p className={`text-xs font-medium text-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>{validationError}</p>
          </div>
        )}
        
        <div className="flex gap-3">
          {renderActionButtons()}
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  return <OrderDetailPageContent />
}
