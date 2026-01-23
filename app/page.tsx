import { redirect } from 'next/navigation'

// Корневая страница - сразу редиректит на заказы
// AuthGuard на странице orders проверит авторизацию
export default function Home() {
  redirect('/orders')
}

