import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { User } from '../hooks/useAuth'
import { PERSONAS } from '../data/constants'

interface AppLayoutProps {
  user: User
  xp: number
  tracksCount: number
  onLogout: () => void
  children: React.ReactNode
}

export function AppLayout({ user, xp, tracksCount, onLogout, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const persona = PERSONAS[user.role as keyof typeof PERSONAS]
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const currentPath = location.pathname

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
            <div className="header-logo-ver">V26 — Edição Nacional</div>
          </div>
        </div>
        <div className="header-right">
          <Button id="btn-notif" variant="ghost" size="icon" className="header-notif" onClick={() => navigate('/notif')} title="Notificações">
            <i className="icon-bell icon-md" />
            <span className="notif-dot"></span>
          </Button>
        </div>
      </header>
      <div className="app-body">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-section">
            <div className="sidebar-section-label">Principal</div>
            <button id="nav-dashboard" className={`nav-item ${currentPath === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
              <i className="icon-home nav-icon" /> Dashboard
            </button>
            <button id="nav-modulos" className={`nav-item ${currentPath === '/modulos' ? 'active' : ''}`} onClick={() => navigate('/modulos')}>
              <i className="icon-book-open nav-icon" /> Módulos
              <span className="nav-badge">{tracksCount}</span>
            </button>
            <button id="nav-certificados" className={`nav-item ${currentPath === '/certificados' ? 'active' : ''}`} onClick={() => navigate('/certificados')}>
              <i className="icon-trophy nav-icon" /> Certificados
            </button>
          </div>
          {(isAdmin || isGestor) && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Gestão</div>
              <button id="nav-equipe" className={`nav-item ${currentPath === '/equipe' ? 'active' : ''}`} onClick={() => navigate('/equipe')}>
                <i className="icon-users nav-icon" /> Equipe
              </button>
              <button id="nav-relatorios" className={`nav-item ${currentPath === '/relatorios' ? 'active' : ''}`} onClick={() => navigate('/relatorios')}>
                <i className="icon-bar-chart-3 nav-icon" /> Relatórios
              </button>
            </div>
          )}
          {isAdmin && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Administração</div>
              <button id="nav-cms" className={`nav-item ${currentPath === '/cms' ? 'active' : ''}`} onClick={() => navigate('/cms')}>
                <i className="icon-file-edit nav-icon" /> Gestão de Conteúdo
              </button>
              <button id="nav-usuarios" className={`nav-item ${currentPath === '/usuarios' ? 'active' : ''}`} onClick={() => navigate('/usuarios')}>
                <i className="icon-user-cog nav-icon" /> Usuários
              </button>
            </div>
          )}
          <div className="sidebar-section">
            <div className="sidebar-section-label">Suporte</div>
            <button id="nav-notif" className={`nav-item ${currentPath === '/notif' ? 'active' : ''}`} onClick={() => navigate('/notif')}>
              <i className="icon-bell nav-icon" /> Notificações
            </button>
            <button id="nav-perfil" className={`nav-item ${currentPath === '/perfil' ? 'active' : ''}`} onClick={() => navigate('/perfil')}>
              <i className="icon-user nav-icon" /> Meu Perfil
            </button>
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
