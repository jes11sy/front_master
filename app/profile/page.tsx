'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import { apiClient } from '@/lib/api'
import { User, Edit2, LogOut, Eye, EyeOff, Save, X, Loader2, FileText, Upload, Settings, Smartphone, Share, Plus, Home } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { NetworkError } from '@/components/ui/network-error'
import { LoadingScreen } from '@/components/ui/loading-screen'

interface MasterProfile {
  id: number
  name: string
  login: string
  cityIds: number[]
  cities?: Array<{ id: number; name: string } | string>
  status: string
  note: string | null
  tgId: string | null
  chatId: string | null
  passport: string | null
  contract: string | null
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, logout } = useAuthStore()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  const isPreviewMode = searchParams.get('preview') === '1'

  const [profileData, setProfileData] = useState<MasterProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    note: '',
    telegramId: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    isSubscribing,
    isUnsubscribing,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    isIOS,
  } = usePushNotifications()

  const [showPushSettings, setShowPushSettings] = useState(false)
  const [showPWAInstructions, setShowPWAInstructions] = useState(false)
  const [disabledCities, setDisabledCities] = useState<string[]>([])
  const [disabledTypes, setDisabledTypes] = useState<string[]>([])
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstallPWA, setCanInstallPWA] = useState(false)

  const notificationTypes = [
    { id: 'master_assigned', label: 'Назначен заказ' },
    { id: 'master_order_rescheduled', label: 'Заказ перенесен' },
    { id: 'master_order_rejected', label: 'Заказ отменен' },
    { id: 'master_order_reassigned', label: 'Заказ передан' },
  ]

  useEffect(() => {
    const loadProfile = async () => {
      if (isPreviewMode) {
        setProfileData({
          id: Number(user?.id || 0),
          name: user?.name || 'Тестовый мастер',
          login: user?.login || 'preview.master',
          cities: user?.cities || ['Москва'],
          cityIds: [],
          status: 'active',
          note: 'Preview режим без API',
          tgId: '@preview_master',
          chatId: null,
          passport: null,
          contract: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        setFormData({
          name: user?.name || 'Тестовый мастер',
          note: 'Preview режим без API',
          telegramId: '@preview_master',
        })
        setLoading(false)
        setError(null)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.getMasterProfile()
        if (response.success && response.data) {
          setProfileData(response.data)
          setFormData({
            name: response.data.name || '',
            note: response.data.note || '',
            telegramId: response.data.tgId || '',
          })
        } else {
          setError(response.error || 'Ошибка загрузки профиля')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки профиля')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [isPreviewMode, user?.cities, user?.id, user?.login, user?.name])

  useEffect(() => {
    const loadPushSettings = async () => {
      const savedDisabledCities = localStorage.getItem('master-push-disabled-cities')
      const savedDisabledTypes = localStorage.getItem('master-push-disabled-types')

      if (savedDisabledCities) {
        try {
          const cities = JSON.parse(savedDisabledCities)
          setDisabledCities(cities)
          await saveToIndexedDB('master-push-disabled-cities', savedDisabledCities)
        } catch (e) {
          console.warn('Failed to parse disabled cities:', e)
        }
      }

      if (savedDisabledTypes) {
        try {
          const types = JSON.parse(savedDisabledTypes)
          setDisabledTypes(types)
          await saveToIndexedDB('master-push-disabled-types', savedDisabledTypes)
        } catch (e) {
          console.warn('Failed to parse disabled types:', e)
        }
      }
    }

    loadPushSettings()
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstallPWA(true)
    }
    const handleAppInstalled = () => {
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
    } catch (e) {
      console.warn('Failed to save to IndexedDB', e)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch (e) {
      console.error('Logout error:', e)
      setIsLoggingOut(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // В master пока нет публичного метода обновления профиля как в director.
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name,
              note: formData.note || null,
              tgId: formData.telegramId || null,
              passport: passportFile ? passportFile.name : prev.passport,
              contract: contractFile ? contractFile.name : prev.contract,
            }
          : prev
      )
      setIsEditing(false)
      setPassportFile(null)
      setContractFile(null)
    } catch (e) {
      console.error('Save error:', e)
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
      setIsChangingPassword(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      console.error('Password change error:', e)
      setPasswordError('Ошибка смены пароля')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePushToggle = async () => {
    if (!pushSupported) {
      setShowPWAInstructions(true)
      return
    }
    if (pushSubscribed) await unsubscribePush()
    else await subscribePush()
  }

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      setShowPWAInstructions(false)
      return
    }
    try {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setCanInstallPWA(false)
    } catch (e) {
      console.error('[PWA] install error', e)
    }
  }

  const handleCityToggle = async (city: string, enabled: boolean) => {
    const next = enabled ? disabledCities.filter((c) => c !== city) : [...disabledCities, city]
    setDisabledCities(next)
    const payload = JSON.stringify(next)
    localStorage.setItem('master-push-disabled-cities', payload)
    await saveToIndexedDB('master-push-disabled-cities', payload)
  }

  const handleTypeToggle = async (type: string, enabled: boolean) => {
    const next = enabled ? disabledTypes.filter((t) => t !== type) : [...disabledTypes, type]
    setDisabledTypes(next)
    const payload = JSON.stringify(next)
    localStorage.setItem('master-push-disabled-types', payload)
    await saveToIndexedDB('master-push-disabled-types', payload)
  }

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })

  const cities = (profileData?.cities || []).map((city) => (typeof city === 'string' ? city : city.name))
  const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)

  if (loading) {
    return <LoadingScreen embeddedInLayout />
  }

  if (error && !isPreviewMode) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
        <div className="px-4 py-6">
          <NetworkError isDark={isDark} onRetry={() => window.location.reload()} title="Ошибка загрузки профиля" message={error} buttonText="Обновить" />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className={`flex items-start justify-between rounded-[20px] border px-5 py-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-lg font-medium ${isDark ? 'bg-white/[0.12]' : 'bg-[#0a4f42]'}`}>
                {formData.name ? getInitials(formData.name) : <User className="w-8 h-8" />}
              </div>
              <div>
                {isEditing ? (
                  <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`text-xl bg-transparent border-b focus:outline-none ${isDark ? 'focus:border-gray-600 text-gray-100 border-gray-600' : 'focus:border-[#0a4f42] text-gray-900 border-gray-300'}`} />
                ) : (
                  <h2 className={`text-[20px] font-semibold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formData.name || user?.name || 'Мастер'}</h2>
                )}
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{profileData?.login || user?.login}</p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                    profileData?.status === 'active'
                      ? isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                      : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {profileData?.status === 'active' ? 'Активен' : profileData?.status === 'inactive' ? 'Уволен' : profileData?.status || 'Мастер'}
                </span>
              </div>
            </div>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                <Edit2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}><X className="h-5 w-5" /></button>
                <button onClick={handleSave} disabled={isSaving} className={`transition-colors disabled:opacity-50 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}>{isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}</button>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className={`rounded-[20px] border p-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-white/80' : 'text-[#111113]'}`}>Контакт и профиль</p>
                <div className={`flex justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Города</span><span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{cities.length > 0 ? cities.join(', ') : 'Не указаны'}</span></div>
                <div className={`flex justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Дата регистрации</span><span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{profileData?.createdAt ? formatDate(profileData.createdAt) : 'Не указана'}</span></div>
                <div className={`flex justify-between items-start py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Примечание</span>
                  {isEditing ? <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className={`w-64 text-right bg-transparent border rounded-lg p-2 focus:outline-none resize-none ${isDark ? 'focus:border-gray-600 text-gray-200 border-gray-600' : 'focus:border-[#0a4f42] text-gray-900 border-gray-200'}`} rows={2} /> : <span className={`text-right max-w-xs ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{formData.note || 'Не указано'}</span>}
                </div>
                <div className={`flex justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Telegram</span>
                  {isEditing ? <input value={formData.telegramId} onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })} className={`w-64 text-right bg-transparent border-b focus:outline-none ${isDark ? 'focus:border-gray-600 text-gray-200 border-gray-600' : 'focus:border-[#0a4f42] text-gray-900 border-gray-300'}`} placeholder="@username" /> : <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{formData.telegramId || 'Не указан'}</span>}

                </div>

                <div className="py-2.5">
                  <button onClick={() => setShowDocuments(!showDocuments)} className={`w-full flex justify-between items-center transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>Документы</span></div>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showDocuments ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  {showDocuments && (
                    <div className="mt-3 grid gap-3 pl-2 sm:grid-cols-2">
                      <div>
                        <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Договор</label>
                        {isEditing ? (
                          <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                            <Upload className="h-3 w-3" /><span>{contractFile ? contractFile.name : 'Загрузить'}</span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
                          </label>
                        ) : <div className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{profileData?.contract || 'Не загружен'}</div>}
                      </div>
                      <div>
                        <label className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Паспорт</label>
                        {isEditing ? (
                          <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                            <Upload className="h-3 w-3" /><span>{passportFile ? passportFile.name : 'Загрузить'}</span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setPassportFile(e.target.files?.[0] || null)} />
                          </label>
                        ) : <div className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{profileData?.passport || 'Не загружен'}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`space-y-4 rounded-[20px] border p-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <p className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-[#111113]'}`}>Настройки</p>
                <div className={`py-1.5 border-b ${isDark ? 'border-white/10' : 'border-black/[0.06]'}`}>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Push-уведомления</span>
                    <div className="flex items-center gap-3">
                      {pushLoading ? (
                        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /><span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Проверка...</span></div>
                      ) : (
                        <>
                          <button onClick={handlePushToggle} disabled={isSubscribing || isUnsubscribing} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${pushSubscribed ? 'bg-[#0a4f42]' : !pushSupported ? isDark ? 'bg-yellow-600/30' : 'bg-yellow-400/30' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full shadow-lg transition-transform duration-200 ${pushSubscribed ? 'translate-x-6 bg-white' : !pushSupported ? 'translate-x-1 bg-yellow-400' : 'translate-x-1 bg-white'}`} />
                          </button>
                          {!pushSupported ? (
                            <button onClick={canInstallPWA ? handleInstallPWA : () => setShowPWAInstructions(true)} className={`text-sm transition-colors ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'}`}>{canInstallPWA ? 'Установить' : 'Как установить?'}</button>
                          ) : pushSubscribed ? (
                            <button onClick={() => setShowPushSettings(!showPushSettings)} className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><Settings className="h-4 w-4" /></button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  {pushSubscribed && showPushSettings && (
                    <div className={`mt-4 space-y-4 pl-4 border-l-2 ${isDark ? 'border-white/10' : 'border-[#0a4f42]/20'}`}>
                      <div>
                        <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Уведомления по городам</h4>
                        <div className="space-y-2">{cities.map((city) => <label key={city} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!disabledCities.includes(city)} onChange={(e) => handleCityToggle(city, e.target.checked)} className="w-4 h-4 rounded" /><span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{city}</span></label>)}</div>
                      </div>
                      <div>
                        <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Типы уведомлений</h4>
                        <div className="space-y-2">{notificationTypes.map((type) => <label key={type.id} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!disabledTypes.includes(type.id)} onChange={(e) => handleTypeToggle(type.id, e.target.checked)} className="w-4 h-4 rounded" /><span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{type.label}</span></label>)}</div>
                      </div>
                    </div>
                  )}
                  {!pushLoading && pushError && <p className={`text-xs mt-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{pushError}</p>}
                </div>

                <div className="py-1.5">
                  <button onClick={() => setIsChangingPassword(true)} className={`w-full rounded-xl px-4 py-2 text-sm transition-colors text-left ${isDark ? 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.1]' : 'bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]'}`}>Сменить пароль</button>
                </div>
              </div>

              <div className={`rounded-[20px] border p-4 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <button onClick={handleLogout} disabled={isLoggingOut} className={`w-full flex items-center justify-center gap-2 rounded-full py-2.5 transition-colors disabled:opacity-50 ${isDark ? 'bg-white/[0.04] text-red-300 hover:bg-white/[0.08]' : 'bg-white text-red-600 hover:bg-red-50 border border-red-100'}`}>
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'Выход...' : 'Выйти'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isChangingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 ${isDark ? 'bg-[#111113] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#111113]'}`}>Смена пароля</h3>
              <button onClick={() => { setIsChangingPassword(false); setPasswordError(null) }} className={`rounded-full p-1 transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className={`group relative overflow-hidden rounded-2xl border transition-all ${isDark ? 'border-white/10 bg-[#1c1c1e]' : 'border-[#d2d2d7] bg-white/95'}`}>
                <input type={showCurrentPassword ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="Текущий пароль" className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ${isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'}`} />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-[#8e8e93]'}`}>{showCurrentPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button>
              </div>
              <div className={`group relative overflow-hidden rounded-2xl border transition-all ${isDark ? 'border-white/10 bg-[#1c1c1e]' : 'border-[#d2d2d7] bg-white/95'}`}>
                <input type={showNewPassword ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="Новый пароль" className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ${isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'}`} />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-[#8e8e93]'}`}>{showNewPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button>
              </div>
              <div className={`group relative overflow-hidden rounded-2xl border transition-all ${isDark ? 'border-white/10 bg-[#1c1c1e]' : 'border-[#d2d2d7] bg-white/95'}`}>
                <input type={showConfirmPassword ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Подтвердите пароль" className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ${isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-[#8e8e93]'}`}>{showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button>
              </div>
              {passwordError && <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{passwordError}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setIsChangingPassword(false); setPasswordError(null) }} className={`flex-1 rounded-full py-2.5 text-sm transition-colors ${isDark ? 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]' : 'bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]'}`}>Отмена</button>
                <button onClick={handlePasswordChange} disabled={isSaving} className={`flex-1 rounded-full py-2.5 text-sm transition-colors disabled:opacity-50 ${isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'}`}>{isSaving ? 'Сохранение...' : 'Сохранить'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPWAInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-md w-full rounded-2xl p-6 border ${isDark ? 'bg-[#111113] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-teal-100'}`}><Smartphone className={`h-5 w-5 ${isDark ? 'text-white' : 'text-teal-600'}`} /></div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Установите приложение</h3>
              </div>
              <button onClick={() => setShowPWAInstructions(false)} className={`p-1 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}><X className="h-5 w-5" /></button>
            </div>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Для получения push-уведомлений необходимо установить приложение на {isIOS ? 'домашний экран' : 'главный экран'}.</p>
            <div className="space-y-3 text-sm">
              <div className={`flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>1</span>{isAndroid ? 'Откройте меню браузера (⋮)' : <>Нажмите кнопку <Share className="h-4 w-4 inline mx-1" /> в Safari</>}</div>
              <div className={`flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>2</span>{isAndroid ? 'Выберите "Установить приложение"' : 'Выберите "На экран Домой"'}</div>
              <div className={`flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isDark ? 'bg-white/[0.08] text-white' : 'bg-teal-100 text-teal-600'}`}>3</span>Подтвердите установку <Home className="h-4 w-4 inline ml-1" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              {canInstallPWA ? (
                <>
                  <button onClick={() => setShowPWAInstructions(false)} className={`flex-1 py-2 px-4 rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Позже</button>
                  <button onClick={handleInstallPWA} className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700'}`}><Plus className="h-4 w-4" />Установить</button>
                </>
              ) : (
                <button onClick={() => setShowPWAInstructions(false)} className={`w-full py-2 px-4 rounded-lg transition-colors ${isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>Понятно</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
