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

  useEffect(() => {
    loadStats()
    if (isAdmin) loadTeamStats()
  }, [])

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
              <label className="form-label">Nova Senha</label>
              <input className="form-input" type="password" placeholder="Minimo 8 caracteres" />
            </div>
            <div className="form-field">
              <label className="form-label">Confirmar Senha</label>
              <input className="form-input" type="password" placeholder="Repita a senha" />
            </div>
            <button className="btn-secondary" style={{ width: '100%' }}>Alterar Senha</button>
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
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              border: '1px solid #4338ca',
              borderRadius: 'var(--radius)',
              padding: '24px',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '18px' }}>🧪</span>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Sandbox - Usuarios de Teste</span>
              </div>
              <div style={{ fontSize: '12px', color: '#c7d2fe', marginBottom: '16px' }}>
                Estes usuarios foram criados automaticamente pelo seed do sistema.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {TEST_USERS.map((tu, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: tu.role === 'ADMIN' ? '#ef4444' : tu.role === 'GESTOR' ? '#f59e0b' : '#8b5cf6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700,
                      }}>
                        {tu.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{tu.nome}</div>
                        <div style={{ fontSize: '11px', color: '#a5b4fc' }}>{tu.email}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                        background: tu.role === 'ADMIN' ? '#ef4444' : tu.role === 'GESTOR' ? '#f59e0b' : '#8b5cf6',
                      }}>
                        {tu.role}
                      </span>
                      <div style={{ fontSize: '10px', color: '#a5b4fc', marginTop: '2px' }}>Pass: {tu.senha}</div>
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
