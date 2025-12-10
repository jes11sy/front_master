'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface LayoutContextType {
  hideLayout: boolean
  setHideLayout: (hide: boolean) => void
}

const LayoutContext = createContext<LayoutContextType>({
  hideLayout: false,
  setHideLayout: () => {},
})

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [hideLayout, setHideLayout] = useState(false)

  return (
    <LayoutContext.Provider value={{ hideLayout, setHideLayout }}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  return useContext(LayoutContext)
}

