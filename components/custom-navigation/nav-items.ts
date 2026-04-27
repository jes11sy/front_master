import { Banknote, ChartColumnBig, ClipboardList, type LucideIcon, Users2 } from 'lucide-react'

export interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  { name: 'Заказы', href: '/orders', icon: ClipboardList },
  { name: 'Статистика', href: '/statistics', icon: ChartColumnBig },
  { name: 'Платежи', href: '/payments', icon: Banknote },
  { name: 'График работы', href: '/schedule', icon: Users2 },
]

/** Порядок вкладок снизу на мобильных: Статистика → Заказы → Платежи */
export const mobileBottomTabs: ReadonlyArray<NavigationItem> = [
  { name: 'Статистика', href: '/statistics', icon: ChartColumnBig },
  { name: 'Заказы', href: '/orders', icon: ClipboardList },
  { name: 'Платежи', href: '/payments', icon: Banknote },
]
