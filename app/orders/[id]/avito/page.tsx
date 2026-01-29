'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { LoadingScreen } from '@/components/ui/loading-screen'

interface Message {
  id: string
  type: 'text' | 'image' | 'voice' | 'link' | 'item' | 'location' | 'call' | 'deleted' | 'system'
  direction: 'in' | 'out'
  content: {
    text?: string
    image?: {
      sizes: {
        [key: string]: string // e.g., "640x480": "https://..."
      }
    }
    voice?: {
      voice_id: string
    }
    item?: {
      title: string
      price_string?: string
      image_url: string
      item_url: string
    }
    location?: {
      lat: number
      lon: number
      title: string
      text: string
    }
    [key: string]: any
  }
  author_id: string
  created: string
  read: boolean
  is_read?: boolean
  voiceUrl?: string
}

interface Order {
  id: number
  address: string
  typeEquipment: string
  avitoChatId?: string
  avitoName?: string
}

export default function AvitoChat() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatData, setChatData] = useState<any>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto',
          block: 'nearest'
        })
      }
    }, 200)
  }

  useEffect(() => {
    if (id) {
      loadChat()
    }
  }, [id])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  const loadVoiceUrls = async (messages: Message[], avitoAccountName: string) => {
    const voiceMessages = messages.filter(msg => msg.type === 'voice' && msg.content?.voice?.voice_id)
    if (voiceMessages.length === 0) return messages

    try {
      const voiceIds = voiceMessages.map(msg => msg.content?.voice?.voice_id).filter(Boolean)
      const response = await apiClient.getAvitoVoiceUrlsNew(avitoAccountName, voiceIds)
      
      return messages.map(msg => {
        if (msg.type === 'voice' && msg.content?.voice?.voice_id) {
          return {
            ...msg,
            voiceUrl: response[msg.content.voice.voice_id]
          }
        }
        return msg
      })
    } catch (error) {
      console.error('Error loading voice URLs:', error)
      return messages
    }
  }

  const loadChat = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      // Получаем данные заказа
      const orderResponse = await apiClient.getOrderById(id as string)
      if (orderResponse.success && orderResponse.data) {
        setOrder(orderResponse.data)
      }

      // Получаем данные чата заказа
      const chatResponse = await apiClient.getOrderAvitoChat(id.toString())
      
      if (!chatResponse.success || !chatResponse.data) {
        setError('У этого заказа нет чата Авито')
        return
      }

      const { chatId, avitoAccountName } = chatResponse.data
      setChatData({ chatId, avitoAccountName })

      // Загружаем сообщения
      const msgs = await apiClient.getAvitoMessages(
        chatId,
        avitoAccountName,
        100
      )

      // Проверяем что msgs это массив
      const messagesArray = Array.isArray(msgs) ? msgs : []

      // Сортируем по времени (старые сверху)
      const sortedMessages = messagesArray.sort((a: Message, b: Message) => 
        Number(a.created) - Number(b.created)
      )

      // Загружаем URL для голосовых сообщений
      const messagesWithVoice = await loadVoiceUrls(sortedMessages, avitoAccountName)

      setMessages(messagesWithVoice)

      // Отмечаем чат как прочитанный
      try {
        await apiClient.markAvitoChatAsReadNew(chatId, avitoAccountName)
      } catch (err) {
        // Тихо обрабатываем ошибку отметки как прочитанного
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки чата')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatData || sending) return

    const messageText = newMessage.trim()

    try {
      setSending(true)

      const sentMessage = await apiClient.sendAvitoMessageNew(
        chatData.chatId,
        messageText,
        chatData.avitoAccountName
      )

      // Добавляем отправленное сообщение в список
      const newMsg: Message = {
        id: sentMessage.id || Date.now().toString(),
        type: 'text',
        direction: 'out',
        content: { text: messageText },
        author_id: 'me',
        created: Math.floor(Date.now() / 1000).toString(),
        read: false,
        is_read: false,
      }

      setMessages(prev => [...prev, newMsg])
      setNewMessage('')

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка отправки сообщения')
    } finally {
      setSending(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return <LoadingScreen message="Загрузка чата" />
  }

  if (error || !chatData) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 animate-slide-in-left">
            <p className="text-red-600">{error || 'Чат не найден'}</p>
          </div>
          <button
            onClick={() => router.push(`/orders/${id}`)}
            className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
          >
            ← Назад к заказу
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-4 max-w-4xl" style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
        {/* Заголовок с информацией о заказе */}
        <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-4 md:p-6 border bg-white/95 mb-3 animate-fade-in" style={{borderColor: '#114643'}}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Чат Авито</h1>
            <button
              onClick={() => router.push(`/orders/${id}`)}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 text-sm font-medium"
            >
              ← Назад
            </button>
          </div>
          
          {/* Информация о заказе */}
          {order && (
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="text-gray-600 font-medium min-w-[120px]">Заказ №:</span>
                <span className="text-gray-800">{order.id}</span>
              </div>
              <div className="flex">
                <span className="text-gray-600 font-medium min-w-[120px]">Адрес:</span>
                <span className="text-gray-800 break-words">{order.address || 'Не указан'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-600 font-medium min-w-[120px]">Направление:</span>
                <span className="text-gray-800">{order.typeEquipment || 'Не указано'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-600 font-medium min-w-[120px]">Аккаунт авито:</span>
                <span className="text-gray-800">{chatData.avitoAccountName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Сообщения */}
        <div className="backdrop-blur-lg shadow-2xl rounded-2xl border bg-white/95 overflow-hidden flex flex-col animate-slide-in-left" style={{borderColor: '#114643', flex: '1', minHeight: 0}}>
          <div className="overflow-y-scroll p-3 md:p-4 space-y-3" style={{flex: '1', minHeight: 0}}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">
                Нет сообщений в этом чате
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-lg shadow-md ${
                      msg.type === 'image' ? 'p-1' : 'px-3 py-2'
                    } ${
                      msg.direction === 'out'
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {/* Изображение */}
                    {msg.type === 'image' && msg.content?.image?.sizes ? (
                      <div className="space-y-2">
                        <img
                          src={msg.content.image.sizes['640x480'] || msg.content.image.sizes['1280x960'] || Object.values(msg.content.image.sizes)[0]}
                          alt="Image"
                          className="rounded-lg max-w-full w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            const fullSizeUrl = msg.content?.image?.sizes['1280x960'] || Object.values(msg.content?.image?.sizes || {})[0]
                            if (fullSizeUrl) window.open(fullSizeUrl, '_blank')
                          }}
                        />
                        {msg.content.text && (
                          <p className="whitespace-pre-wrap break-words text-sm px-2 pb-1">
                            {msg.content.text}
                          </p>
                        )}
                      </div>
                    ) : msg.type === 'voice' && msg.voiceUrl ? (
                      /* Голосовое сообщение */
                      <div className="space-y-2">
                        <audio 
                          controls 
                          className="w-full max-w-sm"
                          style={{ height: '40px' }}
                        >
                          <source src={msg.voiceUrl} type="audio/mpeg" />
                          Ваш браузер не поддерживает аудио
                        </audio>
                        {msg.content.text && (
                          <p className="whitespace-pre-wrap break-words text-sm">
                            {msg.content.text}
                          </p>
                        )}
                      </div>
                    ) : msg.type === 'item' && msg.content?.item ? (
                      /* Объявление */
                      <div className="flex gap-2">
                        {msg.content.item.image_url && (
                          <img 
                            src={msg.content.item.image_url} 
                            alt={msg.content.item.title} 
                            className="w-16 h-16 rounded object-cover" 
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{msg.content.item.title}</div>
                          {msg.content.item.price_string && (
                            <div className="text-xs opacity-70">{msg.content.item.price_string}</div>
                          )}
                        </div>
                      </div>
                    ) : msg.type === 'location' && msg.content?.location ? (
                      /* Геолокация */
                      <div className="space-y-2">
                        <p className="text-sm">{msg.content.location.title || msg.content.location.text}</p>
                        <a 
                          href={`https://maps.google.com/?q=${msg.content.location.lat},${msg.content.location.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-xs"
                        >
                          Открыть на карте
                        </a>
                      </div>
                    ) : (
                      /* Текстовое сообщение */
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {msg.content.text || '[Не текстовое сообщение]'}
                      </p>
                    )}

                    <p
                      className={`text-xs mt-1 ${
                        msg.type === 'image' ? 'px-2 pb-1' : ''
                      } ${
                        msg.direction === 'out' ? 'text-teal-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTimestamp(msg.created)}
                      {msg.direction === 'out' && msg.is_read && ' • Прочитано'}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода */}
          <div className="border-t p-3 md:p-4" style={{borderColor: '#114643'}}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Введите сообщение..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
              >
                {sending ? '...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

