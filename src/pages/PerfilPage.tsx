import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { XP_PER_LEVEL } from '../lib/constants'

interface PerfilPageProps {
  user: User
  xp: number
}

export function PerfilPage({ user, xp }: PerfilPageProps) {
  const isAdmin = user?.role === 'ADMIN'
  const [stats, setStats] = useState<any>(null)
  const [teamStats, setTeamStats] = useState<any>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const demoUsers = [
    { email: 'admin@paygas.com.br', senha: '123456', role: 'ADMIN', nome: 'Administrador PayGas' },
    { email: 'gestor@paygas.com.br', senha: '123456', role: 'GESTOR', nome: 'Carlos Mendes' },
    { email: 'atendente@paygas.com.br', senha: '123456', role: 'ATENDENTE', nome: 'Ana Paula Costa' },
    { email: 'joao@paygas.com.br', senha: '123456', role: 'ATENDENTE', nome: 'Joao Silva' },
    { email: 'maria@paygas.com.br', senha: '123456', role: 'ATENDENTE', nome: 'Maria Santos' },
  ]

  const loadStats = async () => {
    try {
      const data = await api.getDashboard()
      setStats(data)
    } catch { /* */ }
  }

  const loadTeamStats = async () => {
    try {
      const res = await fetch('/api/usuarios/equipe/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (res.ok) setTeamStats(await res.json())
    } catch { /* */ }
  }

  useEffect(() => {
    loadStats()
    if (isAdmin) loadTeamStats()
  }, [])

  const handleChangePassword = async () => {
    setPasswordMsg(null)

    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Preencha todos os campos.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Nova senha deve ter pelo menos 8 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'As senhas não conferem.' })
      return
    }

    setPasswordLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Erro ao alterar senha.' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const level = Math.floor((xp || 0) / XP_PER_LEVEL) + 1

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Meu Perfil</div>
      </div>
      <div className="two-col">
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '20px' }}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <b style={{ fontSize: '18px', display: 'block', color: 'var(--gray-900)' }}>{user?.email}</b>
                <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{user?.role}</span>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={user?.email || ''} readOnly />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <div style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius)', background: '#f8fafc', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pg-orange)' }}>{xp || 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>XP Total</div>
              </div>
              <div style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius)', background: '#f8fafc', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#6366f1' }}>Nv. {level}</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>Nivel</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px' }}>
            <div className="section-title">Seguranca</div>
            <div className="form-field">
              <label className="form-label">Senha Atual</label>
              <input
                className="form-input"
                type="password"
                placeholder="Digite sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Nova Senha</label>
              <input
                className="form-input"
                type="password"
                placeholder="Minimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Confirmar Senha</label>
              <input
                className="form-input"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordMsg && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '12px',
                background: passwordMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: passwordMsg.type === 'success' ? '#166534' : '#991B1B',
              }}>
                {passwordMsg.text}
              </div>
            )}
            <button
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>

        <div>
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
            <div className="section-title">Estatisticas</div>
            <div className="cards-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}><i className="icon-zap icon-lg" /></div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{xp || 0}</div>
                <div className="stat-card-label">XP Total</div>
              </div>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}><i className="icon-star icon-lg" /></div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{level}</div>
                <div className="stat-card-label">Nivel Atual</div>
              </div>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}><i className="icon-trophy icon-lg" /></div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{stats?.totalCertificados || 0}</div>
                <div className="stat-card-label">Certificados</div>
              </div>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}><i className="icon-book-open icon-lg" /></div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{stats?.totalModulos || 0}</div>
                <div className="stat-card-label">Modulos</div>
              </div>
            </div>
          </div>

          {isAdmin && teamStats && (
            <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
              <div className="section-title">Equipes</div>
              <div className="cards-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div className="stat-card" style={{ padding: '14px' }}>
                  <div className="stat-card-val" style={{ fontSize: '20px' }}>{teamStats.totalGestores}</div>
                  <div className="stat-card-label">Gestores</div>
                </div>
                <div className="stat-card" style={{ padding: '14px' }}>
                  <div className="stat-card-val" style={{ fontSize: '20px' }}>{teamStats.totalAtendentes}</div>
                  <div className="stat-card-label">Atendentes</div>
                </div>
              </div>
            </div>
          )}

          {isAdmin && (
            <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Sandbox — Usuários de Teste
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '14px', padding: '8px 12px', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                Estas são credenciais de demonstração para acesso rápido ao ambiente de testes.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {demoUsers.map((u) => {
                  const personaColor = u.role === 'ADMIN' ? 'var(--pg-red)' : u.role === 'GESTOR' ? 'var(--pg-gold)' : 'var(--pg-green)'
                  return (
                    <div key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid var(--gray-200)' }}>
                      <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '14px', background: personaColor, color: '#fff' }}>
                        {u.nome.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: '13px', color: 'var(--gray-900)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome}</b>
                        <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{u.email}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: personaColor, color: '#fff' }}>{u.role}</span>
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'monospace' }}>senha: {u.senha}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
