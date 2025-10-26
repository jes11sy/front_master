import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye, Search, Filter, ChevronDown, ChevronUp, Upload, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { apiClient } from '@/lib/api'

interface Order {
  id: number
  rk: string
  city: string
  clientName: string
  phone: string
  statusOrder: string
  result: number
  clean: number
  masterChange: number
  createDate: string
  closingData?: string
  cashSubmissionStatus?: string
  cashSubmissionDate?: string
  cashSubmissionAmount?: number
  cashReceiptDoc?: string
  cashApprovedDate?: string
  master?: {
    id: number
    name: string
  }
  cashApprovedByDirector?: {
    id: number
    name: string
  }
}

interface CashSubmission {
  id: number
  rk: string
  city: string
  clientName: string
  phone: string
  statusOrder: string
  result: number
  clean: number
  masterChange: number
  createDate: string
  closingData?: string
  cashSubmissionStatus: string
  cashSubmissionDate: string
  cashSubmissionAmount: number
  cashReceiptDoc?: string
  cashApprovedDate?: string
  master?: {
    id: number
    name: string
  }
  cashApprovedByDirector?: {
    id: number
    name: string
  }
}

const Payments: NextPage = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [cashSubmissions, setCashSubmissions] = useState<CashSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [submissionAmount, setSubmissionAmount] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Сброс пагинации при изменении фильтра
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  // Функции фильтрации
  const getFilteredOrders = () => {
    if (statusFilter === 'all' || statusFilter === 'not_submitted') {
      return orders.filter(order => !order.cashSubmissionStatus || order.cashSubmissionStatus === 'not_submitted')
    }
    return []
  }

  const getFilteredSubmissions = () => {
    if (statusFilter === 'all') {
      return cashSubmissions
    }
    return cashSubmissions.filter(submission => submission.cashSubmissionStatus === statusFilter)
  }

  // Функции пагинации
  const getAllFilteredItems = () => {
    if (statusFilter === 'all') {
      // Показываем все: не отправленные заказы + все сдачи
      const notSubmittedOrders = orders.filter(order => !order.cashSubmissionStatus || order.cashSubmissionStatus === 'not_submitted')
      return [...notSubmittedOrders, ...cashSubmissions]
    } else if (statusFilter === 'not_submitted') {
      // Показываем только не отправленные заказы
      return orders.filter(order => !order.cashSubmissionStatus || order.cashSubmissionStatus === 'not_submitted')
    } else {
      // Показываем только сдачи с определенным статусом
      return cashSubmissions.filter(submission => submission.cashSubmissionStatus === statusFilter)
    }
  }

  const getCurrentPageItems = () => {
    const allItems = getAllFilteredItems()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allItems.slice(startIndex, endIndex)
  }

  const getTotalPages = () => {
    const allItems = getAllFilteredItems()
    return Math.ceil(allItems.length / itemsPerPage)
  }

  // Суммы для отображения
  const getNotSubmittedSum = () => {
    return orders
      .filter(order => !order.cashSubmissionStatus || order.cashSubmissionStatus === 'not_submitted')
      .reduce((sum, order) => {
        const amount = typeof order.masterChange === 'number' ? order.masterChange : parseFloat(order.masterChange?.toString() || '0')
        return sum + amount
      }, 0)
  }

  const getOnReviewSum = () => {
    return cashSubmissions
      .filter(submission => submission.cashSubmissionStatus === 'submitted')
      .reduce((sum, submission) => {
        const amount = typeof submission.masterChange === 'number' ? submission.masterChange : parseFloat(submission.masterChange?.toString() || '0')
        return sum + amount
      }, 0)
  }

  const getTotalPendingSum = () => {
    return getNotSubmittedSum() + getOnReviewSum()
  }

  // Функция для форматирования чисел
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Загружаем заказы со статусом "Готово"
      const ordersResponse = await apiClient.getOrders({ status: 'Готово' })
      if (ordersResponse.success) {
        setOrders(ordersResponse.data || [])
      }

      // Загружаем отправленные сдачи
      const submissionsResponse = await apiClient.getMasterCashSubmissions()
      if (submissionsResponse.success) {
        setCashSubmissions(submissionsResponse.data || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setNotifications(['Ошибка загрузки данных'])
      setTimeout(() => setNotifications([]), 4000)
    } finally {
      setLoading(false)
    }
  }

  // Функции для работы с сдачей на проверку
  const handleSubmitCash = (order: Order) => {
    setSelectedOrder(order)
    setSubmissionAmount(order.masterChange?.toString() || '')
    setShowSubmissionModal(true)
  }

  const handleSubmitCashSubmission = async () => {
    if (!selectedOrder || !submissionAmount) return

    try {
      setSubmitting(true)
      
      const result = await apiClient.submitCashForReview(
        selectedOrder.id.toString(),
        parseFloat(submissionAmount),
        receiptFile || undefined
      )

      if (result.success) {
        setNotifications(['Сдача успешно отправлена на проверку'])
        setShowSubmissionModal(false)
        setSelectedOrder(null)
        setSubmissionAmount('')
        setReceiptFile(null)
        loadData() // Перезагружаем данные
      } else {
        setNotifications([result.error || 'Ошибка отправки сдачи'])
      }
    } catch (error) {
      console.error('Ошибка отправки сдачи:', error)
      setNotifications(['Ошибка отправки сдачи'])
    } finally {
      setSubmitting(false)
      setTimeout(() => setNotifications([]), 4000)
    }
  }

  const getCashSubmissionStatusBadge = (status: string) => {
    const variants = {
      submitted: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-300 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    }
    
    const labels = {
      submitted: 'На проверке',
      approved: 'Подтверждено',
      rejected: 'Отклонено',
    }

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }


  return (
    <>
      <Head>
        <title>Сдача на проверку - Новые Схемы</title>
        <meta name="description" content="Управление сдачей на проверку в Новые Схемы" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 pt-24 space-y-6">
          {/* Суммы */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Не сдано</div>
                  <div className="text-lg font-bold text-white">{formatNumber(getNotSubmittedSum())} ₽</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">На проверке</div>
                  <div className="text-lg font-bold text-white">{formatNumber(getOnReviewSum())} ₽</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Общая сумма</div>
                  <div className="text-xl font-bold text-green-400">{formatNumber(getNotSubmittedSum() + getOnReviewSum())} ₽</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Уведомления */}
          {notifications.length > 0 && (
            <div className="fixed top-20 right-4 z-50 space-y-2">
              {notifications.map((notification, index) => (
                <div key={index} className="bg-green-500/20 text-green-300 border border-green-500/30 px-4 py-2 rounded-lg">
                  {notification}
                </div>
              ))}
            </div>
          )}


          {/* Фильтр */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <CardTitle className="text-white text-sm">Фильтр по статусу</CardTitle>
                </div>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="ghost"
                  size="sm"
                  className="md:hidden text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 w-8 p-0"
                >
                  {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className={`${showFilters ? 'block' : 'hidden md:block'}`}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-64 bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">
                    Все статусы
                  </SelectItem>
                  <SelectItem value="not_submitted" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">
                    Не отправлена
                  </SelectItem>
                  <SelectItem value="submitted" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">
                    На проверке
                  </SelectItem>
                  <SelectItem value="approved" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">
                    Подтверждено
                  </SelectItem>
                  <SelectItem value="rejected" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">
                    Отклонено
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Объединенная таблица */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-300">Загрузка...</div>
              ) : (
                <>
                  {/* Десктопная таблица */}
                  <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-gray-800/50">
                      <TableHead className="text-gray-300">Заказ</TableHead>
                          <TableHead className="text-gray-300">Клиент</TableHead>
                      <TableHead className="text-gray-300">Сумма</TableHead>
                          <TableHead className="text-gray-300">Статус сдачи</TableHead>
                          <TableHead className="text-gray-300">Дата закрытия</TableHead>
                    </TableRow>
                  </TableHeader>
                      <TableBody>
                        {getCurrentPageItems().map((item) => {
                          const isOrder = !item.cashSubmissionStatus || item.cashSubmissionStatus === 'not_submitted'
                          return (
                            <TableRow 
                              key={isOrder ? item.id : `submission-${item.id}`} 
                              className="border-gray-700 hover:bg-gray-800/50 cursor-pointer" 
                              onClick={() => isOrder && handleSubmitCash(item)}
                            >
                              <TableCell className="text-white font-medium">#{item.id}</TableCell>
                              <TableCell className="text-gray-300">{item.clientName}</TableCell>
                              <TableCell className="text-white font-semibold">
                                {item.masterChange?.toLocaleString('ru-RU')} ₽
                              </TableCell>
                              <TableCell>
                                {isOrder ? (
                                  <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
                                    Не отправлена
                                  </Badge>
                                ) : (
                                  getCashSubmissionStatusBadge(item.cashSubmissionStatus)
                                )}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {isOrder ? (
                                  item.closingData ? formatDate(item.closingData) : '-'
                                ) : (
                                  item.cashSubmissionDate ? formatDate(item.cashSubmissionDate) : '-'
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                </Table>
              </div>

                  {/* Мобильные карточки */}
                  <div className="md:hidden space-y-3 p-4">
                    {getCurrentPageItems().map((item) => {
                      const isOrder = !item.cashSubmissionStatus || item.cashSubmissionStatus === 'not_submitted'
                      return (
                        <div 
                          key={isOrder ? item.id : `submission-${item.id}`}
                          className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 cursor-pointer hover:bg-gray-800/70 transition-colors"
                          onClick={() => isOrder && handleSubmitCash(item)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-semibold text-lg">#{item.id}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-semibold text-sm">
                                {item.masterChange?.toLocaleString('ru-RU')} ₽
                              </div>
                              <div className="mt-1">
                                {isOrder ? (
                                  <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs">
                                    Не отправлена
                                  </Badge>
                                ) : (
                                  getCashSubmissionStatusBadge(item.cashSubmissionStatus)
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm">Клиент:</span>
                              <span className="text-white text-sm font-medium">{item.clientName}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm">
                                {isOrder ? 'Дата закрытия:' : 'Дата отправки:'}
                              </span>
                              <span className="text-gray-300 text-sm">
                                {isOrder ? (
                                  item.closingData ? formatDate(item.closingData) : '-'
                                ) : (
                                  item.cashSubmissionDate ? formatDate(item.cashSubmissionDate) : '-'
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {getCurrentPageItems().length === 0 && (
                      <div className="text-center py-8 text-gray-300">
                        Нет заказов для сдачи
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
            
            {/* Пагинация */}
            {getTotalPages() > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, getAllFilteredItems().length)} из {getAllFilteredItems().length} заказов
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`${
                            pageNum === currentPage
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                          } w-8 h-8 p-0`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                    disabled={currentPage === getTotalPages()}
                    className="text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Модальное окно для отправки сдачи */}
          {showSubmissionModal && selectedOrder && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Отправить сдачу на проверку</h2>
                    <button
                      onClick={() => setShowSubmissionModal(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-sm text-gray-400 mb-1">Заказ</div>
                      <div className="text-white font-medium">#{selectedOrder.id} • {selectedOrder.clientName}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Сумма сдачи
                      </label>
                      <Input
                        type="number"
                        value={submissionAmount}
                        readOnly
                        className="bg-gray-800/30 border-gray-600 text-white cursor-not-allowed opacity-75"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Чек/скриншот перевода
                      </label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="bg-gray-800/50 border-gray-600 text-white file:bg-gray-700 file:border-gray-600 file:text-gray-300 file:rounded-md file:px-3 file:py-1 file:mr-3 file:text-sm hover:file:bg-gray-600 focus:border-green-500 focus:ring-green-500/20"
                        />
                        {receiptFile && (
                          <div className="mt-2 text-sm text-green-400">
                            ✓ Файл выбран: {receiptFile.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        onClick={handleSubmitCashSubmission}
                        disabled={submitting || !submissionAmount}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Отправка...
                          </div>
                        ) : (
                          'Отправить'
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowSubmissionModal(false)}
                        variant="outline"
                        className="flex-1 border-2 border-gray-500 text-gray-800 bg-white hover:bg-gray-100 hover:text-gray-900 hover:border-gray-600 font-semibold py-3 text-base transition-colors"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Payments
