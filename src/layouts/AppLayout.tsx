import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { User } from '../hooks/useAuth'
import { PERSONAS } from '../data/constants'
import { APP_VERSION } from '../lib/constants'
import { api } from '../lib/api'

interface AppLayoutProps {
  user: User
  xp: number
  onLogout: () => void
  children: React.ReactNode
}

export function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [enabledModules, setEnabledModules] = useState<string[]>([])
  const location = useLocation()
  const navigate = useNavigate()
  const persona = PERSONAS[user.role as keyof typeof PERSONAS]
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const currentPath = location.pathname

  const isModuleEnabled = useCallback((key: string) => {
    if (enabledModules.length === 0) return true // Fallback: show all if not loaded yet
    return enabledModules.includes(key)
  }, [enabledModules])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count || 0)
      }
    } catch { /* */ }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  useEffect(() => {
    api.getEnabledModules().then(setEnabledModules).catch(() => {})
  }, [])

  return (
    <div id="screen-app" className="active">
      <header className="app-header">
        <Button id="btn-menu" variant="ghost" size="icon" className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Menu">
          <i className="icon-menu icon-md" />
        </Button>
        <div className="header-logo">
          <div className="header-logo-icon">PG</div>
          <div>
            <div className="header-logo-name">Academia PayGas</div>
            <div className="header-logo-ver">{APP_VERSION} — Sistema</div>
          </div>
        </div>
        <div className="header-right">
          <Button id="btn-notif" variant="ghost" size="icon" className="header-notif" onClick={() => navigate('/notif')} title="Notificações">
            <i className="icon-bell icon-md" />
            {unreadCount > 0 && <span className="notif-dot"></span>}
          </Button>
        </div>
      </header>
      <div className="app-body">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-section">
            <div className="sidebar-section-label">Principal</div>
            {isModuleEnabled('dashboard') && (
              <button id="nav-dashboard" className={`nav-item ${currentPath === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
                <i className="icon-home nav-icon" /> Dashboard
              </button>
            )}
            {isModuleEnabled('trilhas') && (
              <button id="nav-trilhas" className={`nav-item ${currentPath === '/modulos' || currentPath.startsWith('/modulo/') ? 'active' : ''}`} onClick={() => navigate('/modulos')}>
                <i className="icon-book-open nav-icon" /> Trilhas de Aprendizado
              </button>
            )}
            {isModuleEnabled('certificados') && (
              <button id="nav-certificados" className={`nav-item ${currentPath === '/certificados' ? 'active' : ''}`} onClick={() => navigate('/certificados')}>
                <i className="icon-trophy nav-icon" /> Certificados
              </button>
            )}
            <button id="nav-conquistas" className={`nav-item ${currentPath === '/conquistas' ? 'active' : ''}`} onClick={() => navigate('/conquistas')}>
              <i className="icon-star nav-icon" /> Conquistas
            </button>
          </div>
          {(isAdmin || isGestor) && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Gestão</div>
              {isAdmin && (
                <button id="nav-admin-dashboard" className={`nav-item ${currentPath === '/admin-dashboard' ? 'active' : ''}`} onClick={() => navigate('/admin-dashboard')}>
                  <i className="icon-bar-chart-3 nav-icon" /> Dashboard Admin
                </button>
              )}
              {isModuleEnabled('cms') && (
                <button id="nav-cms" className={`nav-item ${currentPath === '/cms' ? 'active' : ''}`} onClick={() => navigate('/cms')}>
                  <i className="icon-file-edit nav-icon" /> Gestão de Conteúdo
                </button>
              )}
              {isModuleEnabled('equipe') && isAdmin && (
                <button id="nav-equipe" className={`nav-item ${currentPath === '/equipe' ? 'active' : ''}`} onClick={() => navigate('/equipe')}>
                  <i className="icon-users nav-icon" /> Equipes
                </button>
              )}
              {isModuleEnabled('usuarios') && (
                <button id="nav-usuarios" className={`nav-item ${currentPath === '/usuarios' ? 'active' : ''}`} onClick={() => navigate('/usuarios')}>
                  <i className="icon-user-cog nav-icon" /> {isAdmin ? 'Usuários' : 'Meu Time'}
                </button>
              )}
              {isModuleEnabled('relatorios') && (
                <button id="nav-relatorios" className={`nav-item ${currentPath === '/relatorios' ? 'active' : ''}`} onClick={() => navigate('/relatorios')}>
                  <i className="icon-bar-chart-3 nav-icon" /> Relatórios
                </button>
              )}
              {isAdmin && (
                <button id="nav-logs" className={`nav-item ${currentPath === '/logs' ? 'active' : ''}`} onClick={() => navigate('/logs')}>
                  <i className="icon-clipboard nav-icon" /> Logs de Atividade
                </button>
              )}
              {isAdmin && (
                <button id="nav-xp-config" className={`nav-item ${currentPath === '/xp-config' ? 'active' : ''}`} onClick={() => navigate('/xp-config')}>
                  <i className="icon-zap nav-icon" /> Configuração de XP
                </button>
              )}
            </div>
          )}
          <div className="sidebar-section">
            <div className="sidebar-section-label">Suporte</div>
            {isModuleEnabled('notificacoes') && (
              <button id="nav-notif" className={`nav-item ${currentPath === '/notif' ? 'active' : ''}`} onClick={() => navigate('/notif')}>
                <i className="icon-bell nav-icon" /> Notificações
              </button>
            )}
            {isModuleEnabled('perfil') && (
              <button id="nav-perfil" className={`nav-item ${currentPath === '/perfil' ? 'active' : ''}`} onClick={() => navigate('/perfil')}>
                <i className="icon-user nav-icon" /> Meu Perfil
              </button>
            )}
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="user-avatar" style={{ background: persona?.color }}>{persona?.initials}</div>
              <div className="user-info">
                <b>{user?.nome || 'Usuário'}</b>
                <span>{persona?.label}</span>
              </div>
            </div>
            <Button id="btn-logout" variant="outline" className="btn-logout-sidebar" onClick={onLogout}>
              <i className="icon-log-out icon-sm" />
              Sair
            </Button>
          </div>
        </nav>
        <div className="main">
          {children}
        </div>
      </div>
    </div>
  )
}
