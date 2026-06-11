import { useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const navigate = useNavigate()
  const persona = PERSONAS[user.role as keyof typeof PERSONAS]
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const currentPath = location.pathname

  return (
    <div id="screen-app" className="active">
      <header className="app-header">
        <div className="header-logo">
          <div className="header-logo-icon">PG</div>
          <div>
            <div className="header-logo-name">Academia PayGas</div>
            <div className="header-logo-ver">V26 — Edição Nacional</div>
          </div>
        </div>
        <div className="header-right">
          <button className="header-notif" onClick={() => navigate('/notif')} title="Notificações">
            🔔<span className="notif-dot"></span>
          </button>
          <button className="header-user" onClick={() => navigate('/perfil')}>
            <div className="user-avatar" style={{ background: persona?.color }}>{persona?.initials}</div>
            <div className="user-info">
              <b>Usuário</b>
              <span>{persona?.label}</span>
            </div>
          </button>
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </div>
      </header>
      <div className="app-body">
        <nav className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Principal</div>
            <button className={`nav-item ${currentPath === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
              <span className="nav-icon">🏠</span> Dashboard
            </button>
            <button className={`nav-item ${currentPath === '/trilhas' ? 'active' : ''}`} onClick={() => navigate('/trilhas')}>
              <span className="nav-icon">📚</span> Trilhas de Aprendizado
              <span className="nav-badge">{tracksCount}</span>
            </button>
            <button className={`nav-item ${currentPath === '/certificados' ? 'active' : ''}`} onClick={() => navigate('/certificados')}>
              <span className="nav-icon">🏆</span> Certificados
            </button>
          </div>
          {(isAdmin || isGestor) && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Gestão</div>
              <button className={`nav-item ${currentPath === '/equipe' ? 'active' : ''}`} onClick={() => navigate('/equipe')}>
                <span className="nav-icon">👥</span> Equipe
              </button>
              <button className={`nav-item ${currentPath === '/relatorios' ? 'active' : ''}`} onClick={() => navigate('/relatorios')}>
                <span className="nav-icon">📊</span> Relatórios
              </button>
            </div>
          )}
          {isAdmin && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Administração</div>
              <button className={`nav-item ${currentPath === '/cms' ? 'active' : ''}`} onClick={() => navigate('/cms')}>
                <span className="nav-icon">✏️</span> Gestão de Conteúdo
              </button>
              <button className={`nav-item ${currentPath === '/usuarios' ? 'active' : ''}`} onClick={() => navigate('/usuarios')}>
                <span className="nav-icon">🧑‍💼</span> Usuários
              </button>
            </div>
          )}
          <div className="sidebar-section">
            <div className="sidebar-section-label">Suporte</div>
            <button className={`nav-item ${currentPath === '/notif' ? 'active' : ''}`} onClick={() => navigate('/notif')}>
              <span className="nav-icon">🔔</span> Notificações
            </button>
            <button className={`nav-item ${currentPath === '/perfil' ? 'active' : ''}`} onClick={() => navigate('/perfil')}>
              <span className="nav-icon">👤</span> Meu Perfil
            </button>
          </div>
        </nav>
        <div className="main">
          {children}
        </div>
      </div>
    </div>
  )
}
