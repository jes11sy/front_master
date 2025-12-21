/**
 * Утилита для сортировки заказов
 * Используется как в онлайн, так и в оффлайн режиме
 */

export interface Order {
  id: number
  statusOrder: string
  dateMeeting: string
  closingData?: string
  [key: string]: any
}

// Порядок статусов для сортировки
const STATUS_ORDER: Record<string, number> = {
  'Ожидает': 1,
  'Принял': 2,
  'В пути': 3,
  'В работе': 4,
  'Модерн': 5,
  'Готово': 6,
  'Отказ': 7,
  'Незаказ': 8
}

/**
 * Сортирует заказы по статусу и дате
 * 1. Сначала по статусу (Ожидает -> Принял -> ... -> Незаказ)
 * 2. Внутри статуса по дате:
 *    - Для Готово/Отказ/Незаказ - по дате закрытия
 *    - Для остальных - по дате встречи
 */
export function sortOrders<T extends Order>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    // Сначала сортируем по статусу
    const statusA = STATUS_ORDER[a.statusOrder] || 999
    const statusB = STATUS_ORDER[b.statusOrder] || 999
    
    if (statusA !== statusB) {
      return statusA - statusB
    }

    // Внутри статуса сортируем по дате
    // Для статусов Готово, Отказ, Незаказ - по дате закрытия
    // Для остальных - по дате встречи
    const useClosingDate = ['Готово', 'Отказ', 'Незаказ'].includes(a.statusOrder)
    
    const dateA = useClosingDate 
      ? (a.closingData || a.dateMeeting)
      : a.dateMeeting
    const dateB = useClosingDate 
      ? (b.closingData || b.dateMeeting)
      : b.dateMeeting

    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
}

