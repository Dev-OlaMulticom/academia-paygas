import { useState } from 'react'
import type { User } from '../hooks/useAuth'

interface CMSPageProps {
  user: User
}

export function CMSPage({ user }: CMSPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newModule, setNewModule] = useState({ titulo: '', descricao: '', trilha: '', videoUrl: '', autoGerarCertificado: false })

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'

  const mods = [
    { id: 1, title: 'Boas-Vindas à Academia PayGas', persona: 'Todos', aulas: 3, yt: true, status: 'published', autoGerarCertificado: true },
    { id: 2, title: 'Manual do Atendente — Versão 2025', persona: 'Atendente', aulas: 8, yt: false, status: 'published', autoGerarCertificado: false },
    { id: 3, title: 'Guia do Gestor Regional', persona: 'Gestor', aulas: 6, yt: true, status: 'published', autoGerarCertificado: false },
    { id: 4, title: 'API PayGas — Documentação Técnica', persona: 'ERP', aulas: 5, yt: false, status: 'draft', autoGerarCertificado: false },
  ]

  const handleCreateModule = () => {
    alert('Módulo criado com sucesso!')
    setShowCreateModal(false)
    setNewModule({ titulo: '', descricao: '', trilha: '', videoUrl: '', autoGerarCertificado: false })
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Gestão de Conteúdo</div>
        {(isAdmin || isGestor) && <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Novo Módulo</button>}
      </div>
      <div className="admin-tabs">
        <button className="admin-tab active">Publicados</button>
        <button className="admin-tab">Rascunhos</button>
        <button className="admin-tab">Todos</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Persona</th>
              <th>Aulas</th>
              <th>Vídeo YT</th>
              <th>Auto-Certificado</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {mods.map((mod) => (
              <tr key={mod.id}>
                <td><b>{mod.title}</b></td>
                <td><span className="track-badge badge-new">{mod.persona}</span></td>
                <td>{mod.aulas} aulas</td>
                <td><span className={`status-pill ${mod.yt ? 'pill-green' : 'pill-gray'}`}>{mod.yt ? '✓ Vinculado' : 'Sem vídeo'}</span></td>
                <td><span className={`status-pill ${mod.autoGerarCertificado ? 'pill-green' : 'pill-gray'}`}>{mod.autoGerarCertificado ? 'Sim' : 'Não'}</span></td>
                <td><span className={`status-pill ${mod.status === 'published' ? 'pill-green' : 'pill-orange'}`}>{mod.status === 'published' ? 'Publicado' : 'Rascunho'}</span></td>
                <td style={{ display: 'flex', gap: '6px' }}>
                  {(isAdmin || isGestor) && (
                    <>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>✏️ Editar</button>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>👁️</button>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }}>🗑️</button>
                    </>
                  )}
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
              <label className="form-label">Título</label>
              <input className="form-input" type="text" value={newModule.titulo} onChange={(e) => setNewModule({...newModule, titulo: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="form-label">Descrição</label>
              <textarea className="form-input" value={newModule.descricao} onChange={(e) => setNewModule({...newModule, descricao: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="form-label">Trilha</label>
              <select className="form-select" value={newModule.trilha} onChange={(e) => setNewModule({...newModule, trilha: e.target.value})}>
                <option value="">— Selecione —</option>
                <option value="atendimento">Excelência no Atendimento</option>
                <option value="cashback">Sistema de Cashback</option>
                <option value="gestao">Gestão e KPIs</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">URL do Vídeo (YouTube)</label>
              <input className="form-input" type="text" value={newModule.videoUrl} onChange={(e) => setNewModule({...newModule, videoUrl: e.target.value})} placeholder="https://www.youtube.com/embed/..." />
            </div>
            <div className="form-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={newModule.autoGerarCertificado} onChange={(e) => setNewModule({...newModule, autoGerarCertificado: e.target.checked})} />
                Auto-gerar certificado ao concluir
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleCreateModule}>Criar</button>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
