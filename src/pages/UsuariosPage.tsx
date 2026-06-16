import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { PERSONAS } from '../data/constants'
import { api } from '../lib/api'


interface UsuariosPageProps {
  user: User
}

export function UsuariosPage({ user }: UsuariosPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', role: '' })
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const canValidate = isAdmin || isGestor

  useEffect(() => { loadUsuarios() }, [])

  const loadUsuarios = async () => {
    try {
      const data = await api.getUsuarios()
      setUsuarios(data)
    } catch {
      setUsuarios([])
    } finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!newUser.nome || !newUser.email || !newUser.senha || !newUser.role) {
      alert('Preencha todos os campos!')
      return
    }
    try {
      await api.createUsuario(newUser)
      alert('Usuario criado com sucesso! Email de verificacao enviado.')
      setShowCreateModal(false)
      setNewUser({ nome: '', email: '', senha: '', role: '' })
      loadUsuarios()
    } catch (err: any) {
      alert(err.message || 'Erro ao criar usuario')
    }
  }

  const handleEdit = async () => {
    if (!editingUser) return
    try {
      await api.updateUsuario(editingUser.id, { nome: editingUser.nome, email: editingUser.email, role: editingUser.role })
      alert('Usuario atualizado!')
      setEditingUser(null)
      loadUsuarios()
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este usuario?')) return
    try {
      await api.deleteUsuario(id)
      loadUsuarios()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const handleValidateAccount = async (id: string, nome: string) => {
    if (!confirm(`Validar a conta de ${nome}? O usuario tera acesso imediato.`)) return
    try {
      await api.validateAccount(id)
      alert('Conta validada com sucesso!')
      loadUsuarios()
    } catch (err: any) {
      alert(err.message || 'Erro ao validar conta')
    }
  }

  const handleResendVerification = async (id: string, nome: string) => {
    if (!confirm(`Reenviar email de verificacao para ${nome}?`)) return
    try {
      await api.resendVerification(id)
      alert('Email de verificacao reenviado!')
    } catch (err: any) {
      alert(err.message || 'Erro ao reenviar verificacao')
    }
  }

  const getPersonaIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <i className="icon-globe icon-sm" />
      case 'GESTOR': return <i className="icon-fuel icon-sm" />
      case 'ATENDENTE': return <i className="icon-user icon-sm" />
      default: return <i className="icon-user icon-sm" />
    }
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Usuarios da Plataforma</div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Novo Usuario</button>
      </div>
      <div className="cards-grid">
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#E6EEF9' }}><i className="icon-users icon-lg" /></div><div className="stat-card-val">{usuarios.length}</div><div className="stat-card-label">Total de Usuarios</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#DCFCE7' }}><i className="icon-check icon-lg" /></div><div className="stat-card-val">{usuarios.filter(u => u.emailVerificado).length}</div><div className="stat-card-label">Contas Verificadas</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF3C7' }}><i className="icon-alert-triangle icon-lg" /></div><div className="stat-card-val">{usuarios.filter(u => !u.emailVerificado).length}</div><div className="stat-card-label">Pendente Verificacao</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>XP</th><th>Ultimo Acesso</th><th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length > 0 ? (
              usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '10px', flexShrink: 0, background: PERSONAS[u.role as keyof typeof PERSONAS]?.color || '#999' }}>
                        {u.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </div>
                      <b>{u.nome}</b>
                    </div>
                  </td>
                  <td style={{ color: 'var(--gray-500)' }}>{u.email}</td>
                  <td><span className="track-badge badge-new" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{getPersonaIcon(u.role)} {PERSONAS[u.role as keyof typeof PERSONAS]?.label}</span></td>
                  <td>
                    {u.emailVerificado ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>
                        <i className="icon-check-circle icon-xs" /> Verificado
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '12px', fontWeight: 600 }}>
                        <i className="icon-clock icon-xs" /> Pendente
                      </span>
                    )}
                  </td>
                  <td><b style={{ color: 'var(--pg-orange)' }}>{u.xp || 0}</b></td>
                  <td style={{ color: 'var(--gray-500)', fontSize: '12px' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pt-BR') : 'Nunca'}</td>
                  <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditingUser({ ...u })}><i className="icon-pencil icon-xs" /> Editar</button>
                    {canValidate && !u.emailVerificado && (
                      <>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleValidateAccount(u.id, u.nome)}><i className="icon-check icon-xs" /> Validar</button>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: '#2563eb', borderColor: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleResendVerification(u.id, u.nome)}><i className="icon-mail icon-xs" /> Reenviar</button>
                      </>
                    )}
                    {isAdmin && <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDelete(u.id)}><i className="icon-trash-2 icon-xs" /></button>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                  {loading ? 'Carregando...' : 'Dados nao carregados'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Novo Usuario</h3>
            <div className="form-field"><label className="form-label">Nome Completo</label><input className="form-input" value={newUser.nome} onChange={e => setNewUser({ ...newUser, nome: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">E-mail</label><input className="form-input" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">Senha</label><input className="form-input" type="password" value={newUser.senha} onChange={e => setNewUser({ ...newUser, senha: e.target.value })} /></div>
            <div className="form-field">
              <label className="form-label">Perfil</label>
              <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="">— Selecione —</option>
                {isAdmin && <option value="ADMIN">Administrador</option>}
                <option value="GESTOR">Gestor de Posto</option>
                <option value="ATENDENTE">Atendente/Frentista</option>
              </select>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Um email de verificacao sera enviado para o usuario ativar a conta.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleCreate}>Criar e Enviar Verificacao</button>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Usuario</h3>
            <div className="form-field"><label className="form-label">Nome</label><input className="form-input" value={editingUser.nome} onChange={e => setEditingUser({ ...editingUser, nome: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">E-mail</label><input className="form-input" type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} /></div>
            <div className="form-field">
              <label className="form-label">Perfil</label>
              <select className="form-select" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                <option value="ADMIN">Administrador</option>
                <option value="GESTOR">Gestor de Posto</option>
                <option value="ATENDENTE">Atendente</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleEdit}>Salvar</button>
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
