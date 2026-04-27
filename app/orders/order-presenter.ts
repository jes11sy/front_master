export function formatOrderDate(dateString: string | null | undefined) {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '-'

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

export function getOrderStatusStyle(status: string, isDark: boolean) {
  if (isDark) {
    switch (status) {
      case 'Готово': return 'bg-green-700 text-white'
      case 'В работе': return 'bg-blue-700 text-white'
      case 'Ожидает': return 'bg-amber-600 text-white'
      case 'Отказ': return 'bg-red-700 text-white'
      case 'Принял': return 'bg-emerald-700 text-white'
      case 'В пути': return 'bg-violet-700 text-white'
      case 'Модерн': return 'bg-orange-600 text-white'
      case 'Незаказ': return 'bg-gray-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  switch (status) {
    case 'Готово': return 'bg-green-600 text-white'
    case 'В работе': return 'bg-blue-600 text-white'
    case 'Ожидает': return 'bg-amber-500 text-white'
    case 'Отказ': return 'bg-red-600 text-white'
    case 'Принял': return 'bg-emerald-600 text-white'
    case 'В пути': return 'bg-violet-600 text-white'
    case 'Модерн': return 'bg-orange-500 text-white'
    case 'Незаказ': return 'bg-gray-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

export function getOrderTypeStyle(type: string, isDark: boolean) {
  if (isDark) {
    switch (type) {
      case 'Впервые': return 'bg-emerald-700 text-white'
      case 'Повтор': return 'bg-amber-600 text-white'
      case 'Гарантия': return 'bg-red-700 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  switch (type) {
    case 'Впервые': return 'bg-emerald-600 text-white'
    case 'Повтор': return 'bg-amber-500 text-white'
    case 'Гарантия': return 'bg-red-600 text-white'
    default: return 'bg-gray-500 text-white'
  }
}
