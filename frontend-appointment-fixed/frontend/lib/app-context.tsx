'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { registerUser, loginUser, logoutUser } from '@/services/userService'

export interface CurrentUser {
  _id: string
  name: string
  email: string
  phone?: string
  role: 'patient' | 'doctor' | 'admin'
  status: string
  createdAt?: string
  updatedAt?: string
}

interface RegisterInput {
  name: string
  email: string
  phone?: string
  password: string
  role: 'patient' | 'doctor' | 'admin'
}

interface AppContextType {
  currentUser: CurrentUser | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (email: string, password: string, role?: string) => Promise<CurrentUser | null>
  logout: () => Promise<void>
  register: (userData: RegisterInput) => Promise<boolean>
  updateCurrentUser: (data: Partial<CurrentUser>) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Restore session on load.
  // Note: the JWT now lives in an httpOnly cookie that JS cannot read; we only
  // hydrate the cached user *profile* from localStorage to avoid an unauthenticated
  // flash. The server is the source of truth — any unauthenticated request will
  // get a 401 and the api interceptor will clear this cache + redirect.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser')
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser))
      }
    } catch {
      localStorage.removeItem('currentUser')
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  const login = async (email: string, password: string, role?: string): Promise<CurrentUser | null> => {
    const data = await loginUser(email, password, role)
    const user = data.user as CurrentUser
    // The accessToken is set as an httpOnly cookie by the backend — do NOT store it in localStorage.
    localStorage.setItem('currentUser', JSON.stringify(user))
    setCurrentUser(user)
    return user
  }

  const logout = useCallback(async () => {
    // Clear local UI state immediately for snappy logout, then ask the server
    // to clear the httpOnly cookie in the background.
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    await logoutUser()
  }, [])

  const register = async (userData: RegisterInput): Promise<boolean> => {
    await registerUser(userData)
    const user = await login(userData.email, userData.password)
    return !!user
  }

  const updateCurrentUser = (data: Partial<CurrentUser>) => {
    if (!currentUser) return
    const updated = { ...currentUser, ...data }
    setCurrentUser(updated)
    localStorage.setItem('currentUser', JSON.stringify(updated))
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isAuthLoading,
      login,
      logout,
      register,
      updateCurrentUser
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
