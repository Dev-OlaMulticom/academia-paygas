import { useState } from 'react'
import type { User } from '../hooks/useAuth'

interface NotifPageProps {
  user: User
}

export function NotifPage({ user }: NotifPageProps) {
  const [showSendModal, setShowSendModal] = useState(false)
  const [newNotif, setNewNotif] = useState({ titulo: '', mensagem: '', toUserId: '' })

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'

  const notifs = [
    { title: 'Novo módulo disponível!', body: '"Cashback — Novidades 2025" foi publicado para você.', icon: '📚', time: 'Há 2 horas', unread: true },
    { title: 'Você subiu de nível! 🎉', body: 'Parabéns! Você alcançou o Nível 2 na Academia.', icon: '⭐', time: 'Há 1 dia', unread: true },
    { title: 'Certificado emitido', body: 'Seu certificado de Atendimento está disponível para download.', icon: '🏆', time: 'Há 4 dias', unread: false },
  ]

  const atendentes = [
    { id: '1', nome: 'Ana Paula Costa' },
    { id: '2', nome: 'João Silva' },
    { id: '3', nome: 'Maria Santos' },
  ]

  const handleSendNotif = () => {
    if (!newNotif.titulo || !newNotif.mensagem || !newNotif.toUserId) {
      alert('Preencha todos os campos!')
      return
    }
    alert('Notificação enviada com sucesso!')
    setShowSendModal(false)
    setNewNotif({ titulo: '', mensagem: '', toUserId: '' })
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Notificações</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary">✓ Marcar todas como lidas</button>
          {(isAdmin || isGestor) && <button className="btn-primary" onClick={() => setShowSendModal(true)}>+ Enviar Mensagem</button>}
        </div>
      </div>
      <div className="notif-list">
        {notifs.map((notif, i) => (
          <div key={i} className={`notif-item ${notif.unread ? 'unread' : ''}`}>
            <div className="notif-icon" style={{ background: notif.unread ? 'var(--pg-orange-lt)' : 'var(--gray-100)' }}>{notif.icon}</div>
            <div className="notif-body">
              <b>{notif.title}</b>
              <p>{notif.body}</p>
              <time>{notif.time}</time>
            </div>
            {notif.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pg-orange)', marginTop: '4px', flexShrink: 0 }}></div>}
          </div>
        ))}
      </div>
      {showSendModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Enviar Mensagem</h3>
            <div className="form-field">
              <label className="form-label">Para</label>
              <select className="form-select" value={newNotif.toUserId} onChange={(e) => setNewNotif({...newNotif, toUserId: e.target.value})}>
                <option value="">— Selecione —</option>
                {atendentes.map((at) => (
                  <option key={at.id} value={at.id}>{at.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Título</label>
              <input className="form-input" type="text" value={newNotif.titulo} onChange={(e) => setNewNotif({...newNotif, titulo: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="form-label">Mensagem</label>
              <textarea className="form-input" value={newNotif.mensagem} onChange={(e) => setNewNotif({...newNotif, mensagem: e.target.value})} rows={4} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleSendNotif}>Enviar</button>
              <button className="btn-secondary" onClick={() => setShowSendModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
