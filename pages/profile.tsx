import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Phone, MapPin, Edit3, Save, X, Upload, FileImage, Loader2, AlertCircle } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import apiClient from '@/lib/api'
import { useRouter } from 'next/router'

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

const Profile: NextPage = () => {
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
        console.log('Загружаем профиль мастера...')
        const response = await apiClient.getMasterProfile()
        
        console.log('Ответ API профиля:', response)
        
        if (response.success && response.data) {
          console.log('Профиль загружен:', response.data)
          setProfileData(response.data)
        } else {
          console.error('Ошибка загрузки профиля:', response.error)
          setError(response.error || 'Ошибка загрузки профиля')
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке профиля:', error)
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
    <>
      <Head>
        <title>Профиль - Новые Схемы</title>
        <meta name="description" content="Профиль мастера" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900">
        <Navigation />
        <div className="max-w-4xl mx-auto p-4 md:p-6 pt-20 md:pt-24 space-y-6">

          {/* Profile Card */}
          <Card className="bg-black/80 backdrop-blur-sm border-gray-800">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Личная информация
                  </CardTitle>
                </div>
                {!isEditing ? (
                  <Button onClick={handleEdit} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Загрузить документы
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить
                    </Button>
                    <Button onClick={handleCancel} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto">
                      <X className="h-4 w-4 mr-2" />
                      Отмена
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                  <span className="ml-2 text-gray-300">Загрузка профиля...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <span className="ml-2 text-red-300">{error}</span>
                </div>
              ) : profileData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Имя</Label>
                    <p className="text-white font-medium">{profileData.name}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login" className="text-gray-300">Логин</Label>
                    <p className="text-white font-medium flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {profileData.login}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-gray-300">Статус работы</Label>
                    <p className="text-white font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {profileData.statusWork}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cities" className="text-gray-300">Города</Label>
                    <p className="text-white font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {profileData.cities.join(', ')}
                    </p>
                  </div>

                  {profileData.tgId && (
                    <div className="space-y-2">
                      <Label htmlFor="tgId" className="text-gray-300">Telegram ID</Label>
                      <p className="text-white font-medium">{profileData.tgId}</p>
                    </div>
                  )}

                  {profileData.note && (
                    <div className="space-y-2">
                      <Label htmlFor="note" className="text-gray-300">Примечание</Label>
                      <p className="text-white font-medium">{profileData.note}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Documents Section */}
              {profileData && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FileImage className="h-5 w-5 mr-2" />
                    Документы
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Фото паспорта</Label>
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
                            className="flex items-center justify-center w-full h-16 sm:h-20 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-green-500 transition-colors"
                          >
                            <div className="text-center">
                              <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                              <p className="text-sm text-gray-400">Загрузить фото</p>
                            </div>
                          </label>
                          {profileData.passportDoc && (
                            <p className="text-green-400 text-sm">{profileData.passportDoc}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full h-16 sm:h-20 border border-gray-600 rounded-lg bg-gray-800/30">
                          {profileData.passportDoc ? (
                            <p className="text-white text-sm">{profileData.passportDoc}</p>
                          ) : (
                            <p className="text-gray-400 text-sm">Фото не загружено</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Фото договора</Label>
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
                            className="flex items-center justify-center w-full h-16 sm:h-20 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-green-500 transition-colors"
                          >
                            <div className="text-center">
                              <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                              <p className="text-sm text-gray-400">Загрузить фото</p>
                            </div>
                          </label>
                          {profileData.contractDoc && (
                            <p className="text-green-400 text-sm">{profileData.contractDoc}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full h-16 sm:h-20 border border-gray-600 rounded-lg bg-gray-800/30">
                          {profileData.contractDoc ? (
                            <p className="text-white text-sm">{profileData.contractDoc}</p>
                          ) : (
                            <p className="text-gray-400 text-sm">Фото не загружено</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  )
}

export default Profile
