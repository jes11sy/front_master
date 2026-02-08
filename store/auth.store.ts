/**
 * Zustand store для управления состоянием аутентификации
 * Централизованное хранилище для данных пользователя
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '@/lib/api'
import { logger } from '@/lib/logger'

export interface User {
  id: number
  login: string
  name?: string
  role?: string
  phone?: string
  email?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  checkAuth: () => Promise<boolean>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
        })
        logger.debug('User set in store')
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      logout: async () => {
        set({
          user: null,
          isAuthenticated: false,
        })
        await apiClient.logout()
        logger.debug('User logged out')
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      checkAuth: async (): Promise<boolean> => {
        set({ isLoading: true })
        try {
          const response = await apiClient.getProfile()
          if (response && response.id) {
            set({
              user: response,
              isAuthenticated: true,
              isLoading: false,
            })
            return true
          }
          throw new Error('Invalid profile response')
        } catch (error) {
          logger.debug('Auth check failed')
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return false
        }
      },

      refreshUser: async () => {
        try {
          const response = await apiClient.getProfile()
          if (response && response.id) {
            set({ user: response })
          }
        } catch (error) {
          logger.error('Failed to refresh user', error)
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
