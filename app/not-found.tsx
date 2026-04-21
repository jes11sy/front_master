'use client'

import { useLayoutEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLayout } from '@/components/layout-context'

export default function NotFound() {
  const { setHideLayout } = useLayout()

  useLayoutEffect(() => {
    setHideLayout(true)
    return () => setHideLayout(false)
  }, [setHideLayout])

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[#f5f5f7] px-4 text-[#1d1d1f] transition-colors duration-300 dark:bg-[#111113] dark:text-white">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex justify-center">
          <Image
            src="/images/images/logo_light_v2.png"
            alt="Новые Схемы"
            width={272}
            height={60}
            className="h-[52px] w-auto object-contain opacity-95 dark:hidden"
            priority
          />
          <Image
            src="/images/images/logo_dark_v2.png"
            alt="Новые Схемы"
            width={272}
            height={60}
            className="hidden h-[52px] w-auto object-contain opacity-95 dark:block"
            priority
          />
        </div>

        <p className="text-center text-[56px] font-semibold leading-none tracking-tight text-[#0a4f42] dark:text-white">
          404
        </p>
        <h1 className="mt-2 text-center text-[36px] font-semibold leading-tight">Страница не найдена</h1>
        <p className="mx-auto mt-3 max-w-[330px] text-center text-[16px] text-[#6e6e73] dark:text-white/65">
          Такой страницы нет. Проверь адрес или перейди в рабочие разделы.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/orders"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0a4f42] px-5 text-[17px] font-medium text-white transition-colors hover:bg-[#083f35] dark:bg-white dark:text-[#111113] dark:hover:bg-white/90"
          >
            К заказам
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#cfd2d8] bg-transparent px-5 text-[17px] font-medium text-[#111113] transition-colors hover:bg-white/55 dark:border-white/25 dark:text-white dark:hover:bg-white/[0.08]"
          >
            Войти
          </Link>
        </div>
      </div>
    </div>
  )
}
