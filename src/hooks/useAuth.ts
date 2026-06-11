import { useState, useEffect } from 'react'
import { PERSONAS, TRACKS } from '../data/constants'

export interface User {
  role: string
  email: string
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
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setXp(XP_MAP[userData.role] || 0)
    }
  }, [])

  const handleLogin = (email: string, _password: string, role: string) => {
    if (!role) {
      alert('⚠️ Selecione um perfil!')
      return
    }
    if (!email) {
      alert('⚠️ Informe seu e-mail!')
      return
    }
    const userData: User = { role, email }
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    setXp(XP_MAP[role] || 0)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const getMyTracks = () => {
    if (!user) return []
    if (user.role === 'ADMIN') return TRACKS
    return TRACKS.filter(t => t.personas.includes(user.role))
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
