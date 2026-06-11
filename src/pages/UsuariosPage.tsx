import { useState } from 'react'
import type { User } from '../hooks/useAuth'
import { PERSONAS } from '../data/constants'

interface UsuariosPageProps {
  user: User
}

export function UsuariosPage({ user }: UsuariosPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', role: '' })

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'

  const users = [
    { nome: 'Carlos Mendes', email: 'carlos@posto2.com.br', role: 'GESTOR', estado: 'RJ', xp: 4100, acesso: 'Ontem', ativo: true },
    { nome: 'Ana Paula Costa', email: 'ana@posto1.com.br', role: 'ATENDENTE', estado: 'SP', xp: 2400, acesso: 'Hoje', ativo: true },
    { nome: 'João Silva', email: 'joao@posto1.com.br', role: 'ATENDENTE', estado: 'SP', xp: 1200, acesso: 'Hoje', ativo: true },
  ]

  const handleCreateUser = () => {
    if (!newUser.nome || !newUser.email || !newUser.senha || !newUser.role) {
      alert('Preencha todos os campos!')
      return
    }
    alert(`Usuário ${newUser.nome} criado com sucesso!`)
    setShowCreateModal(false)
    setNewUser({ nome: '', email: '', senha: '', role: '' })
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Usuários da Plataforma</div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Novo Usuário</button>
      </div>
      <div className="cards-grid">
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#E6EEF9' }}>👥</div><div className="stat-card-val">{users.length}</div><div className="stat-card-label">Total de Usuários</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#DCFCE7' }}>✅</div><div className="stat-card-val">{users.filter(u => u.ativo).length}</div><div className="stat-card-label">Usuários Ativos</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF3C7' }}>🆕</div><div className="stat-card-val">0</div><div className="stat-card-label">Novos este mês</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Estado</th>
              <th>XP</th>
              <th>Último Acesso</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '10px', flexShrink: 0, background: PERSONAS[u.role as keyof typeof PERSONAS].color }}>
                      {u.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                    <b>{u.nome}</b>
                  </div>
                </td>
                <td style={{ color: 'var(--gray-500)' }}>{u.email}</td>
                <td><span className="track-badge badge-new" style={{ fontSize: '11px' }}>{PERSONAS[u.role as keyof typeof PERSONAS].icon} {PERSONAS[u.role as keyof typeof PERSONAS].label}</span></td>
                <td>{u.estado}</td>
                <td><b style={{ color: 'var(--pg-orange)' }}>{u.xp.toLocaleString('pt-BR')}</b></td>
                <td style={{ color: 'var(--gray-500)' }}>{u.acesso}</td>
                <td><span className={`status-pill ${u.ativo ? 'pill-green' : 'pill-gray'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCreateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Novo Usuário</h3>
            <div className="form-field">
              <label className="form-label">Nome Completo</label>
              <input className="form-input" type="text" value={newUser.nome} onChange={(e) => setNewUser({...newUser, nome: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" value={newUser.senha} onChange={(e) => setNewUser({...newUser, senha: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="form-label">Perfil</label>
              <select className="form-select" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                <option value="">— Selecione —</option>
                {isAdmin && <option value="ADMIN">Administrador</option>}
                {isAdmin && <option value="GESTOR">Gestor de Posto</option>}
                {(isAdmin || isGestor) && <option value="ATENDENTE">Atendente/Frentista</option>}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleCreateUser}>Criar</button>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
