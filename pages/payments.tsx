import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// Убрали все иконки из lucide-react
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
      submitted: 'bg-yellow-500/20 text-yellow-800 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-800 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-800 border-red-500/30',
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
      
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8">
          <div className="max-w-none mx-auto">
          {/* Суммы */}
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in mb-8" style={{borderColor: '#114643'}}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 text-center">Сдача на проверку</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Не сдано</div>
                <div className="text-lg font-bold text-gray-800">{formatNumber(getNotSubmittedSum())} ₽</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">На проверке</div>
                <div className="text-lg font-bold text-gray-800">{formatNumber(getOnReviewSum())} ₽</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Общая сумма</div>
                <div className="text-xl font-bold text-teal-600">{formatNumber(getNotSubmittedSum() + getOnReviewSum())} ₽</div>
              </div>
            </div>
          </div>

          {/* Уведомления */}
          {notifications.length > 0 && (
            <div className="fixed top-20 right-4 z-50 space-y-2">
              {notifications.map((notification, index) => (
                <div key={index} className="bg-teal-500/20 text-teal-800 border border-teal-500/30 px-4 py-2 rounded-lg">
                  {notification}
                </div>
              ))}
            </div>
          )}


          {/* Фильтр */}
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in mb-8" style={{borderColor: '#114643'}}>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-800">Фильтр по статусу</h3>
                </div>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="ghost"
                  size="sm"
                  className="md:hidden text-gray-600 hover:text-teal-600 hover:bg-teal-50 h-8 w-8 p-0"
                >
                  {showFilters ? 'Свернуть' : 'Развернуть'}
                </Button>
              </div>
            </div>
            <div className={`${showFilters ? 'block' : 'hidden md:block'}`}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-64 bg-white border-gray-300 text-gray-800">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                    Все статусы
                  </SelectItem>
                  <SelectItem value="not_submitted" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                    Не отправлена
                  </SelectItem>
                  <SelectItem value="submitted" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                    На проверке
                  </SelectItem>
                  <SelectItem value="approved" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                    Подтверждено
                  </SelectItem>
                  <SelectItem value="rejected" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                    Отклонено
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Объединенная таблица */}
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 text-center">Заказы и сдачи</h3>
            </div>
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-600">Загрузка...</div>
              ) : (
                <>
                  {/* Десктопная таблица */}
                  <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-300 hover:bg-gray-50">
                      <TableHead className="text-gray-700">Заказ</TableHead>
                          <TableHead className="text-gray-700">Клиент</TableHead>
                      <TableHead className="text-gray-700">Сумма</TableHead>
                          <TableHead className="text-gray-700">Статус сдачи</TableHead>
                          <TableHead className="text-gray-700">Дата закрытия</TableHead>
                    </TableRow>
                  </TableHeader>
                      <TableBody>
                        {getCurrentPageItems().map((item) => {
                          const isOrder = !item.cashSubmissionStatus || item.cashSubmissionStatus === 'not_submitted'
                          return (
                            <TableRow 
                              key={isOrder ? item.id : `submission-${item.id}`} 
                              className="border-gray-200 hover:bg-gray-50 cursor-pointer" 
                              onClick={() => isOrder && handleSubmitCash(item)}
                            >
                              <TableCell className="text-gray-800 font-medium">#{item.id}</TableCell>
                              <TableCell className="text-gray-600">{item.clientName}</TableCell>
                              <TableCell className="text-gray-800 font-semibold">
                                {item.masterChange?.toLocaleString('ru-RU')} ₽
                              </TableCell>
                              <TableCell>
                                {isOrder ? (
                                  <Badge className="bg-gray-500/20 text-gray-800 border-gray-500/30">
                                    Не отправлена
                                  </Badge>
                                ) : (
                                  getCashSubmissionStatusBadge(item.cashSubmissionStatus)
                                )}
                              </TableCell>
                              <TableCell className="text-gray-600">
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
                  <div className="md:hidden space-y-3">
                    {getCurrentPageItems().map((item) => {
                      const isOrder = !item.cashSubmissionStatus || item.cashSubmissionStatus === 'not_submitted'
                      return (
                        <div 
                          key={isOrder ? item.id : `submission-${item.id}`}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => isOrder && handleSubmitCash(item)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-800 font-semibold text-lg">#{item.id}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-800 font-semibold text-sm">
                                {item.masterChange?.toLocaleString('ru-RU')} ₽
                              </div>
                              <div className="mt-1">
                                {isOrder ? (
                                  <Badge className="bg-gray-500/20 text-gray-800 border-gray-500/30 text-xs">
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
                              <span className="text-gray-600 text-sm">Клиент:</span>
                              <span className="text-gray-800 text-sm font-medium">{item.clientName}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 text-sm">
                                {isOrder ? 'Дата закрытия:' : 'Дата отправки:'}
                              </span>
                              <span className="text-gray-700 text-sm">
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
                      <div className="text-center py-8 text-gray-600">
                        Нет заказов для сдачи
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Пагинация */}
            {getTotalPages() > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-300">
                <div className="text-sm text-gray-600">
                  Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, getAllFilteredItems().length)} из {getAllFilteredItems().length} заказов
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                  >
                    Назад
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
                              ? 'bg-teal-600 hover:bg-teal-700 text-white'
                              : 'text-gray-600 hover:text-teal-600 hover:bg-teal-50'
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
                    className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                  >
                    Вперед
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Модальное окно для отправки сдачи */}
          {showSubmissionModal && selectedOrder && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-gray-300 rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Отправить сдачу на проверку</h2>
                    <button
                      onClick={() => setShowSubmissionModal(false)}
                      className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Закрыть
                    </button>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Заказ</div>
                      <div className="text-gray-800 font-medium">#{selectedOrder.id} • {selectedOrder.clientName}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Сумма сдачи
                      </label>
                      <Input
                        type="number"
                        value={submissionAmount}
                        readOnly
                        className="bg-gray-100 border-gray-300 text-gray-800 cursor-not-allowed opacity-75"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Чек/скриншот перевода
                      </label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="bg-white border-gray-300 text-gray-800 file:bg-gray-100 file:border-gray-300 file:text-gray-700 file:rounded-md file:px-3 file:py-1 file:mr-3 file:text-sm hover:file:bg-gray-200 focus:border-teal-500 focus:ring-teal-500/20"
                        />
                        {receiptFile && (
                          <div className="mt-2 text-sm text-teal-600">
                            Файл выбран: {receiptFile.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        onClick={handleSubmitCashSubmission}
                        disabled={submitting || !submissionAmount}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center">
                            Отправка...
                          </div>
                        ) : (
                          'Отправить'
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowSubmissionModal(false)}
                        variant="outline"
                        className="flex-1 border-2 border-gray-300 text-gray-800 bg-white hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400 font-semibold py-3 text-base transition-colors"
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
