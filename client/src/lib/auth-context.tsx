"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api, User, LoginData, SignupData, Token, ApiError } from "./api"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: SignupData) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "fintra_token"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const forceLogout = useCallback((redirectToLogin = false) => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    if (redirectToLogin) {
      router.push("/login")
    }
  }, [router])

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    try {
      const userData = await api.getCurrentUser(storedToken)
      setToken(storedToken)
      setUser(userData)
    } catch (error) {
      forceLogout(true)
    } finally {
      setIsLoading(false)
    }
  }, [forceLogout])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (data: LoginData) => {
    const response = await api.login(data)
    localStorage.setItem(TOKEN_KEY, response.access_token)
    setToken(response.access_token)
    const userData = await api.getCurrentUser(response.access_token)
    setUser(userData)
  }

  const register = async (data: SignupData) => {
    await api.signup(data)
  }

  const logout = async () => {
    if (token) {
      try {
        await api.logout(token)
      } catch (error) {
        // Ignore logout errors
      }
    }
    forceLogout(true)
  }

  useEffect(() => {
    const handleAuthFailure = () => {
      forceLogout(true)
    }

    window.addEventListener("fintra:auth-failed", handleAuthFailure)
    return () => window.removeEventListener("fintra:auth-failed", handleAuthFailure)
  }, [forceLogout])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
