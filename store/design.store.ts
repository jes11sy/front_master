'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { saveSettings, getSettings } from '@/lib/settings-storage'

export type DesignVersion = 'v1' | 'v2'
export type ThemeMode = 'light' | 'dark'

interface DesignState {
  version: DesignVersion
  theme: ThemeMode
  _hasHydrated: boolean
  setVersion: (version: DesignVersion) => void
  toggleVersion: () => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setHasHydrated: (state: boolean) => void
  restoreFromIndexedDB: () => Promise<void>
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      version: 'v1',
      theme: 'light',
      _hasHydrated: false,

      setVersion: (version) => {
        set({ version })
        // Дублируем в IndexedDB для PWA
        saveSettings({ version }).catch(() => {})
      },

      toggleVersion: () => {
        const newVersion = get().version === 'v1' ? 'v2' : 'v1'
        set({ version: newVersion })
        saveSettings({ version: newVersion }).catch(() => {})
      },

      setTheme: (theme) => {
        set({ theme })
        saveSettings({ theme }).catch(() => {})
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        saveSettings({ theme: newTheme }).catch(() => {})
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },

      /**
       * Восстановление настроек из IndexedDB (для PWA когда localStorage очищен)
       */
      restoreFromIndexedDB: async () => {
        try {
          const settings = await getSettings()
          const currentState = get()
          
          // Если localStorage был очищен (дефолтные значения), восстанавливаем из IndexedDB
          if (currentState.theme === 'light' && currentState.version === 'v1') {
            if (settings.theme !== 'light' || settings.version !== 'v1') {
              set({
                theme: settings.theme,
                version: settings.version,
              })
            }
          }
        } catch (error) {
          console.warn('[DesignStore] Failed to restore from IndexedDB:', error)
        }
      },
    }),
    {
      name: 'design-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // После гидратации из localStorage, пробуем восстановить из IndexedDB
        if (state) {
          state.setHasHydrated(true)
          state.restoreFromIndexedDB()
        }
      },
    }
  )
)
