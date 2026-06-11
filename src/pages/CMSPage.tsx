import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'

interface CMSPageProps {
  user: User
}

export function CMSPage({ user }: CMSPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMod, setEditingMod] = useState<any>(null)
  const [newModule, setNewModule] = useState({ trilhaId: '', titulo: '', descricao: '', videoUrl: '', autoGerarCertificado: false })
  const [modulos, setModulos] = useState<any[]>([])
  const [trilhas, setTrilhas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [mods, trilhasData] = await Promise.all([api.getCmsModulos(), api.getTrilhas()])
      setModulos(mods)
      setTrilhas(trilhasData)
    } catch {
      setModulos([
        { id: '1', titulo: 'Boas-Vindas à Academia PayGas', trilha: { titulo: 'Geral' }, _count: { aulas: 3 } },
        { id: '2', titulo: 'Manual do Atendente', trilha: { titulo: 'Atendimento' }, _count: { aulas: 8 } },
      ])
      setTrilhas([{ id: '1', titulo: 'Excelência no Atendimento' }])
    } finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!newModule.trilhaId || !newModule.titulo) {
      alert('Trilha e título são obrigatórios!')
      return
    }
    try {
      await api.createModulo(newModule)
      alert('Módulo criado com sucesso!')
      setShowCreateModal(false)
      setNewModule({ trilhaId: '', titulo: '', descricao: '', videoUrl: '', autoGerarCertificado: false })
      loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao criar módulo')
    }
  }

  const handleEdit = async () => {
    if (!editingMod) return
    try {
      await api.updateModulo(editingMod.id, { titulo: editingMod.titulo, descricao: editingMod.descricao })
      alert('Módulo atualizado!')
      setEditingMod(null)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este módulo? Todas as aulas serão removidas.')) return
    try {
      await api.deleteModulo(id)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Gestão de Conteúdo</div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Novo Módulo</button>
      </div>
      <div className="admin-tabs">
        <button className="admin-tab active">Publicados</button>
        <button className="admin-tab">Rascunhos</button>
        <button className="admin-tab">Todos</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Título</th><th>Trilha</th><th>Aulas</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {modulos.map((mod) => (
              <tr key={mod.id}>
                <td><b>{mod.titulo}</b></td>
                <td><span className="track-badge badge-new">{mod.trilha?.titulo || '—'}</span></td>
                <td>{mod._count?.aulas || 0} aulas</td>
                <td style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => setEditingMod({ ...mod })}>✏️ Editar</button>
                  {isAdmin && <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }} onClick={() => handleDelete(mod.id)}>🗑️</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Novo Módulo</h3>
            <div className="form-field">
              <label className="form-label">Trilha</label>
              <select className="form-select" value={newModule.trilhaId} onChange={e => setNewModule({ ...newModule, trilhaId: e.target.value })}>
                <option value="">— Selecione —</option>
                {trilhas.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </div>
            <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={newModule.titulo} onChange={e => setNewModule({ ...newModule, titulo: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">Descrição</label><textarea className="form-input" value={newModule.descricao} onChange={e => setNewModule({ ...newModule, descricao: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">URL do Vídeo (YouTube)</label><input className="form-input" value={newModule.videoUrl} onChange={e => setNewModule({ ...newModule, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." /></div>
            <div className="form-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={newModule.autoGerarCertificado} onChange={e => setNewModule({ ...newModule, autoGerarCertificado: e.target.checked })} />
                Auto-gerar certificado ao concluir
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleCreate}>Criar</button>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {editingMod && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Módulo</h3>
            <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={editingMod.titulo} onChange={e => setEditingMod({ ...editingMod, titulo: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">Descrição</label><textarea className="form-input" value={editingMod.descricao || ''} onChange={e => setEditingMod({ ...editingMod, descricao: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleEdit}>Salvar</button>
              <button className="btn-secondary" onClick={() => setEditingMod(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
