import { redirect } from 'next/navigation'

// Корневая страница - редиректит на заказы
// ClientLayout с AuthGuard проверит авторизацию и перенаправит на /login если нужно
export default function Home() {
  redirect('/orders')
}

