import { useState, useEffect } from 'react'
import { PERSONAS } from '../data/constants'
import { api } from '../lib/api'

export interface User {
  id?: string
  role: string
  email: string
  nome?: string
}

const XP_MAP: Record<string, number> = {
  ADMIN: 8500,
  GESTOR: 4100,
  ATENDENTE: 2400,
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [xp, setXp] = useState(0)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (storedUser && token) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setXp(XP_MAP[userData.role] || 0)
      api.setToken(token)
    }
  }, [])

  const handleLogin = (userData: User, token: string) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    api.setToken(token)
    setXp(XP_MAP[userData.role] || 0)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    api.logout()
  }

  const getMyTracks = () => {
    return []
  }

  const persona = user ? PERSONAS[user.role as keyof typeof PERSONAS] : null
  const isAuthenticated = !!user

  return {
    user,
    persona,
    xp,
    isAuthenticated,
    handleLogin,
    handleLogout,
    getMyTracks,
  }
}
