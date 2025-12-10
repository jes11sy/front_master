'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import apiClient from '@/lib/api'
import { useRouter } from 'next/navigation'

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
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileData, setProfileData] = useState<MasterProfile | null>(null)

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
        // Если ошибка авторизации, перенаправляем на логин
        if (error.message?.includes('401') || error.message?.includes('токен')) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    setIsEditing(false)
    // Здесь будет логика сохранения данных
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Здесь будет логика отмены изменений
  }

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => prev ? ({
      ...prev,
      [field]: value
    }) : null)
  }

  const handleFileUpload = (field: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && profileData) {
      // Здесь будет логика загрузки файла
      setProfileData(prev => prev ? ({
        ...prev,
        [field]: file.name
      }) : null)
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8 pt-4 md:pt-8">
          <div className="max-w-4xl mx-auto">

          {/* Profile Card */}
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Личная информация</h2>
                </div>
                {!isEditing ? (
                  <Button onClick={handleEdit} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto">
                    Загрузить документы
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
                      Сохранить
                    </Button>
                    <Button onClick={handleCancel} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 w-full sm:w-auto">
                      Отмена
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Загрузка профиля...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-red-600">{error}</div>
                </div>
              ) : profileData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">Имя</Label>
                    <p className="text-gray-800 font-medium">{profileData.name}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login" className="text-gray-700">Логин</Label>
                    <p className="text-gray-800 font-medium">
                      {profileData.login}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-gray-700">Статус работы</Label>
                    <p className="text-gray-800 font-medium">
                      {profileData.statusWork}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cities" className="text-gray-700">Города</Label>
                    <p className="text-gray-800 font-medium">
                      {profileData.cities.join(', ')}
                    </p>
                  </div>

                  {profileData.tgId && (
                    <div className="space-y-2">
                      <Label htmlFor="tgId" className="text-gray-700">Telegram ID</Label>
                      <p className="text-gray-800 font-medium">{profileData.tgId}</p>
                    </div>
                  )}

                  {profileData.note && (
                    <div className="space-y-2">
                      <Label htmlFor="note" className="text-gray-700">Примечание</Label>
                      <p className="text-gray-800 font-medium">{profileData.note}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Documents Section */}
              {profileData && (
                <div className="mt-8 pt-6 border-t border-gray-300">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Документы
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-700">Фото паспорта</Label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload('passportDoc', e)}
                            className="hidden"
                            id="passport-upload"
                          />
                          <label
                            htmlFor="passport-upload"
                            className="flex items-center justify-center w-full h-16 sm:h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
                          >
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Загрузить фото</p>
                            </div>
                          </label>
                          {profileData.passportDoc && (
                            <p className="text-teal-600 text-sm">{profileData.passportDoc}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full h-16 sm:h-20 border border-gray-300 rounded-lg bg-gray-50">
                          {profileData.passportDoc ? (
                            <p className="text-gray-800 text-sm">{profileData.passportDoc}</p>
                          ) : (
                            <p className="text-gray-500 text-sm">Фото не загружено</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700">Фото договора</Label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload('contractDoc', e)}
                            className="hidden"
                            id="contract-upload"
                          />
                          <label
                            htmlFor="contract-upload"
                            className="flex items-center justify-center w-full h-16 sm:h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors"
                          >
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Загрузить фото</p>
                            </div>
                          </label>
                          {profileData.contractDoc && (
                            <p className="text-teal-600 text-sm">{profileData.contractDoc}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full h-16 sm:h-20 border border-gray-300 rounded-lg bg-gray-50">
                          {profileData.contractDoc ? (
                            <p className="text-gray-800 text-sm">{profileData.contractDoc}</p>
                          ) : (
                            <p className="text-gray-500 text-sm">Фото не загружено</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
  )
}

