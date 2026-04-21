'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { useDesignStore } from '@/store/design.store'
import { NetworkError } from '@/components/ui/network-error'
import { AppLoadingBlock, LoadingScreen } from '@/components/ui/loading-screen'

interface Order {
  id: number
  rkId: number
  rk?: { id: number; name: string }
  cityId: number
  city?: { id: number; name: string }
  clientName: string
  phone: string
  statusId: number
  status?: { id: number; name: string; code: string }
  result: number
  clean: number
  masterChange: number
  createdAt: string
  closingAt?: string
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
  rkId: number
  rk?: { id: number; name: string }
  cityId: number
  city?: { id: number; name: string }
  clientName: string
  phone: string
  statusId: number
  status?: { id: number; name: string; code: string }
  result: number
  clean: number
  masterChange: number
  createdAt: string
  closingAt?: string
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

function PaymentsContent() {
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  const [orders, setOrders] = useState<Order[]>([])
  const [cashSubmissions, setCashSubmissions] = useState<CashSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [submissionAmount, setSubmissionAmount] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])
  const [loadError, setLoadError] = useState('')
  const [statusTab, setStatusTab] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Сброс пагинации при изменении таба
  useEffect(() => {
    setCurrentPage(1)
  }, [statusTab])

  // Функции фильтрации по табам
  const getAllFilteredItems = () => {
    const ordersArray = Array.isArray(orders) ? orders : []
    const cashSubmissionsArray = Array.isArray(cashSubmissions) ? cashSubmissions : []
    
    const filteredSubmissions = cashSubmissionsArray.filter(
      submission => submission.cashSubmissionStatus && submission.cashSubmissionStatus !== 'not_submitted'
    )
    
    if (statusTab === 'all') {
      const notSubmittedOrders = ordersArray.filter(order => order.cashSubmissionStatus === 'Не отправлено')
      return [...notSubmittedOrders, ...filteredSubmissions]
    } else if (statusTab === 'Не отправлено') {
      return ordersArray.filter(order => order.cashSubmissionStatus === 'Не отправлено')
    } else {
      return filteredSubmissions.filter(submission => submission.cashSubmissionStatus === statusTab)
    }
  }

  // Функция сортировки по статусам
  const sortItemsByStatus = (items: (Order | CashSubmission)[]) => {
    const statusOrder = {
      'Не отправлено': 1,
      'На проверке': 2,
      'Одобрено': 3,
      'Отклонено': 4
    }
    
    return [...items].sort((a, b) => {
      const statusA = a.cashSubmissionStatus || 'Не отправлено'
      const statusB = b.cashSubmissionStatus || 'Не отправлено'
      
      const orderA = statusOrder[statusA as keyof typeof statusOrder] || 999
      const orderB = statusOrder[statusB as keyof typeof statusOrder] || 999
      
      return orderA - orderB
    })
  }

  const getCurrentPageItems = () => {
    const allItems = getAllFilteredItems()
    const sortedItems = sortItemsByStatus(allItems)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedItems.slice(startIndex, endIndex)
  }

  const getTotalPages = () => {
    const allItems = getAllFilteredItems()
    return Math.ceil(allItems.length / itemsPerPage)
  }

  // Суммы для отображения
  const getNotSubmittedSum = () => {
    const ordersArray = Array.isArray(orders) ? orders : []
    return ordersArray
      .filter(order => order.cashSubmissionStatus === 'Не отправлено')
      .reduce((sum, order) => {
        const amount = typeof order.masterChange === 'number' ? order.masterChange : (order.masterChange ? parseFloat(String(order.masterChange)) : 0)
        return sum + amount
      }, 0)
  }

  const getOnReviewSum = () => {
    const cashSubmissionsArray = Array.isArray(cashSubmissions) ? cashSubmissions : []
    return cashSubmissionsArray
      .filter(submission => submission.cashSubmissionStatus === 'На проверке')
      .reduce((sum, submission) => {
        const amount = typeof submission.masterChange === 'number' ? submission.masterChange : (submission.masterChange ? parseFloat(String(submission.masterChange)) : 0)
        return sum + amount
      }, 0)
  }

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
      setLoadError('')
      
      const ordersResponse = await apiClient.getOrders({ status: 'Готово' })
      if (ordersResponse.success) {
        setOrders(ordersResponse.data || [])
      }

      const submissionsResponse = await apiClient.getMasterCashSubmissions()
      if (submissionsResponse && submissionsResponse.data) {
        setCashSubmissions(submissionsResponse.data || [])
      }
    } catch (error) {
      setLoadError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitCash = (order: Order) => {
    setSelectedOrder(order)
    setSubmissionAmount(order.masterChange?.toString() || '')
    setShowSubmissionModal(true)
  }

  const handleSubmitCashSubmission = async () => {
    if (!selectedOrder) return

    try {
      setSubmitting(true)
      
      const result = await apiClient.submitCashForReview(
        selectedOrder.id,
        receiptFile || undefined
      )

      if (result.success) {
        setNotifications(['Сдача успешно отправлена на проверку'])
        setShowSubmissionModal(false)
        setSelectedOrder(null)
        setSubmissionAmount('')
        setReceiptFile(null)
        loadData()
      } else {
        setNotifications([result.error || 'Ошибка отправки сдачи'])
      }
    } catch (error) {
      setNotifications(['Ошибка отправки сдачи'])
    } finally {
      setSubmitting(false)
      setTimeout(() => setNotifications([]), 4000)
    }
  }

  // Стили статуса сдачи
  const getSubmissionStatusStyle = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'На проверке': return 'bg-yellow-700 text-white'
        case 'Одобрено': return 'bg-green-700 text-white'
        case 'Отклонено': return 'bg-red-700 text-white'
        case 'Не отправлено': return 'bg-gray-600 text-white'
        default: return 'bg-gray-600 text-white'
      }
    }
    switch (status) {
      case 'На проверке': return 'bg-yellow-500 text-white'
      case 'Одобрено': return 'bg-green-600 text-white'
      case 'Отклонено': return 'bg-red-600 text-white'
      case 'Не отправлено': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'На проверке': return 'На проверке'
      case 'Одобрено': return 'Подтверждено'
      case 'Отклонено': return 'Отклонено'
      case 'Не отправлено': return 'Не отправлена'
      default: return status
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      const day = String(date.getUTCDate()).padStart(2, '0')
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const year = date.getUTCFullYear()
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      
      return `${day}.${month}.${year} ${hours}:${minutes}`
    } catch {
      return '-'
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
    }`}>
      <div className={`px-4 ${loading ? 'py-0' : 'py-6'}`}>
        <div className="w-full">

          {/* Уведомления */}
          {notifications.length > 0 && (
            <div className="fixed top-20 right-4 z-50 space-y-2">
              {notifications.map((notification, index) => (
                <div key={index} className={`px-4 py-2 rounded-lg ${
                  isDark ? 'bg-teal-900/50 text-teal-300 border border-teal-700' : 'bg-teal-500/20 text-teal-800 border border-teal-500/30'
                }`}>
                  {notification}
                </div>
              ))}
            </div>
          )}

          {/* Суммы и табы — скрыты на время загрузки */}
          {!loading && (
          <>
          <div className={`rounded-[20px] p-4 mb-6 border ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Не сдано</div>
                <div className={`text-base font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatNumber(getNotSubmittedSum())} ₽</div>
              </div>
              <div className="text-center">
                <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>На проверке</div>
                <div className={`text-base font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatNumber(getOnReviewSum())} ₽</div>
              </div>
              <div className="text-center">
                <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Всего</div>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0a4f42]'}`}>{formatNumber(getNotSubmittedSum() + getOnReviewSum())} ₽</div>
              </div>
            </div>
          </div>

          <div className="mb-4 animate-slide-in-left">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 w-max">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'Не отправлено', label: 'Не сдано' },
                  { id: 'На проверке', label: 'На проверке' },
                  { id: 'Одобрено', label: 'Подтверждено' },
                  { id: 'Отклонено', label: 'Отклонено' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusTab(tab.id)}
                    className={`min-h-[40px] px-4 text-sm font-medium rounded-2xl transition-all duration-200 whitespace-nowrap ${
                      statusTab === tab.id
                        ? (isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42] text-white')
                        : (isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white bg-transparent' : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113] bg-transparent')
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          </>
          )}

          {loading && (
            <div className="flex w-full flex-col items-center justify-center min-h-[max(300px,calc(100dvh-10rem-env(safe-area-inset-bottom,0px)))] md:min-h-[min(560px,calc(100dvh-4rem))]">
              <AppLoadingBlock className="animate-fade-in" />
            </div>
          )}

          {/* Ошибка */}
          {!loading && !!loadError && (
            <NetworkError
              isDark={isDark}
              onRetry={loadData}
              message={loadError}
            />
          )}

          {/* Пустое состояние */}
          {!loading && !loadError && getCurrentPageItems().length === 0 && (
            <div className="text-center py-8 animate-fade-in">
              <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Нет записей для отображения</p>
            </div>
          )}

          {/* Десктопная таблица */}
          {!loading && getCurrentPageItems().length > 0 && (
            <div className="hidden md:block animate-fade-in">
              <table className={`w-full border-collapse text-xs rounded-[20px] shadow-lg ${
                isDark ? 'bg-white/[0.03]' : 'bg-white'
              }`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-black/[0.02] border-black/10'}`}>
                    <th className={`text-left py-2 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Заказ</th>
                    <th className={`text-left py-2 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Клиент</th>
                    <th className={`text-left py-2 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Сумма</th>
                    <th className={`text-center py-2 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Статус</th>
                    <th className={`text-left py-2 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentPageItems().map((item) => {
                    const isOrder = item.cashSubmissionStatus === 'Не отправлено'
                    return (
                      <tr 
                        key={isOrder ? item.id : `submission-${item.id}`}
                        className={`border-b transition-colors cursor-pointer ${
                          isDark 
                            ? 'border-white/10 hover:bg-white/[0.04]'
                            : 'border-black/10 hover:bg-black/[0.02]'
                        }`}
                        onClick={() => isOrder && handleSubmitCash(item)}
                      >
                        <td className={`py-2 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{item.id}</td>
                        <td className={`py-2 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{item.clientName}</td>
                        <td className={`py-2 px-3 font-semibold ${isDark ? 'text-white' : 'text-[#111113]'}`}>
                          {item.masterChange?.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSubmissionStatusStyle(item.cashSubmissionStatus || 'Не отправлено')}`}>
                            {getStatusLabel(item.cashSubmissionStatus || 'Не отправлено')}
                          </span>
                        </td>
                        <td className={`py-2 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                          {isOrder 
                            ? formatDate(item.closingAt)
                            : formatDate(item.cashSubmissionDate)
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Мобильные карточки */}
          {!loading && getCurrentPageItems().length > 0 && (
            <div className="md:hidden space-y-3 animate-fade-in">
              {getCurrentPageItems().map((item) => {
                const isOrder = item.cashSubmissionStatus === 'Не отправлено'
                return (
                  <div 
                    key={isOrder ? item.id : `submission-${item.id}`}
                    className={`rounded-[20px] overflow-hidden border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                      isDark 
                        ? 'bg-white/[0.03] border-white/10 hover:border-white/25'
                        : 'bg-white border-black/10 hover:border-black/30'
                    }`}
                    onClick={() => isOrder && handleSubmitCash(item)}
                  >
                    {/* Верхняя строка */}
                    <div className={`flex items-center justify-between px-3 py-2 border-b ${
                      isDark ? 'bg-white/[0.06] border-white/10' : 'bg-black/[0.02] border-black/10'
                    }`}>
                      <span className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{item.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSubmissionStatusStyle(item.cashSubmissionStatus || 'Не отправлено')}`}>
                        {getStatusLabel(item.cashSubmissionStatus || 'Не отправлено')}
                      </span>
                    </div>
                    
                    {/* Основной контент */}
                    <div className="px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.clientName || 'Без имени'}</span>
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#0a4f42]'}`}>
                          {item.masterChange?.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isOrder ? 'Закрыт: ' : 'Отправлено: '}
                        {isOrder ? formatDate(item.closingAt) : formatDate(item.cashSubmissionDate)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Пагинация */}
          {!loading && getTotalPages() > 1 && (
            <div className="mt-6 animate-fade-in">
              <OptimizedPagination
                currentPage={currentPage}
                totalPages={getTotalPages()}
                onPageChange={setCurrentPage}
                isDark={isDark}
              />
            </div>
          )}

          {/* Модальное окно для отправки сдачи */}
          {showSubmissionModal && selectedOrder && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className={`rounded-xl shadow-2xl w-full max-w-md ${
                isDark ? 'bg-[#2a3441] border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Отправить сдачу</h2>
                    <button
                      onClick={() => setShowSubmissionModal(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-5">
                    <div className={`rounded-lg p-4 ${
                      isDark ? 'bg-[#3a4451]' : 'bg-gray-50'
                    }`}>
                      <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Заказ</div>
                      <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{selectedOrder.id} • {selectedOrder.clientName}</div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Сумма сдачи
                      </label>
                      <Input
                        type="number"
                        value={submissionAmount}
                        readOnly
                        className={`cursor-not-allowed opacity-75 ${
                          isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-300 text-gray-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Чек/скриншот перевода
                      </label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className={`${
                          isDark 
                            ? 'bg-[#3a4451] border-gray-600 text-gray-100 file:bg-[#2a3441] file:border-gray-600 file:text-gray-300'
                            : 'bg-white border-gray-300 text-gray-800 file:bg-gray-100 file:border-gray-300 file:text-gray-700'
                        } file:rounded-md file:px-3 file:py-1 file:mr-3 file:text-sm`}
                      />
                      {receiptFile && (
                        <div className={`mt-2 text-sm ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                          Файл: {receiptFile.name}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSubmitCashSubmission}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Отправка...' : 'Отправить'}
                      </button>
                      <button
                        onClick={() => setShowSubmissionModal(false)}
                        className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium border-2 ${
                          isDark 
                            ? 'border-gray-600 text-gray-300 hover:bg-[#3a4451]'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Отмена
                      </button>
                    </div>
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

export default function PaymentsPage() {
  return (
    <Suspense fallback={<LoadingScreen embeddedInLayout />}>
      <PaymentsContent />
    </Suspense>
  )
}
