import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

// VAPID публичный ключ - должен совпадать с бэкендом
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
  isLoading: boolean;
  error: string | null;
  /** iOS требует установки PWA на домашний экран для push */
  isIOSPWARequired: boolean;
  /** Приложение запущено как PWA (standalone) */
  isStandalone: boolean;
  /** Версия iOS (если устройство iOS) */
  iosVersion: number | null;
}

/**
 * Определяет, является ли устройство iOS
 */
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Получает версию iOS
 * Push в PWA поддерживается только с iOS 16.4+
 */
function getIOSVersion(): number | null {
  if (typeof window === 'undefined') return null;
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return null;
}

/**
 * Определяет, запущено ли приложение как PWA (standalone)
 */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');
}

/**
 * Конвертирует VAPID ключ из base64 в Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Хук для управления push-уведомлениями (Мастер)
 */
export const usePushNotifications = () => {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
    error: null,
    isIOSPWARequired: false,
    isStandalone: false,
    iosVersion: null,
  });
  
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  
  // Ref для доступа к функции подписки в useEffect
  const subscribeRef = useRef<() => Promise<void>>();

  // Обработка сообщения от SW о смене подписки
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        console.log('[Push Master] Подписка изменилась, переподписываемся...');
        subscribeRef.current?.();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Проверка поддержки и текущего состояния
  useEffect(() => {
    const checkSupport = async () => {
      const standalone = isStandalone();
      const iosDevice = isIOS();
      const iosVer = getIOSVersion();
      
      // Базовая проверка поддержки API
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;
      const hasNotification = 'Notification' in window;
      
      console.log('[Push Master] Проверка поддержки:', {
        isIOS: iosDevice,
        iosVersion: iosVer,
        isStandalone: standalone,
        hasServiceWorker,
        hasPushManager,
        hasNotification,
      });
      
      // iOS Safari поддерживает Push только в PWA режиме (iOS 16.4+)
      const isIOSBrowser = iosDevice && !standalone;
      const isIOSTooOld = iosDevice && standalone && iosVer !== null && iosVer < 16.4;
      
      const isSupported = hasServiceWorker && hasPushManager && hasNotification && !isIOSBrowser && !isIOSTooOld;

      if (!hasServiceWorker || !hasPushManager || !hasNotification) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          isStandalone: standalone,
          isIOSPWARequired: false,
          iosVersion: iosVer,
          error: 'Push-уведомления не поддерживаются в этом браузере',
        }));
        return;
      }
      
      // iOS в браузере - нужно установить PWA
      if (isIOSBrowser) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          isStandalone: standalone,
          isIOSPWARequired: true,
          iosVersion: iosVer,
          error: 'На iOS добавьте приложение на домашний экран для получения уведомлений',
        }));
        return;
      }
      
      // iOS PWA но версия слишком старая
      if (isIOSTooOld) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          isStandalone: standalone,
          isIOSPWARequired: false,
          iosVersion: iosVer,
          error: `Push-уведомления требуют iOS 16.4 или новее (текущая: ${iosVer})`,
        }));
        return;
      }

      // Проверяем разрешение
      const permission = Notification.permission;
      console.log('[Push Master] Текущее разрешение:', permission);

      // Проверяем текущую подписку с таймаутом
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('SW ready timeout')), 5000);
        });
        
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          timeoutPromise
        ]);
        
        const subscription = await registration.pushManager.getSubscription();
        console.log('[Push Master] Текущая подписка:', subscription ? 'есть' : 'нет');
        
        // Синхронизируем localStorage с реальным состоянием подписки
        if (subscription) {
          localStorage.setItem('master-push-subscribed', 'true');
        } else {
          localStorage.removeItem('master-push-subscribed');
        }
        
        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          permission,
          isLoading: false,
          error: null,
          isIOSPWARequired: false,
          isStandalone: standalone,
          iosVersion: iosVer,
        });
      } catch (error) {
        console.error('[Push Master] Ошибка проверки:', error);
        setState(prev => ({
          ...prev,
          isSupported: true,
          isSubscribed: false,
          permission,
          isLoading: false,
          isStandalone: standalone,
          isIOSPWARequired: false,
          iosVersion: iosVer,
          error: null,
        }));
      }
    };

    checkSupport();
  }, []);

  // Подписка на push
  const subscribe = useCallback(async () => {
    const iosDevice = isIOS();
    const standalone = isStandalone();
    
    console.log('[Push Master] subscribe() вызван', { isIOS: iosDevice, isStandalone: standalone });
    
    if (!VAPID_PUBLIC_KEY) {
      setState(prev => ({ ...prev, error: 'VAPID ключ не настроен' }));
      return;
    }

    if (!('Notification' in window)) {
      setState(prev => ({ ...prev, error: 'Уведомления не поддерживаются' }));
      return;
    }
    
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, error: 'Service Worker не поддерживается' }));
      return;
    }
    
    const currentPermission = Notification.permission;
    console.log('[Push Master] Текущее разрешение:', currentPermission);
    
    if (currentPermission === 'denied') {
      setState(prev => ({ ...prev, permission: 'denied', error: 'Уведомления заблокированы в настройках браузера' }));
      return;
    }

    // Если разрешение уже есть - сразу подписываемся
    if (currentPermission === 'granted') {
      console.log('[Push Master] Разрешение есть, подписываемся...');
      setIsSubscribing(true);
      try {
        await doSubscribe();
      } finally {
        setIsSubscribing(false);
      }
      return;
    }

    // Запрашиваем разрешение
    console.log('[Push Master] Запрашиваем разрешение...');
    
    let permission: NotificationPermission;
    
    try {
      permission = await Notification.requestPermission();
      console.log('[Push Master] Результат requestPermission:', permission);
    } catch (permError) {
      console.error('[Push Master] Ошибка requestPermission:', permError);
      setState(prev => ({ ...prev, error: 'Не удалось запросить разрешение на уведомления' }));
      return;
    }
    
    if (permission === 'default' && iosDevice && standalone) {
      console.error('[Push Master] iOS PWA: requestPermission вернул default без показа диалога');
      setState(prev => ({ ...prev, error: 'Не удалось показать запрос разрешения. Попробуйте перезапустить приложение' }));
      return;
    }
    
    if (permission === 'denied') {
      setState(prev => ({ ...prev, permission: 'denied', error: 'Вы отклонили разрешение на уведомления' }));
      return;
    }
    
    if (permission !== 'granted') {
      setState(prev => ({ ...prev, permission, error: 'Разрешение на уведомления не получено' }));
      return;
    }

    // Разрешение получено - подписываемся
    setState(prev => ({ ...prev, permission: 'granted', error: null }));
    console.log('[Push Master] Разрешение получено, запускаем подписку...');
    
    setIsSubscribing(true);
    try {
      await doSubscribe();
    } finally {
      setIsSubscribing(false);
    }
  }, []);
  
  // Сохраняем ref на функцию подписки
  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  // Внутренняя функция подписки
  const doSubscribe = async () => {
    try {
      console.log('[Push Master] Ожидаем готовности Service Worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push Master] Service Worker готов:', registration.scope);

      console.log('[Push Master] Подписываемся на PushManager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[Push Master] Подписка получена:', subscription.endpoint);

      // Отправляем подписку на сервер
      console.log('[Push Master] Отправляем подписку на сервер...');
      const response = await api.subscribeToPush(subscription.toJSON());
      console.log('[Push Master] Ответ сервера:', response);

      if (!response.success) {
        throw new Error('Сервер не сохранил подписку');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        error: null,
      }));
      localStorage.setItem('master-push-subscribed', 'true');

      // Отправляем тестовый push
      try {
        await api.sendTestPush();
      } catch (err) {
        console.warn('[Push Master] Тестовый push не отправлен:', err);
      }
    } catch (error: any) {
      console.error('[Push Master] Ошибка подписки:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Ошибка подписки на уведомления',
      }));
    }
  };

  // Отписка от push
  const unsubscribe = useCallback(async () => {
    setIsUnsubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        await api.unsubscribeFromPush(subscription.endpoint);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        error: null,
      }));
      localStorage.removeItem('master-push-subscribed');
    } catch (error: any) {
      console.error('[Push Master] Ошибка отписки:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Ошибка отписки',
      }));
    } finally {
      setIsUnsubscribing(false);
    }
  }, []);

  // Тестовое уведомление
  const sendTestNotification = useCallback(async () => {
    try {
      const response = await api.sendTestPush();
      return response.success || false;
    } catch (error) {
      console.error('[Push Master] Ошибка тестового push:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isSubscribing,
    isUnsubscribing,
    isIOS: isIOS(),
    isPushSubscribed: state.isSubscribed,
  };
};
