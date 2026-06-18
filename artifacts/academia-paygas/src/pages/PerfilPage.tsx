import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'

interface PerfilPageProps {
  user: User
  xp: number
}

const TEST_USERS = [
  { email: 'admin@paygas.com.br', nome: 'Administrador PayGas', role: 'ADMIN', senha: '123456' },
  { email: 'gestor@paygas.com.br', nome: 'Carlos Mendes', role: 'GESTOR', senha: '123456' },
  { email: 'atendente@paygas.com.br', nome: 'Ana Paula Costa', role: 'ATENDENTE', senha: '123456' },
  { email: 'joao@paygas.com.br', nome: 'Joao Silva', role: 'ATENDENTE', senha: '123456' },
  { email: 'maria@paygas.com.br', nome: 'Maria Santos', role: 'ATENDENTE', senha: '123456' },
]

export function PerfilPage({ user, xp }: PerfilPageProps) {
  const isAdmin = user?.role === 'ADMIN'
  const [stats, setStats] = useState<any>(null)
  const [teamStats, setTeamStats] = useState<any>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  const level = Math.floor((xp || 0) / 2000) + 1

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
            <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px' }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span>🧪</span>
                <span>Sandbox - Usuarios de Teste</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '16px' }}>
                Estes usuarios foram criados automaticamente pelo seed do sistema.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {TEST_USERS.map((tu, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '8px',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-100)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: tu.role === 'ADMIN' ? 'var(--pg-red)' : tu.role === 'GESTOR' ? 'var(--pg-gold)' : 'var(--pg-green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, color: '#fff',
                      }}>
                        {tu.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>{tu.nome}</div>
                        <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{tu.email}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                        background: tu.role === 'ADMIN' ? 'var(--pg-red-lt)' : tu.role === 'GESTOR' ? 'var(--pg-gold-lt)' : 'var(--pg-green-lt)',
                        color: tu.role === 'ADMIN' ? 'var(--pg-red)' : tu.role === 'GESTOR' ? 'var(--pg-gold)' : 'var(--pg-green)',
                      }}>
                        {tu.role}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '2px' }}>Pass: {tu.senha}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
