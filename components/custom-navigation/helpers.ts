import { FileText, Info } from 'lucide-react'

export const SCROLL_POSITION_KEY = 'orders_scroll_position'
export const NOTIFICATIONS_POSITION_KEY = 'notifications-panel-position-dir'
export const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed-dir'
export const DEFAULT_POSITION = { x: 240, y: 100 }

export function isRouteActive(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === '/orders' && pathname.startsWith('/orders')) return true
  if (href !== '/orders' && pathname.startsWith(`${href}/`)) return true
  return false
}

export function formatShortFio(fullName: string | undefined, login: string | undefined): string {
  const fallback = login?.trim() || 'Пользователь'
  if (!fullName?.trim()) return fallback
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0]!
  const last = parts[0]!
  const first = parts[1]!
  const pat = parts[2]
  const i1 = first[0]!.toUpperCase()
  if (pat) {
    const i2 = pat[0]!.toUpperCase()
    return `${last} ${i1}.${i2}.`
  }
  return `${last} ${i1}.`
}

export function formatNotificationTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'только что'
  if (diffMins < 60) return `${diffMins} мин назад`
  if (diffHours < 24) return `${diffHours} ч назад`
  return `${diffDays} дн назад`
}

export function getNotificationTypeIcon(type: string) {
  switch (type) {
    case 'order_created':
    case 'order_edited':
      return FileText
    default:
      return Info
  }
}
