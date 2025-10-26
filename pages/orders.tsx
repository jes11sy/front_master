import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Filter, ChevronDown, ChevronUp, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/router'
import Navigation from '@/components/navigation'
import AuthGuard from '@/components/auth-guard'
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
  typeEquipment: string
  problem: string
  note: string | null
  createDate: string
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

const Orders: NextPage = () => {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Загружаем заказы из API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        console.log('Загружаем заказы для текущего мастера...')
        const response = await apiClient.getOrders()
        
        console.log('Ответ API:', response)
        
        if (response.success && response.data) {
          console.log('Заказы загружены:', response.data.orders?.length || 0, 'заказов')
          setOrders(response.data.orders || [])
        } else {
          console.error('Ошибка загрузки заказов:', response.error)
          setError(response.error || 'Ошибка загрузки заказов')
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке заказов:', error)
        setError(error.message || 'Ошибка загрузки заказов')
        // Если ошибка авторизации, очищаем токен и перенаправляем на логин
        if (error.message?.includes('401') || error.message?.includes('токен')) {
          apiClient.clearToken()
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [router])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Ожидает': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Принял': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'В пути': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'В работе': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Готово': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Отказ': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Модерн': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'Незаказ': 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }

    return (
      <Badge className={variants[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
        {status}
      </Badge>
    )
  }

  const getOrderTypeBadge = (orderType: string) => {
    const variants: Record<string, string> = {
      'Впервые': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Повтор': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Гарантия': 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }

    return (
      <Badge className={variants[orderType] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
        {orderType}
      </Badge>
    )
  }

  const handleOrderClick = (orderId: number) => {
    router.push(`/orders/${orderId}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // Используем UTC время, чтобы избежать проблем с часовыми поясами
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    })
  }

  const getStatusOrder = (status: string) => {
    const statusOrder = {
      'Ожидает': 1,
      'Принял': 2,
      'В пути': 3,
      'В работе': 4,
      'Модерн': 5,
      'Готово': 6,
      'Отказ': 7,
      'Незаказ': 8
    }
    return statusOrder[status as keyof typeof statusOrder] || 999
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toString().includes(searchTerm.toLowerCase()) ||
                         order.rk.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.statusOrder === statusFilter
    const matchesCity = cityFilter === 'all' || order.city === cityFilter
    
    return matchesSearch && matchesStatus && matchesCity
  }).sort((a, b) => {
    // Сначала сортируем по статусу
    const statusA = getStatusOrder(a.statusOrder)
    const statusB = getStatusOrder(b.statusOrder)
    
    if (statusA !== statusB) {
      return statusA - statusB
    }
    
    // Если статусы одинаковые, сортируем по дате создания (новые сверху)
    return new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
  })

  // Пагинация
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, cityFilter])

  return (
    <AuthGuard>
      <Head>
        <title>Заказы - Новые Схемы</title>
        <meta name="description" content="Управление заказами в Новые Схемы" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 pt-24 space-y-6">

          {/* Filters */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <CardTitle className="text-white text-sm">Фильтр</CardTitle>
                </div>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 w-8 p-0"
                >
                  {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Поиск по клиенту, проблеме, ID или РК..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 bg-gray-800/50 border-gray-700 text-white">
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Все статусы</SelectItem>
                      <SelectItem value="Ожидает" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Ожидает</SelectItem>
                      <SelectItem value="Принял" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Принял</SelectItem>
                      <SelectItem value="В пути" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">В пути</SelectItem>
                      <SelectItem value="В работе" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">В работе</SelectItem>
                      <SelectItem value="Готово" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Готово</SelectItem>
                      <SelectItem value="Отказ" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Отказ</SelectItem>
                      <SelectItem value="Модерн" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Модерн</SelectItem>
                      <SelectItem value="Незаказ" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Незаказ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="w-full sm:w-48 bg-gray-800/50 border-gray-700 text-white">
                      <SelectValue placeholder="Город" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Все города</SelectItem>
                      <SelectItem value="Москва" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Москва</SelectItem>
                      <SelectItem value="Санкт-Петербург" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Санкт-Петербург</SelectItem>
                      <SelectItem value="Екатеринбург" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Екатеринбург</SelectItem>
                      <SelectItem value="Новосибирск" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Новосибирск</SelectItem>
                      <SelectItem value="Казань" className="text-white focus:text-gray-900 focus:bg-gray-200 hover:text-gray-900 hover:bg-gray-200">Казань</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Orders List */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Список заказов</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                  <span className="ml-2 text-gray-300">Загрузка заказов...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <span className="ml-2 text-red-300">{error}</span>
                </div>
              ) : (
                <>
                  {/* Десктопная таблица */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700 hover:bg-gray-800/50">
                          <TableHead className="text-gray-300 w-20">ID</TableHead>
                          <TableHead className="text-gray-300 w-20">РК</TableHead>
                          <TableHead className="text-gray-300 w-32">Город</TableHead>
                          <TableHead className="text-gray-300 w-32">Тип заказа</TableHead>
                          <TableHead className="text-gray-300 min-w-[120px]">Имя клиента</TableHead>
                          <TableHead className="text-gray-300 min-w-[150px]">Проблема</TableHead>
                          <TableHead className="text-gray-300 min-w-[120px]">Адрес</TableHead>
                          <TableHead className="text-gray-300 w-36">Дата встречи</TableHead>
                          <TableHead className="text-gray-300 w-24">Статус</TableHead>
                          <TableHead className="text-gray-300 w-24 text-right">Итог</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentOrders.map((order) => (
                          <TableRow 
                            key={order.id} 
                            className="border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors"
                            onClick={() => handleOrderClick(order.id)}
                          >
                            <TableCell className="text-white font-medium text-sm">{order.id}</TableCell>
                            <TableCell className="text-gray-300 text-sm">{order.rk}</TableCell>
                            <TableCell className="text-gray-300 text-sm">{order.city}</TableCell>
                            <TableCell>{getOrderTypeBadge(order.typeOrder)}</TableCell>
                            <TableCell className="text-gray-300 text-sm">{order.clientName}</TableCell>
                            <TableCell className="text-gray-300 text-sm">{order.problem}</TableCell>
                            <TableCell className="text-gray-300 text-sm">{order.address}</TableCell>
                            <TableCell className="text-gray-300 text-sm">{formatDate(order.dateMeeting)}</TableCell>
                            <TableCell>{getStatusBadge(order.statusOrder)}</TableCell>
                            <TableCell className="text-white font-semibold text-sm text-right">
                              {order.result ? order.result.toLocaleString('ru-RU') + ' ₽' : '0 ₽'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Мобильные карточки */}
                  <div className="md:hidden space-y-3 p-4">
                    {currentOrders.map((order) => (
                      <div 
                        key={order.id}
                        className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 cursor-pointer hover:bg-gray-800/70 transition-colors"
                        onClick={() => handleOrderClick(order.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold text-lg">#{order.id}</span>
                            <span className="text-gray-400 text-sm">{order.rk}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-semibold text-sm">
                              {order.result ? order.result.toLocaleString('ru-RU') + ' ₽' : '0 ₽'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Клиент:</span>
                            <span className="text-white text-sm font-medium">{order.clientName}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Город:</span>
                            <span className="text-gray-300 text-sm">{order.city}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Тип:</span>
                            {getOrderTypeBadge(order.typeOrder)}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Статус:</span>
                            {getStatusBadge(order.statusOrder)}
                          </div>
                          
                          <div className="pt-2">
                            <div className="text-gray-400 text-sm mb-1">Проблема:</div>
                            <div className="text-gray-300 text-sm">{order.problem}</div>
                          </div>
                          
                          <div className="pt-2">
                            <div className="text-gray-400 text-sm mb-1">Адрес:</div>
                            <div className="text-gray-300 text-sm">{order.address}</div>
                          </div>
                          
                          <div className="pt-2">
                            <div className="text-gray-400 text-sm mb-1">Дата встречи:</div>
                            <div className="text-gray-300 text-sm">{formatDate(order.dateMeeting)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
            
            {/* Пагинация */}
            {!loading && !error && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Показано {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} из {filteredOrders.length} заказов
                  {totalPages > 1 && ` | Страница ${currentPage} из ${totalPages}`}
                </div>
                {totalPages > 1 && (
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
                      {(() => {
                        const pages = []
                        const maxVisiblePages = 7
                        
                        if (totalPages <= maxVisiblePages) {
                          // Показываем все страницы если их мало
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(
                              <Button
                                key={i}
                                variant={i === currentPage ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setCurrentPage(i)}
                                className={`${
                                  i === currentPage
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                } w-8 h-8 p-0`}
                              >
                                {i}
                              </Button>
                            )
                          }
                        } else {
                          // Умная пагинация с многоточием
                          const startPage = Math.max(1, currentPage - 2)
                          const endPage = Math.min(totalPages, currentPage + 2)
                          
                          // Первая страница
                          if (startPage > 1) {
                            pages.push(
                              <Button
                                key={1}
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                className="text-gray-400 hover:text-white hover:bg-gray-800/50 w-8 h-8 p-0"
                              >
                                1
                              </Button>
                            )
                            if (startPage > 2) {
                              pages.push(
                                <span key="ellipsis1" className="text-gray-400 px-1">
                                  ...
                                </span>
                              )
                            }
                          }
                          
                          // Страницы вокруг текущей
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <Button
                                key={i}
                                variant={i === currentPage ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setCurrentPage(i)}
                                className={`${
                                  i === currentPage
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                } w-8 h-8 p-0`}
                              >
                                {i}
                              </Button>
                            )
                          }
                          
                          // Последняя страница
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="ellipsis2" className="text-gray-400 px-1">
                                  ...
                                </span>
                              )
                            }
                            pages.push(
                              <Button
                                key={totalPages}
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className="text-gray-400 hover:text-white hover:bg-gray-800/50 w-8 h-8 p-0"
                              >
                                {totalPages}
                              </Button>
                            )
                          }
                        }
                        
                        return pages
                      })()}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}

export default Orders
