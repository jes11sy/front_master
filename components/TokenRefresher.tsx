'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1';

// 🔄 Silent Refresh - обновляем токен каждые 4 минуты (токен живёт 15 минут)
const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 минуты

/**
 * 🍪 TokenRefresher - проактивно обновляет httpOnly cookies сессию
 * Обновляет токены каждые 4 минуты пока страница открыта
 */
export function TokenRefresher() {
  const pathname = usePathname();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoginPage = pathname === '/login';

  // 🔄 Функция обновления токена через /auth/refresh
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data?.success) {
          logger.debug('🔄 Silent refresh successful');
          
          // Обновляем refresh token в IndexedDB если пришёл новый
          if (data?.data?.refreshToken) {
            try {
              const { saveRefreshToken } = await import('@/lib/remember-me');
              await saveRefreshToken(data.data.refreshToken);
            } catch {
              // Ignore IndexedDB errors
            }
          }
          
          return true;
        }
      }
      
      // 401/403 - токен невалиден
      if (response.status === 401 || response.status === 403) {
        logger.debug('Silent refresh failed - token expired or invalid');
        return false;
      }
      
      return false;
    } catch (error) {
      // Сетевые ошибки - просто пропускаем, попробуем позже
      logger.warn('Silent refresh network error, will retry');
      return false;
    }
  }, []);

  useEffect(() => {
    // 🍪 Пропускаем на страницах логина
    if (isLoginPage) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Проверяем есть ли сохранённый пользователь
    const savedUser = apiClient.getSavedUser();
    if (!savedUser) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 🔄 Silent Refresh - обновляем токен каждые 4 минуты пока страница открыта
    const silentRefresh = async () => {
      // Проверяем что не на странице логина
      if (typeof window !== 'undefined' && window.location.pathname.includes('/login')) {
        logger.debug('Skipping silent refresh - on login page');
        return;
      }

      logger.debug('🔄 Running silent refresh...');
      await refreshToken();
    };

    // Запускаем первый refresh через 1 минуту (даём время на инициализацию)
    const initialTimeout = setTimeout(silentRefresh, 60 * 1000);

    // Запускаем периодический refresh каждые 4 минуты
    intervalRef.current = setInterval(silentRefresh, REFRESH_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoginPage, refreshToken]);

  return null; // Компонент не рендерит ничего
}

export default TokenRefresher;
