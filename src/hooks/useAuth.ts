import { useState, useEffect } from 'react'
import { PERSONAS } from '../data/constants'
import { api } from '../lib/api'
import { resetEncryptionKey } from '../lib/crypto'

export interface User {
  id?: string
  role: string
  email: string
  nome?: string
  xp?: number
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
      setXp(userData.xp || 0)
      api.setToken(token)
    }
  }, [])

  const handleLogin = (userData: User, token: string) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    api.setToken(token)
    setXp(userData.xp || 0)
    // Reset encryption key to fetch new one from server
    resetEncryptionKey()
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    api.logout()
    // Clear encryption key on logout
    resetEncryptionKey()
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
  }
}
