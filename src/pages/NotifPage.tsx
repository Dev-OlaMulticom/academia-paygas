import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'

interface NotifPageProps {
  user: User
}

export function NotifPage({ user }: NotifPageProps) {
  const [showSendModal, setShowSendModal] = useState(false)
  const [newNotif, setNewNotif] = useState({ titulo: '', mensagem: '', toUserId: '' })
  const [notifs, setNotifs] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [notifsData, equipeData] = await Promise.all([
        api.getNotifications(),
        (isAdmin || isGestor) ? api.getEquipe() : Promise.resolve([]),
      ])
      setNotifs(notifsData)
      setEquipe(equipeData)
    } catch {
      setNotifs([])
      setEquipe([])
    } finally { setLoading(false) }
  }

  const handleSend = async () => {
    if (!newNotif.titulo || !newNotif.mensagem || !newNotif.toUserId) {
      alert('Preencha todos os campos!')
      return
    }
    try {
      await api.sendNotification(newNotif.toUserId, newNotif.titulo, newNotif.mensagem)
      alert('Notificação enviada!')
      setShowSendModal(false)
      setNewNotif({ titulo: '', mensagem: '', toUserId: '' })
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
    } catch {}
  }

  const unreadCount = notifs.filter(n => !n.lida).length

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Notificações {unreadCount > 0 && `(${unreadCount} não lidas)`}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={handleMarkAllRead}>✓ Marcar todas como lidas</button>
          {(isAdmin || isGestor) && <button className="btn-primary" onClick={() => setShowSendModal(true)}>+ Enviar Mensagem</button>}
        </div>
      </div>
      <div className="notif-list">
        {notifs.map((notif) => (
          <div key={notif.id} className={`notif-item ${!notif.lida ? 'unread' : ''}`}>
            <div className="notif-icon" style={{ background: !notif.lida ? 'var(--pg-orange-lt)' : 'var(--gray-100)' }}>🔔</div>
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
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Enviar Mensagem</h3>
            <div className="form-field">
              <label className="form-label">Para</label>
              <select className="form-select" value={newNotif.toUserId} onChange={e => setNewNotif({ ...newNotif, toUserId: e.target.value })}>
                <option value="">— Selecione —</option>
                {equipe.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={newNotif.titulo} onChange={e => setNewNotif({ ...newNotif, titulo: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">Mensagem</label><textarea className="form-input" value={newNotif.mensagem} onChange={e => setNewNotif({ ...newNotif, mensagem: e.target.value })} rows={4} /></div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleSend}>Enviar</button>
              <button className="btn-secondary" onClick={() => setShowSendModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
