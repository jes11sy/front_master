'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Компактная кнопка для включения/выключения push-уведомлений
 */
export function PushNotificationButton() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    isSubscribing,
    isUnsubscribing,
  } = usePushNotifications();

  // Не показываем если не поддерживается
  if (!isSupported && !isLoading) {
    return null;
  }

  const isDisabled = isLoading || isSubscribing || isUnsubscribing;

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isDisabled || permission === 'denied'}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${isSubscribed 
          ? 'bg-[#0d5c4b]/10 text-[#0d5c4b] dark:bg-[#0d5c4b]/20 dark:text-[#10b981]' 
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={
        permission === 'denied' 
          ? 'Уведомления заблокированы в браузере' 
          : isSubscribed 
            ? 'Выключить уведомления' 
            : 'Включить уведомления'
      }
    >
      {/* Bell icon */}
      <svg 
        width="18" 
        height="18" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={isSubscribed ? 'text-[#0d5c4b] dark:text-[#10b981]' : ''}
      >
        {isSubscribed ? (
          // Bell ringing
          <>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            <path d="M4 2 2 4" />
            <path d="m22 2-2 2" />
          </>
        ) : (
          // Bell normal
          <>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </>
        )}
      </svg>
      
      <span className="hidden sm:inline">
        {isLoading 
          ? 'Загрузка...' 
          : isSubscribing 
            ? 'Подключение...'
            : isUnsubscribing
              ? 'Отключение...'
              : isSubscribed 
                ? 'Уведомления вкл' 
                : 'Уведомления'
        }
      </span>
    </button>
  );
}

/**
 * Полная карточка управления push-уведомлениями для страницы настроек
 */
export function PushNotificationCard() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    isIOSPWARequired,
    isStandalone,
    iosVersion,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isSubscribing,
    isUnsubscribing,
    isIOS,
  } = usePushNotifications();

  const [testSent, setTestSent] = useState(false);

  // Не показываем если не поддерживается и нет инструкции для iOS
  if (!isSupported && !isLoading && !isIOSPWARequired) {
    return null;
  }

  const handleTest = async () => {
    const success = await sendTestNotification();
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e2530] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            p-2.5 rounded-xl
            ${isSubscribed 
              ? 'bg-[#0d5c4b]/10 dark:bg-[#0d5c4b]/20' 
              : 'bg-gray-100 dark:bg-gray-700/50'
            }
          `}>
            {/* Bell icon */}
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={isSubscribed ? 'text-[#0d5c4b] dark:text-[#10b981]' : 'text-gray-400'}
            >
              {isSubscribed ? (
                <>
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  <path d="M4 2 2 4" />
                  <path d="m22 2-2 2" />
                </>
              ) : (
                <>
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              )}
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Push-уведомления
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading 
                ? 'Загрузка...' 
                : isSubscribed 
                  ? 'Включены' 
                  : permission === 'denied'
                    ? 'Заблокированы в браузере'
                    : 'Выключены'
              }
            </p>
          </div>
        </div>

        {/* Основная кнопка */}
        {permission !== 'denied' && !isIOSPWARequired && (
          <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading || isSubscribing || isUnsubscribing}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${isSubscribed 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                : 'bg-[#0d5c4b] text-white hover:bg-[#0a4a3c]'
              }
              disabled:opacity-50
            `}
          >
            {isSubscribing 
              ? 'Подключение...' 
              : isUnsubscribing 
                ? 'Отключение...'
                : isSubscribed 
                  ? 'Отключить' 
                  : 'Включить'
            }
          </button>
        )}
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Инструкция для iOS */}
      {isIOSPWARequired && (
        <div className="p-3 bg-[#0d5c4b]/10 border border-[#0d5c4b]/20 rounded-lg text-gray-700 dark:text-gray-300 text-sm">
          <p className="font-medium mb-2 text-gray-900 dark:text-white">Установите приложение</p>
          <p className="mb-2">Для получения уведомлений на iPhone/iPad:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Нажмите кнопку «Поделиться» внизу экрана</li>
            <li>Выберите «На экран Домой»</li>
            <li>Нажмите «Добавить»</li>
          </ol>
        </div>
      )}

      {/* Инструкция при заблокированных уведомлениях */}
      {permission === 'denied' && (
        <div className="p-3 bg-[#0d5c4b]/10 border border-[#0d5c4b]/20 rounded-lg text-gray-700 dark:text-gray-300 text-sm">
          <p className="font-medium mb-1 text-gray-900 dark:text-white">Уведомления заблокированы</p>
          <p>Разрешите уведомления в настройках браузера для этого сайта, затем обновите страницу.</p>
        </div>
      )}

      {/* Тестовое уведомление */}
      {isSubscribed && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <button
            onClick={handleTest}
            disabled={testSent}
            className="w-full py-2 text-sm text-[#0d5c4b] dark:text-[#10b981] hover:bg-[#0d5c4b]/10 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {testSent ? 'Тестовое уведомление отправлено!' : 'Отправить тестовое уведомление'}
          </button>
        </div>
      )}

      {/* Информация о типах уведомлений */}
      {isSubscribed && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-1">Вы будете получать уведомления:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Назначен новый заказ</li>
            <li>Заказ перенесен на другое время</li>
            <li>Заказ отменен</li>
            <li>Заказ передан другому мастеру</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Баннер для первого запроса разрешения на push
 */
export function PushPermissionBanner() {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    subscribe, 
    isSubscribing, 
    isIOSPWARequired,
    isLoading,
  } = usePushNotifications();
  
  const [dismissed, setDismissed] = useState(false);

  // Проверяем localStorage при монтировании
  useEffect(() => {
    const wasDismissed = localStorage.getItem('master-push-banner-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('master-push-banner-dismissed', 'true');
  };

  // Ждём загрузки
  if (isLoading) return null;

  // Не показываем если не поддерживается, уже подписан, или закрыт
  if (!isSupported || isSubscribed || dismissed || permission === 'denied' || isIOSPWARequired) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-[#1e2530] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        disabled={isSubscribing}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-[#0d5c4b]/10 dark:bg-[#0d5c4b]/20 rounded-xl">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0d5c4b] dark:text-[#10b981]">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>
        <div className="flex-1 pr-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1.5 text-base">
            Включить уведомления?
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            Получайте уведомления о новых заказах и изменениях, даже когда приложение закрыто
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={subscribe}
              disabled={isSubscribing}
              className="px-4 py-2 bg-[#0d5c4b] text-white text-sm font-medium rounded-lg hover:bg-[#0a4a3c] disabled:opacity-50 disabled:cursor-wait transition-colors flex items-center gap-2"
            >
              {isSubscribing && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubscribing ? 'Подключение...' : 'Включить'}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isSubscribing}
              className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-[#252d3a] rounded-lg transition-colors disabled:opacity-50"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
