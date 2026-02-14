'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import apiClient from '@/lib/api'
import { User, Edit2, LogOut, Eye, EyeOff, Save, X, Loader2, FileText, Camera, Bell, BellOff, Settings, Smartphone, Share, Plus, Home } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

// Интерфейс профиля мастера
interface MasterProfile {
  id: number
  name: string
  login: string
  cities: string[]
  statusWork: string
  dateCreate: string
  note: string | null
  tgId: string | null
  chatId: string | null
  passportDoc: string | null
  contractDoc: string | null
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileData, setProfileData] = useState<MasterProfile | null>(null)
  
  // Форма смены пароля
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showDocuments, setShowDocuments] = useState(false)

  // Push Notifications
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    isLoading: pushLoading,
    error: pushError,
    isSubscribing,
    isUnsubscribing,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    isIOSPWARequired,
    isIOS,
  } = usePushNotifications()

  // Push настройки
  const [showPushSettings, setShowPushSettings] = useState(false)
  const [showPWAInstructions, setShowPWAInstructions] = useState(false)
  const [disabledCities, setDisabledCities] = useState<string[]>([])
  const [disabledTypes, setDisabledTypes] = useState<string[]>([])

  // PWA установка
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstallPWA, setCanInstallPWA] = useState(false)

  // Типы уведомлений для мастера
  const notificationTypes = [
    { id: 'master_assigned', label: 'Назначен заказ' },
    { id: 'master_order_rescheduled', label: 'Заказ перенесен' },
    { id: 'master_order_rejected', label: 'Заказ отменен' },
    { id: 'master_order_reassigned', label: 'Заказ передан' },
  ]

  // Загружаем профиль мастера из API
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await apiClient.getMasterProfile()
        
        if (response.success && response.data) {
          setProfileData(response.data)
        } else {
          setError(response.error || 'Ошибка загрузки профиля')
        }
      } catch (error: any) {
        setError(error.message || 'Ошибка загрузки профиля')
        if (error.message?.includes('401') || error.message?.includes('токен')) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Загрузка настроек push-уведомлений
  useEffect(() => {
    const loadPushSettings = async () => {
      const savedDisabledCities = localStorage.getItem('master-push-disabled-cities')
      const savedDisabledTypes = localStorage.getItem('master-push-disabled-types')
      
      if (savedDisabledCities) {
        try {
          const cities = JSON.parse(savedDisabledCities)
          setDisabledCities(cities)
          // Синхронизируем с IndexedDB
          await saveToIndexedDB('master-push-disabled-cities', savedDisabledCities)
        } catch (e) {
          console.warn('Failed to parse disabled cities:', e)
        }
      }
      
      if (savedDisabledTypes) {
        try {
          const types = JSON.parse(savedDisabledTypes)
          setDisabledTypes(types)
          // Синхронизируем с IndexedDB
          await saveToIndexedDB('master-push-disabled-types', savedDisabledTypes)
        } catch (e) {
          console.warn('Failed to parse disabled types:', e)
        }
      }
    }

    loadPushSettings()
  }, [])

  // Отслеживание события beforeinstallprompt для PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstallPWA(true)
    }

    const handleAppInstalled = () => {
      console.log('[PWA] App installed')
      setDeferredPrompt(null)
      setCanInstallPWA(false)
      setShowPWAInstructions(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement profile update API
      setIsEditing(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов')
      return
    }
    
    setIsSaving(true)
    try {
      // TODO: Implement password change API
      setIsChangingPassword(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordError('Ошибка смены пароля')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Получаем инициалы для аватара
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleFileUpload = (field: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && profileData) {
      // TODO: Implement file upload
      setProfileData(prev => prev ? ({
        ...prev,
        [field]: file.name
      }) : null)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const cities = profileData?.cities || []

  // Определяем тип устройства для инструкций
  const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)

  // Функция сохранения в IndexedDB для Service Worker
  const saveToIndexedDB = async (key: string, value: string) => {
    try {
      const request = indexedDB.open('master-settings', 1)
      
      return new Promise<void>((resolve, reject) => {
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(['settings'], 'readwrite')
          const store = transaction.objectStore('settings')
          
          store.put({ key, value })
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
        }
        
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' })
          }
        }
      })
    } catch (error) {
      console.warn('Failed to save to IndexedDB:', error)
    }
  }

  // Управление настройками городов
  const handleCityToggle = async (city: string, enabled: boolean) => {
    const newDisabledCities = enabled 
      ? disabledCities.filter(c => c !== city)
      : [...disabledCities, city]
    
    setDisabledCities(newDisabledCities)
    const citiesJson = JSON.stringify(newDisabledCities)
    localStorage.setItem('master-push-disabled-cities', citiesJson)
    await saveToIndexedDB('master-push-disabled-cities', citiesJson)
  }

  // Управление настройками типов уведомлений
  const handleTypeToggle = async (type: string, enabled: boolean) => {
    const newDisabledTypes = enabled
      ? disabledTypes.filter(t => t !== type)
      : [...disabledTypes, type]
    
    setDisabledTypes(newDisabledTypes)
    const typesJson = JSON.stringify(newDisabledTypes)
    localStorage.setItem('master-push-disabled-types', typesJson)
    await saveToIndexedDB('master-push-disabled-types', typesJson)
  }

  // Функция установки PWA
  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available')
      setShowPWAInstructions(false)
      return
    }

    try {
      console.log('[PWA] Showing install prompt')
      deferredPrompt.prompt()
      
      const { outcome } = await deferredPrompt.userChoice
      console.log('[PWA] User choice:', outcome)
      
      setDeferredPrompt(null)
      setCanInstallPWA(false)
      
    } catch (error) {
      console.error('[PWA] Error during installation:', error)
      setShowPWAInstructions(false)
    }
  }

  // Функция для обработки клика по переключателю push
  const handlePushToggle = async () => {
    // Если push не поддерживается - показываем инструкции
    if (!pushSupported) {
      setShowPWAInstructions(true)
      return
    }

    // Обычная логика включения/выключения
    if (pushSubscribed) {
      await unsubscribePush()
    } else {
      await subscribePush()
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        <div className="max-w-2xl space-y-6">
          
          {/* Шапка профиля */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0d5c4b] flex items-center justify-center text-white text-xl font-medium">
                {profileData?.name ? getInitials(profileData.name) : <User className="w-8 h-8" />}
              </div>
              <div>
                <h1 className={`text-xl ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {profileData?.name || 'Мастер'}
                </h1>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{profileData?.login}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
                  profileData?.statusWork === 'active' 
                    ? isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                    : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                }`}>
                  {profileData?.statusWork === 'active' ? 'Активен' : profileData?.statusWork || 'Мастер'}
                </span>
              </div>
            </div>
            {!isEditing ? (
              <button 
                onClick={handleEdit} 
                className={`transition-colors ${isDark ? 'text-gray-500 hover:text-[#0d5c4b]' : 'text-gray-400 hover:text-[#0d5c4b]'}`}
              >
                <Edit2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancel} 
                  className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <X className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`transition-colors disabled:opacity-50 ${isDark ? 'text-[#0d5c4b] hover:text-[#0a4a3c]' : 'text-[#0d5c4b] hover:text-[#0a4a3c]'}`}
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>

          {/* Разделитель */}
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Информация */}
          <div className="space-y-4">
            {/* Города */}
            <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Города</span>
              <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                {cities.length > 0 ? cities.join(', ') : 'Не указаны'}
              </span>
            </div>

            {/* Дата регистрации */}
            <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Дата регистрации</span>
              <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                {profileData?.createdAt ? formatDate(profileData.createdAt) : profileData?.dateCreate ? formatDate(profileData.dateCreate) : 'Не указана'}
              </span>
            </div>

            {/* Telegram */}
            {profileData?.tgId && (
              <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Telegram ID</span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{profileData.tgId}</span>
              </div>
            )}

            {/* Примечание */}
            {profileData?.note && (
              <div className={`flex justify-between items-start py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Примечание</span>
                <span className={`text-right max-w-xs ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{profileData.note}</span>
              </div>
            )}
          </div>

          {/* Разделитель */}
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Документы */}
          <div className={`py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <button
              onClick={() => setShowDocuments(!showDocuments)}
              className={`w-full flex justify-between items-center transition-colors ${isDark ? 'text-gray-400 hover:text-teal-400' : 'text-gray-500 hover:text-teal-600'}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Документы</span>
              </div>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${showDocuments ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {showDocuments && (
              <div className="mt-3 space-y-3 pl-6">
            
            <div className="grid grid-cols-2 gap-4">
              {/* Паспорт */}
              <div>
                <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Фото паспорта</p>
                {isEditing ? (
                  <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'border-gray-600 hover:border-[#0d5c4b]' : 'border-gray-300 hover:border-[#0d5c4b]'
                  }`}>
                    <Camera className={`h-6 w-6 mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Загрузить</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('passportDoc', e)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className={`flex items-center gap-2 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{profileData?.passportDoc || 'Не загружен'}</span>
                  </div>
                )}
              </div>

              {/* Договор */}
              <div>
                <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Фото договора</p>
                {isEditing ? (
                  <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'border-gray-600 hover:border-[#0d5c4b]' : 'border-gray-300 hover:border-[#0d5c4b]'
                  }`}>
                    <Camera className={`h-6 w-6 mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Загрузить</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('contractDoc', e)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className={`flex items-center gap-2 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{profileData?.contractDoc || 'Не загружен'}</span>
                  </div>
                )}
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Разделитель */}
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* Смена пароля */}
          <div>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className={`text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-[#0d5c4b]' : 'text-gray-500 hover:text-[#0d5c4b]'}`}
            >
              {isChangingPassword ? 'Отмена' : 'Сменить пароль'}
            </button>

            {isChangingPassword && (
              <div className="mt-4 space-y-4">
                {/* Текущий пароль */}
                <div className="space-y-1">
                  <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Текущий пароль</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:border-[#0d5c4b] focus:outline-none ${
                        isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Новый пароль */}
                <div className="space-y-1">
                  <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Новый пароль</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:border-[#0d5c4b] focus:outline-none ${
                        isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Подтверждение пароля */}
                <div className="space-y-1">
                  <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Подтвердите пароль</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:border-[#0d5c4b] focus:outline-none ${
                        isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Ошибка */}
                {passwordError && (
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{passwordError}</p>
                )}

                {/* Кнопка сохранения */}
                <button
                  onClick={handlePasswordChange}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Сохранить пароль
                </button>
              </div>
            )}
          </div>

          {/* Push-уведомления */}
          <div className={`py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Push-уведомления</span>
              <div className="flex items-center gap-3">
                {pushLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Проверка...</span>
                  </div>
                ) : (
                  <>
                    {/* iOS-style toggle - всегда видимый */}
                    <button
                      onClick={handlePushToggle}
                      disabled={isSubscribing || isUnsubscribing}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
                        pushSubscribed 
                          ? 'bg-teal-600' 
                          : !pushSupported
                            ? isDark ? 'bg-yellow-600/30' : 'bg-yellow-400/30'
                            : isDark ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full shadow-lg transition-transform duration-200 ease-in-out ${
                          pushSubscribed 
                            ? 'translate-x-6 bg-white' 
                            : !pushSupported
                              ? 'translate-x-1 bg-yellow-400'
                              : 'translate-x-1 bg-white'
                        }`}
                      />
                      {(isSubscribing || isUnsubscribing) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        </div>
                      )}
                    </button>

                    {/* Статус или кнопка настроек */}
                    {!pushSupported ? (
                      <button
                        onClick={canInstallPWA ? handleInstallPWA : () => setShowPWAInstructions(true)}
                        className={`text-sm transition-colors ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'}`}
                      >
                        {canInstallPWA ? 'Установить' : 'Как установить?'}
                      </button>
                    ) : pushSubscribed ? (
                      <button
                        onClick={() => setShowPushSettings(!showPushSettings)}
                        className={`transition-colors ${isDark ? 'text-gray-400 hover:text-teal-400' : 'text-gray-500 hover:text-teal-600'}`}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Настройки push-уведомлений */}
            {showPushSettings && pushSubscribed && (
              <div className="mt-3 space-y-3 pl-0">
                {/* Настройки по городам */}
                {cities.length > 0 && (
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Уведомления по городам
                    </h4>
                    <div className="space-y-2">
                      {cities.map((city) => (
                        <div key={city} className="flex items-center justify-between">
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {city}
                          </span>
                          <button
                            onClick={() => handleCityToggle(city, disabledCities.includes(city))}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out ${
                              !disabledCities.includes(city) 
                                ? 'bg-teal-600' 
                                : isDark ? 'bg-gray-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                                !disabledCities.includes(city) ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Настройки по типам уведомлений */}
                <div>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Типы уведомлений
                  </h4>
                  <div className="space-y-2">
                    {notificationTypes.map((type) => (
                      <div key={type.id} className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {type.label}
                        </span>
                        <button
                          onClick={() => handleTypeToggle(type.id, disabledTypes.includes(type.id))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out ${
                            !disabledTypes.includes(type.id) 
                              ? 'bg-teal-600' 
                              : isDark ? 'bg-gray-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                              !disabledTypes.includes(type.id) ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ошибки или подсказки */}
            {!pushLoading && pushError && (
              <p className={`text-xs mt-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{pushError}</p>
            )}
          </div>

          {/* Разделитель */}
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

          {/* PWA Installation Instructions Modal */}
          {showPWAInstructions && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className={`max-w-md w-full rounded-2xl p-6 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${isDark ? 'bg-teal-600/20' : 'bg-teal-100'}`}>
                    <Smartphone className="h-5 w-5 text-teal-600" />
                  </div>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    Установка приложения
                  </h3>
                </div>
                
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Для получения push-уведомлений установите приложение на домашний экран
                </p>

                {/* Инструкции для iOS */}
                {!isAndroid && (
                  <div className="space-y-3 mb-4">
                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      Инструкция для iPhone/iPad:
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                        <span>Нажмите кнопку <Share className="inline h-4 w-4 mx-1" /> внизу экрана</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                        <span>Выберите "На экран Домой" <Home className="inline h-4 w-4 mx-1" /></span>
                      </div>
                      <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                        <span>Нажмите "Добавить"</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Инструкции для Android */}
                {isAndroid && (
                  <div className="space-y-3 mb-4">
                    <h4 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      Инструкция для Android:
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                        <span>Нажмите меню ⋮ в правом верхнем углу</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                        <span>Выберите "Установить приложение" или "Добавить на главный экран"</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                        <span>Подтвердите установку</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Кнопки */}
                <div className="flex gap-3 mt-6">
                  {canInstallPWA ? (
                    <>
                      <button
                        onClick={() => setShowPWAInstructions(false)}
                        className={`flex-1 py-2 px-4 rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        Позже
                      </button>
                      <button
                        onClick={handleInstallPWA}
                        className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Установить сейчас
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowPWAInstructions(false)}
                      className="w-full py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Понятно
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Выход */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center justify-start gap-2 transition-colors disabled:opacity-50 ${
              isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'
            }`}
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
          </button>

        </div>
      </div>
    </div>
  )
}
