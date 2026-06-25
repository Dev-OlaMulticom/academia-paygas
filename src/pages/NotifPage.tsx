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
      toast('Preencha titulo e mensagem!', 'info')
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
        toast('Selecione um destinatario valido!', 'info')
        return
      }
      toast('Notificacao enviada!', 'success')
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
        <div className="page-title">Notificacoes {unreadCount > 0 && `(${unreadCount} nao lidas)`}</div>
        <div className="notif-header-actions">
          <button className="btn-secondary notif-mark-read-btn" onClick={handleMarkAllRead}><i className="icon-check icon-sm" /> Marcar todas como lidas</button>
          {(isAdmin || isGestor) && <button className="btn-primary" onClick={() => setShowSendModal(true)}>+ Enviar Mensagem</button>}
        </div>
      </div>
      <div className="notif-list">
        {notifs.map((notif) => (
          <div key={notif.id} className={`notif-item ${!notif.lida ? 'unread' : ''}`}>
            <div className="notif-icon notif-icon-box" style={{ background: !notif.lida ? 'var(--pg-orange-lt)' : 'var(--gray-100)' }}><i className="icon-bell icon-md" /></div>
            <div className="notif-body">
              <b>{notif.titulo}</b>
              <p>{notif.mensagem}</p>
              <time>{new Date(notif.createdAt).toLocaleDateString('pt-BR')}</time>
              {notif.from && <span className="notif-from"> · De: {notif.from.nome}</span>}
            </div>
            {!notif.lida && <div className="notif-unread-dot"></div>}
          </div>
        ))}
        {notifs.length === 0 && !loading && <p className="notif-empty">Nenhuma notificacao</p>}
      </div>

      {showSendModal && (
        <div className="notif-modal-overlay">
          <div className="notif-modal">
            <h3>Enviar Mensagem</h3>

            <div className="form-field">
              <label className="form-label">Enviar para</label>
              <div className="notif-target-btns">
                {isAdmin && (
                  <>
                    <button className={`btn-secondary notif-target-btn ${sendTarget === 'all' ? 'active' : ''}`} onClick={() => setSendTarget('all')}>Todos os Usuarios</button>
                    <button className={`btn-secondary notif-target-btn ${sendTarget === 'role' ? 'active' : ''}`} onClick={() => setSendTarget('role')}>Por Perfil</button>
                  </>
                )}
                {isGestor && (
                  <button className={`btn-secondary notif-target-btn ${sendTarget === 'team' ? 'active' : ''}`} onClick={() => setSendTarget('team')}>Minha Equipe</button>
                )}
                <button className={`btn-secondary notif-target-btn ${sendTarget === 'user' ? 'active' : ''}`} onClick={() => setSendTarget('user')}>Usuario Especifico</button>
              </div>
            </div>

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

            {sendTarget === 'user' && (
              <div className="form-field">
                <label className="form-label">Usuario</label>
                <select className="form-select" value={newNotif.toUserId} onChange={e => setNewNotif({ ...newNotif, toUserId: e.target.value })}>
                  <option value="">— Selecione —</option>
                  {getTeamMembers().map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}

            {sendTarget === 'all' && isAdmin && (
              <div className="notif-info-box blue">A mensagem sera enviada para todos os usuarios da plataforma.</div>
            )}
            {sendTarget === 'role' && isAdmin && newNotif.toRole && (
              <div className="notif-info-box blue">A mensagem sera enviada para todos os usuarios com perfil <b>{newNotif.toRole}</b>.</div>
            )}
            {sendTarget === 'team' && isGestor && (
              <div className="notif-info-box green">A mensagem sera enviada para todos os atendentes da sua equipe ({getTeamMembers().length} membro(s)).</div>
            )}

            <div className="form-field"><label className="form-label">Titulo</label><input className="form-input" value={newNotif.titulo} onChange={e => setNewNotif({ ...newNotif, titulo: e.target.value })} placeholder="Assunto da mensagem" /></div>
            <div className="form-field"><label className="form-label">Mensagem</label><textarea className="form-input" value={newNotif.mensagem} onChange={e => setNewNotif({ ...newNotif, mensagem: e.target.value })} rows={4} placeholder="Digite sua mensagem..." /></div>
            <div className="notif-modal-footer">
              <button className="btn-primary" onClick={handleSend}>Enviar</button>
              <button className="btn-secondary" onClick={() => { setShowSendModal(false); setSendTarget('user'); setNewNotif({ titulo: '', mensagem: '', toUserId: '', toRole: '' }) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
