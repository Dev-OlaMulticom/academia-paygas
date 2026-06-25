import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button id="btn-menu" variant="ghost" size="icon" className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className="icon-menu icon-md" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Abrir/fechar menu de navegacao</TooltipContent>
        </Tooltip>
        <div className="header-logo">
          <div className="header-logo-icon">PG</div>
          <div>
            <div className="header-logo-name">Academia PayGas</div>
            <div className="header-logo-ver">{APP_VERSION} — Sistema</div>
          </div>
        </div>
        <div className="header-right">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button id="btn-notif" variant="ghost" size="icon" className="header-notif" onClick={() => navigate('/notif')}>
                <i className="icon-bell icon-md" />
                {unreadCount > 0 && <span className="notif-dot"></span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{unreadCount > 0 ? `${unreadCount} notificacao(es) nao lida(s)` : 'Ver notificacoes'}</TooltipContent>
          </Tooltip>
        </div>
      </header>
      <div className="app-body">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-section">
            <div className="sidebar-section-label">Principal</div>
            {isModuleEnabled('dashboard') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button id="nav-dashboard" className={`nav-item ${currentPath === '/' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/'); }}>
                    <i className="icon-home nav-icon" /> Dashboard
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Visao geral do seu progresso e atividades</TooltipContent>
              </Tooltip>
            )}
            {isModuleEnabled('trilhas') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button id="nav-trilhas" className={`nav-item ${currentPath === '/modulos' || currentPath.startsWith('/modulo/') ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/modulos'); }}>
                    <i className="icon-book-open nav-icon" /> Trilhas de Aprendizado
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Cursos e trilhas de aprendizado disponiveis</TooltipContent>
              </Tooltip>
            )}
            {isModuleEnabled('certificados') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button id="nav-certificados" className={`nav-item ${currentPath === '/certificados' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/certificados'); }}>
                    <i className="icon-trophy nav-icon" /> Certificados
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Certificados conquistados ao completar modulos</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button id="nav-conquistas" className={`nav-item ${currentPath === '/conquistas' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/conquistas'); }}>
                  <i className="icon-star nav-icon" /> Conquistas
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Suas conquistas e recompensas por estudo</TooltipContent>
            </Tooltip>
          </div>
          {(isAdmin || isGestor) && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Gestao</div>
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button id="nav-admin-dashboard" className={`nav-item ${currentPath === '/admin-dashboard' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/admin-dashboard'); }}>
                      <i className="icon-bar-chart-3 nav-icon" /> Dashboard Admin
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Painel administrativo com metricas gerais do sistema</TooltipContent>
                </Tooltip>
              )}
              {isModuleEnabled('cms') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button id="nav-cms" className={`nav-item ${currentPath === '/cms' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/cms'); }}>
                      <i className="icon-file-edit nav-icon" /> Gestao de Conteudo
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Criar e gerenciar modulos, aulas e quizzes</TooltipContent>
                </Tooltip>
              )}
              {isModuleEnabled('equipe') && isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button id="nav-equipe" className={`nav-item ${currentPath === '/equipe' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/equipe'); }}>
                      <i className="icon-users nav-icon" /> Equipes
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Gerenciar equipes e membros do posto</TooltipContent>
                </Tooltip>
              )}
              {isModuleEnabled('usuarios') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button id="nav-usuarios" className={`nav-item ${currentPath === '/usuarios' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/usuarios'); }}>
                      <i className="icon-user-cog nav-icon" /> {isAdmin ? 'Usuarios' : 'Meu Time'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{isAdmin ? 'Gerenciar todos os usuarios do sistema' : 'Ver membros da sua equipe e progresso'}</TooltipContent>
                </Tooltip>
              )}
              {isModuleEnabled('relatorios') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button id="nav-relatorios" className={`nav-item ${currentPath === '/relatorios' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/relatorios'); }}>
                      <i className="icon-bar-chart-3 nav-icon" /> Relatorios
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Relatorios de desempenho e progresso da equipe</TooltipContent>
                </Tooltip>
              )}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button id="nav-logs" className={`nav-item ${currentPath === '/logs' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/logs'); }}>
                      <i className="icon-clipboard nav-icon" /> Logs de Atividade
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Historico de acoes dos usuarios no sistema</TooltipContent>
                </Tooltip>
              )}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button id="nav-xp-config" className={`nav-item ${currentPath === '/xp-config' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/xp-config'); }}>
                      <i className="icon-zap nav-icon" /> Configuracao de XP
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Configurar pontos e recompensas por acao</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          <div className="sidebar-section">
            <div className="sidebar-section-label">Suporte</div>
            {isModuleEnabled('notificacoes') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button id="nav-notif" className={`nav-item ${currentPath === '/notif' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/notif'); }}>
                    <i className="icon-bell nav-icon" /> Notificacoes
                    {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Mensagens e alertas importantes para voce</TooltipContent>
              </Tooltip>
            )}
            {isModuleEnabled('perfil') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button id="nav-perfil" className={`nav-item ${currentPath === '/perfil' ? 'active' : ''}`} onClick={() => { setSidebarOpen(false); navigate('/perfil'); }}>
                    <i className="icon-user nav-icon" /> Meu Perfil
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Editar seus dados pessoais e senha</TooltipContent>
              </Tooltip>
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
