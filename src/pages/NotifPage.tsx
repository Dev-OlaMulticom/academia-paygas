import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'


interface NotifPageProps {
  user: User
}

export function NotifPage({ user }: NotifPageProps) {
  const { toast } = useToast()
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendTarget, setSendTarget] = useState<'user' | 'all' | 'role' | 'team'>('user')
  const [newNotif, setNewNotif] = useState({ titulo: '', mensagem: '', toUserId: '', toRole: '' })
  const [notifs, setNotifs] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'

  const loadData = async () => {
    try {
      const [notifsData, usersData] = await Promise.all([
        api.getNotifications(),
        (isAdmin || isGestor) ? api.getUsuarios().catch(() => []) : Promise.resolve([]),
      ])
      setNotifs(notifsData)
      setUsuarios(usersData)
    } catch {
      setNotifs([])
      setUsuarios([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const getTeamMembers = () => {
    if (isGestor) {
      return usuarios.filter((u: any) => u.gestorId === user?.id)
    }
    return usuarios
  }

  const handleSend = async () => {
    if (!newNotif.titulo || !newNotif.mensagem) {
      toast('Preencha título e mensagem!', 'info')
      return
    }

    try {
      if (sendTarget === 'all' && isAdmin) {
        await api.sendNotificationBulk({ toId: 'all', titulo: newNotif.titulo, mensagem: newNotif.mensagem })
      } else if (sendTarget === 'role' && isAdmin && newNotif.toRole) {
        await api.sendNotificationBulk({ toRole: newNotif.toRole, titulo: newNotif.titulo, mensagem: newNotif.mensagem })
      } else if (sendTarget === 'team' && isGestor) {
        await api.sendNotificationBulk({ toTeam: true, titulo: newNotif.titulo, mensagem: newNotif.mensagem })
      } else if (sendTarget === 'user' && newNotif.toUserId) {
        await api.sendNotification(newNotif.toUserId, newNotif.titulo, newNotif.mensagem)
      } else {
        toast('Selecione um destinatário válido!', 'info')
        return
      }
      toast('Notificação enviada!', 'success')
      setShowSendModal(false)
      setNewNotif({ titulo: '', mensagem: '', toUserId: '', toRole: '' })
      setSendTarget('user')
    } catch (err: any) {
      toast(err.message || 'Erro ao enviar', 'error')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
    } catch { /* silent */ }
  }

  const unreadCount = notifs.filter(n => !n.lida).length

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Notificações {unreadCount > 0 && `(${unreadCount} não lidas)`}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleMarkAllRead}><i className="icon-check icon-sm" /> Marcar todas como lidas</button>
          {(isAdmin || isGestor) && <button className="btn-primary" onClick={() => setShowSendModal(true)}>+ Enviar Mensagem</button>}
        </div>
      </div>
      <div className="notif-list">
        {notifs.map((notif) => (
          <div key={notif.id} className={`notif-item ${!notif.lida ? 'unread' : ''}`}>
            <div className="notif-icon" style={{ background: !notif.lida ? 'var(--pg-orange-lt)' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="icon-bell icon-md" /></div>
            <div className="notif-body">
              <b>{notif.titulo}</b>
              <p>{notif.mensagem}</p>
              <time>{new Date(notif.createdAt).toLocaleDateString('pt-BR')}</time>
              {notif.from && <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}> · De: {notif.from.nome}</span>}
            </div>
            {!notif.lida && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pg-orange)', marginTop: '4px', flexShrink: 0 }}></div>}
          </div>
        ))}
        {notifs.length === 0 && !loading && <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>Nenhuma notificação</p>}
      </div>

      {showSendModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '480px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Enviar Mensagem</h3>

            {/* Target selector */}
            <div className="form-field">
              <label className="form-label">Enviar para</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <>
                    <button
                      className={`btn-secondary ${sendTarget === 'all' ? 'active' : ''}`}
                      style={{ fontSize: '12px', padding: '6px 12px', background: sendTarget === 'all' ? 'var(--pg-blue)' : undefined, color: sendTarget === 'all' ? '#fff' : undefined, borderColor: sendTarget === 'all' ? 'var(--pg-blue)' : undefined }}
                      onClick={() => setSendTarget('all')}
                    >
                      Todos os Usuários
                    </button>
                    <button
                      className={`btn-secondary ${sendTarget === 'role' ? 'active' : ''}`}
                      style={{ fontSize: '12px', padding: '6px 12px', background: sendTarget === 'role' ? 'var(--pg-blue)' : undefined, color: sendTarget === 'role' ? '#fff' : undefined, borderColor: sendTarget === 'role' ? 'var(--pg-blue)' : undefined }}
                      onClick={() => setSendTarget('role')}
                    >
                      Por Perfil
                    </button>
                  </>
                )}
                {isGestor && (
                  <button
                    className={`btn-secondary ${sendTarget === 'team' ? 'active' : ''}`}
                    style={{ fontSize: '12px', padding: '6px 12px', background: sendTarget === 'team' ? 'var(--pg-blue)' : undefined, color: sendTarget === 'team' ? '#fff' : undefined, borderColor: sendTarget === 'team' ? 'var(--pg-blue)' : undefined }}
                    onClick={() => setSendTarget('team')}
                  >
                    Minha Equipe
                  </button>
                )}
                <button
                  className={`btn-secondary ${sendTarget === 'user' ? 'active' : ''}`}
                  style={{ fontSize: '12px', padding: '6px 12px', background: sendTarget === 'user' ? 'var(--pg-blue)' : undefined, color: sendTarget === 'user' ? '#fff' : undefined, borderColor: sendTarget === 'user' ? 'var(--pg-blue)' : undefined }}
                  onClick={() => setSendTarget('user')}
                >
                  Usuário Específico
                </button>
              </div>
            </div>

            {/* Role selector (ADMIN only) */}
            {sendTarget === 'role' && isAdmin && (
              <div className="form-field">
                <label className="form-label">Perfil</label>
                <select className="form-select" value={newNotif.toRole} onChange={e => setNewNotif({ ...newNotif, toRole: e.target.value })}>
                  <option value="">— Selecione o perfil —</option>
                  <option value="ADMIN">Administradores</option>
                  <option value="GESTOR">Gestores de Posto</option>
                  <option value="ATENDENTE">Atendentes</option>
                </select>
              </div>
            )}

            {/* User selector */}
            {sendTarget === 'user' && (
              <div className="form-field">
                <label className="form-label">Usuário</label>
                <select className="form-select" value={newNotif.toUserId} onChange={e => setNewNotif({ ...newNotif, toUserId: e.target.value })}>
                  <option value="">— Selecione —</option>
                  {getTeamMembers().map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Summary */}
            {sendTarget === 'all' && isAdmin && (
              <div style={{ padding: '8px 12px', background: '#E3F2FD', borderRadius: '6px', fontSize: '12px', color: '#1565C0', marginBottom: '12px' }}>
                A mensagem será enviada para todos os usuários da plataforma.
              </div>
            )}
            {sendTarget === 'role' && isAdmin && newNotif.toRole && (
              <div style={{ padding: '8px 12px', background: '#E3F2FD', borderRadius: '6px', fontSize: '12px', color: '#1565C0', marginBottom: '12px' }}>
                A mensagem será enviada para todos os usuários com perfil <b>{newNotif.toRole}</b>.
              </div>
            )}
            {sendTarget === 'team' && isGestor && (
              <div style={{ padding: '8px 12px', background: '#E8F5E9', borderRadius: '6px', fontSize: '12px', color: '#2E7D32', marginBottom: '12px' }}>
                A mensagem será enviada para todos os atendentes da sua equipe ({getTeamMembers().length} membro(s)).
              </div>
            )}

            <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={newNotif.titulo} onChange={e => setNewNotif({ ...newNotif, titulo: e.target.value })} placeholder="Assunto da mensagem" /></div>
            <div className="form-field"><label className="form-label">Mensagem</label><textarea className="form-input" value={newNotif.mensagem} onChange={e => setNewNotif({ ...newNotif, mensagem: e.target.value })} rows={4} placeholder="Digite sua mensagem..." /></div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleSend}>Enviar</button>
              <button className="btn-secondary" onClick={() => { setShowSendModal(false); setSendTarget('user'); setNewNotif({ titulo: '', mensagem: '', toUserId: '', toRole: '' }) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
