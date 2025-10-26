/**
 * Simple Toast notification system (без внешних зависимостей)
 * Для production можно заменить на react-hot-toast или sonner
 */

'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { TOAST_DEFAULT_DURATION } from '@/lib/constants'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string, duration: number = TOAST_DEFAULT_DURATION) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, type, message, duration }
    
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id)
      }, duration)
      
      // Сохраняем timeoutId для возможной очистки
      return () => clearTimeout(timeoutId)
    }
  }, [removeToast])

  // Слушаем custom события для toast
  React.useEffect(() => {
    const handleShowToast = (event: CustomEvent) => {
      const { type, message, duration } = event.detail
      showToast(type, message, duration)
    }

    window.addEventListener('show-toast', handleShowToast as EventListener)
    return () => window.removeEventListener('show-toast', handleShowToast as EventListener)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast, onClose: () => void }) {
  const colors = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    warning: 'bg-yellow-500 border-yellow-600',
    info: 'bg-blue-500 border-blue-600',
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div 
      className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 flex items-start gap-3 animate-slide-in`}
      role="alert"
    >
      <span className="text-xl font-bold">{icons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 font-bold text-lg leading-none"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  )
}

// Helper functions
export const toast = {
  success: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', { detail: { type: 'success', message, duration } })
      window.dispatchEvent(event)
    }
  },
  error: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', { detail: { type: 'error', message, duration } })
      window.dispatchEvent(event)
    }
  },
  warning: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', { detail: { type: 'warning', message, duration } })
      window.dispatchEvent(event)
    }
  },
  info: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('show-toast', { detail: { type: 'info', message, duration } })
      window.dispatchEvent(event)
    }
  },
}
