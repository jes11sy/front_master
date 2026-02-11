'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import apiClient from '@/lib/api'
import { User, Edit2, LogOut, Eye, EyeOff, Save, X, Loader2, FileText, Camera, Bell, BellOff } from 'lucide-react'
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
          <div className="space-y-4">
            <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Документы</h3>
            
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
              <div className="flex items-center gap-2">
                {pushLoading ? (
                  <>
                    <Bell className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Push-уведомления</span>
                  </>
                ) : !pushSupported ? (
                  <>
                    <BellOff className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Push-уведомления</span>
                  </>
                ) : (
                  <>
                    {pushSubscribed ? (
                      <Bell className="h-4 w-4 text-green-600" />
                    ) : (
                      <BellOff className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    )}
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Push-уведомления</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {pushLoading ? (
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Проверка...</span>
                ) : !pushSupported ? (
                  <span className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {isIOSPWARequired ? 'Нужен PWA' : 'Не поддерживается'}
                  </span>
                ) : (
                  <>
                    <span className={`text-sm ${pushSubscribed ? 'text-green-600' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {pushSubscribed ? 'Включены' : 'Отключены'}
                    </span>
                    <button
                      onClick={pushSubscribed ? unsubscribePush : subscribePush}
                      disabled={isSubscribing || isUnsubscribing}
                      className={`text-sm transition-colors disabled:opacity-50 ${
                        isDark ? 'text-[#0d5c4b] hover:text-[#0a4a3c]' : 'text-[#0d5c4b] hover:text-[#0a4a3c]'
                      }`}
                    >
                      {isSubscribing || isUnsubscribing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : pushSubscribed ? (
                        'Отключить'
                      ) : (
                        'Включить'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Ошибки или подсказки */}
            {!pushLoading && (
              <>
                {pushError && (
                  <p className={`text-xs mt-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{pushError}</p>
                )}
                {pushPermission === 'denied' && (
                  <p className={`text-xs mt-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Разрешите в настройках браузера
                  </p>
                )}
                {isIOSPWARequired && (
                  <p className={`text-xs mt-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Добавьте приложение на домашний экран
                  </p>
                )}
              </>
            )}
          </div>

          {/* Разделитель */}
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

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
