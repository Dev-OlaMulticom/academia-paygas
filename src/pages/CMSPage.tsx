import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { VideoPreview } from '../components/VideoPreview'


interface CMSPageProps {
  user: User
}

interface MicroLesson {
  hours: number
  minutes: number
  seconds: number
  titulo: string
}

interface VideoDuration {
  hours: number
  minutes: number
  seconds: number
}

export function CMSPage({ user }: CMSPageProps) {
  const [view, setView] = useState<'modulos' | 'aulas'>('modulos')
  const [selectedModulo, setSelectedModulo] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAulaModal, setShowAulaModal] = useState(false)
  const [editingMod, setEditingMod] = useState<any>(null)
  const [editingAula, setEditingAula] = useState<any>(null)
  const [newModule, setNewModule] = useState({ titulo: '', descricao: '' })
  const [newAula, setNewAula] = useState({ titulo: '', tipo: 'video' as 'video' | 'pdf', url: '', microLessons: [] as MicroLesson[], duration: { hours: 0, minutes: 0, seconds: 0 } as VideoDuration })
  const [modulos, setModulos] = useState<any[]>([])
  const [aulas, setAulas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => { loadModulos() }, [])
  useEffect(() => { if (selectedModulo) loadAulas(selectedModulo.id) }, [selectedModulo])

  const loadModulos = async () => {
    try {
      const mods = await api.getCmsModulos()
      setModulos(mods)
    } catch {
      setModulos([
        { id: '1', titulo: 'Boas-Vindas à Academia PayGas', descricao: 'Introdução à plataforma', _count: { aulas: 3 } },
        { id: '2', titulo: 'Manual do Atendente', descricao: 'Procedimentos de atendimento', _count: { aulas: 8 } },
      ])
    } finally { setLoading(false) }
  }

  const loadAulas = async (moduloId: string) => {
    try {
      const lessons = await api.getAulas(moduloId)
      setAulas(lessons)
    } catch {
      setAulas([])
    }
  }

  const handleCreateModulo = async () => {
    if (!newModule.titulo) {
      alert('Título é obrigatório!')
      return
    }
    try {
      await api.createModulo(newModule)
      alert('Módulo criado com sucesso!')
      setShowCreateModal(false)
      setNewModule({ titulo: '', descricao: '' })
      loadModulos()
    } catch (err: any) {
      alert(err.message || 'Erro ao criar módulo')
    }
  }

  const handleEditModulo = async () => {
    if (!editingMod) return
    try {
      await api.updateModulo(editingMod.id, { titulo: editingMod.titulo, descricao: editingMod.descricao })
      alert('Módulo atualizado!')
      setEditingMod(null)
      loadModulos()
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar')
    }
  }

  const handleDeleteModulo = async (id: string) => {
    if (!confirm('Excluir este módulo? Todas as aulas serão removidas.')) return
    try {
      await api.deleteModulo(id)
      loadModulos()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const handleCreateAula = async () => {
    if (!newAula.titulo || !newAula.url) {
      alert('Título e URL são obrigatórios!')
      return
    }
    if (newAula.tipo === 'video' && newAula.microLessons.length === 0) {
      if (!confirm('Não há micro-leções definidas. Deseja continuar?')) return
    }
    try {
      await api.createAula(selectedModulo.id, newAula)
      alert('Aula criada com sucesso!')
      setShowAulaModal(false)
      setNewAula({ titulo: '', tipo: 'video', url: '', microLessons: [], duration: { hours: 0, minutes: 0, seconds: 0 } })
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      alert(err.message || 'Erro ao criar aula')
    }
  }

  const handleEditAula = async () => {
    if (!editingAula) return
    try {
      await api.updateAula(editingAula.id, editingAula)
      alert('Aula atualizada!')
      setEditingAula(null)
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar')
    }
  }

  const handleDeleteAula = async (id: string) => {
    if (!confirm('Excluir esta aula?')) return
    try {
      await api.deleteAula(id)
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const addMicroLesson = () => {
    setNewAula({ ...newAula, microLessons: [...newAula.microLessons, { hours: 0, minutes: 0, seconds: 0, titulo: '' }] })
  }

  const removeMicroLesson = (index: number) => {
    setNewAula({ ...newAula, microLessons: newAula.microLessons.filter((_, i) => i !== index) })
  }

  const updateMicroLesson = (index: number, field: keyof MicroLesson, value: string | number) => {
    const updated = [...newAula.microLessons]
    updated[index] = { ...updated[index], [field]: value }
    setNewAula({ ...newAula, microLessons: updated })
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Gestão de Conteúdo</div>
          <div className="page-subtitle">
            {view === 'modulos' ? 'Gerencie seus módulos (categorias)' : selectedModulo?.titulo || 'Aulas'}
          </div>
        </div>
        {view === 'modulos' ? (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Novo Módulo</button>
        ) : (
          <>
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setView('modulos')}><i className="icon-arrow-left icon-sm" /> Voltar aos Módulos</button>
            <button className="btn-primary" onClick={() => setShowAulaModal(true)}>+ Nova Aula</button>
          </>
        )}
      </div>

      {view === 'modulos' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Título</th><th>Descrição</th><th>Aulas</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {modulos.length > 0 ? (
                modulos.map((mod) => (
                  <tr key={mod.id}>
                    <td><b>{mod.titulo}</b></td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '13px' }}>{mod.descricao || '—'}</td>
                    <td>{mod._count?.aulas || 0} aulas</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => { setSelectedModulo(mod); setView('aulas') }}><i className="icon-book-open icon-xs" /> Aulas</button>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditingMod({ ...mod })}><i className="icon-pencil icon-xs" /> Editar</button>
                      {isAdmin && <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDeleteModulo(mod.id)}><i className="icon-trash-2 icon-xs" /></button>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                    Dados não carregados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Título</th><th>Tipo</th><th>URL</th><th>Micro-Leções</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {aulas.length > 0 ? (
                aulas.map((aula) => (
                  <tr key={aula.id}>
                    <td><b>{aula.titulo}</b></td>
                    <td><span className={`track-badge ${aula.tipo === 'video' ? 'badge-new' : 'badge-blue'}`} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{aula.tipo === 'video' ? <><i className="icon-video icon-xs" /> Vídeo</> : <><i className="icon-file-text icon-xs" /> PDF</>}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aula.url}</td>
                    <td>{aula.microLessons?.length || 0} pontos</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditingAula({ ...aula })}><i className="icon-pencil icon-xs" /> Editar</button>
                      {isAdmin && <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDeleteAula(aula.id)}><i className="icon-trash-2 icon-xs" /></button>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                    Dados não carregados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar Módulo */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Novo Módulo</h3>
            <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={newModule.titulo} onChange={e => setNewModule({ ...newModule, titulo: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">Descrição</label><textarea className="form-input" value={newModule.descricao} onChange={e => setNewModule({ ...newModule, descricao: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleCreateModulo}>Criar</button>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Módulo */}
      {editingMod && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Módulo</h3>
            <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={editingMod.titulo} onChange={e => setEditingMod({ ...editingMod, titulo: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">Descrição</label><textarea className="form-input" value={editingMod.descricao || ''} onChange={e => setEditingMod({ ...editingMod, descricao: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleEditModulo}>Salvar</button>
              <button className="btn-secondary" onClick={() => setEditingMod(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Aula */}
      {showAulaModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '900px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Nova Aula</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={newAula.titulo} onChange={e => setNewAula({ ...newAula, titulo: e.target.value })} /></div>
                <div className="form-field">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={newAula.tipo} onChange={e => setNewAula({ ...newAula, tipo: e.target.value as 'video' | 'pdf' })}>
                    <option value="video"><i className="icon-video icon-sm" /> Vídeo (YouTube)</option>
                    <option value="pdf"><i className="icon-file-text icon-sm" /> PDF</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">URL</label>
                  <input className="form-input" value={newAula.url} onChange={e => setNewAula({ ...newAula, url: e.target.value })} placeholder={newAula.tipo === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://.../documento.pdf'} />
                </div>
                {newAula.tipo === 'video' && (
                  <div className="form-field">
                    <label className="form-label">Micro-Leções (pontos de separação)</label>
                    {newAula.microLessons.map((ml, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Hora</label>
                          <select
                            className="form-select"
                            style={{ width: '70px', padding: '6px', fontSize: '13px' }}
                            value={ml.hours}
                            onChange={e => updateMicroLesson(i, 'hours', parseInt(e.target.value) || 0)}
                          >
                            {Array.from({ length: newAula.duration.hours + 1 }, (_, i) => i).map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Min</label>
                          <select
                            className="form-select"
                            style={{ width: '70px', padding: '6px', fontSize: '13px' }}
                            value={ml.minutes}
                            onChange={e => updateMicroLesson(i, 'minutes', parseInt(e.target.value) || 0)}
                          >
                            {Array.from({ length: 60 }, (_, i) => i).map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Seg</label>
                          <select
                            className="form-select"
                            style={{ width: '70px', padding: '6px', fontSize: '13px' }}
                            value={ml.seconds}
                            onChange={e => updateMicroLesson(i, 'seconds', parseInt(e.target.value) || 0)}
                          >
                            {Array.from({ length: 60 }, (_, i) => i).map(s => (
                              <option key={s} value={s}>{s.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input className="form-input" placeholder="Título do ponto" value={ml.titulo} onChange={e => updateMicroLesson(i, 'titulo', e.target.value)} />
                        </div>
                        <button className="btn-secondary" style={{ padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => removeMicroLesson(i)}><i className="icon-x icon-sm" /></button>
                      </div>
                    ))}
                    <button className="btn-secondary" style={{ width: '100%' }} onClick={addMicroLesson}>+ Adicionar Ponto</button>
                  </div>
                )}
              </div>
              <div>
                {newAula.tipo === 'video' && (
                  <div className="form-field">
                    <label className="form-label">Prévia do Vídeo</label>
                    <VideoPreview url={newAula.url} onDurationChange={(duration) => {
                      const hours = Math.floor(duration / 3600)
                      const minutes = Math.floor((duration % 3600) / 60)
                      const seconds = Math.floor(duration % 60)
                      setNewAula({ ...newAula, duration: { hours, minutes, seconds } })
                    }} />
                  </div>
                )}
                {newAula.tipo === 'pdf' && (
                  <div className="form-field">
                    <label className="form-label">Prévia do PDF</label>
                    <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px', border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius)' }}>
                      A prévia do PDF será exibida aqui
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleCreateAula}>Criar</button>
              <button className="btn-secondary" onClick={() => setShowAulaModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Aula */}
      {editingAula && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '900px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Aula</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={editingAula.titulo} onChange={e => setEditingAula({ ...editingAula, titulo: e.target.value })} /></div>
                <div className="form-field">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={editingAula.tipo} onChange={e => setEditingAula({ ...editingAula, tipo: e.target.value as 'video' | 'pdf' })}>
                    <option value="video"><i className="icon-video icon-sm" /> Vídeo (YouTube)</option>
                    <option value="pdf"><i className="icon-file-text icon-sm" /> PDF</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">URL</label>
                  <input className="form-input" value={editingAula.url} onChange={e => setEditingAula({ ...editingAula, url: e.target.value })} />
                </div>
                {editingAula.tipo === 'video' && (
                  <div className="form-field">
                    <label className="form-label">Micro-Leções (pontos de separação)</label>
                    {(editingAula.microLessons || []).map((ml: MicroLesson, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Hora</label>
                          <select
                            className="form-select"
                            style={{ width: '70px', padding: '6px', fontSize: '13px' }}
                            value={ml.hours || 0}
                            onChange={e => {
                              const updated = [...(editingAula.microLessons || [])]
                              updated[i] = { ...updated[i], hours: parseInt(e.target.value) || 0 }
                              setEditingAula({ ...editingAula, microLessons: updated })
                            }}
                          >
                            {Array.from({ length: (editingAula.duration?.hours || 0) + 1 }, (_, i) => i).map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Min</label>
                          <select
                            className="form-select"
                            style={{ width: '70px', padding: '6px', fontSize: '13px' }}
                            value={ml.minutes || 0}
                            onChange={e => {
                              const updated = [...(editingAula.microLessons || [])]
                              updated[i] = { ...updated[i], minutes: parseInt(e.target.value) || 0 }
                              setEditingAula({ ...editingAula, microLessons: updated })
                            }}
                          >
                            {Array.from({ length: 60 }, (_, i) => i).map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Seg</label>
                          <select
                            className="form-select"
                            style={{ width: '70px', padding: '6px', fontSize: '13px' }}
                            value={ml.seconds || 0}
                            onChange={e => {
                              const updated = [...(editingAula.microLessons || [])]
                              updated[i] = { ...updated[i], seconds: parseInt(e.target.value) || 0 }
                              setEditingAula({ ...editingAula, microLessons: updated })
                            }}
                          >
                            {Array.from({ length: 60 }, (_, i) => i).map(s => (
                              <option key={s} value={s}>{s.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input className="form-input" placeholder="Título do ponto" value={ml.titulo} onChange={e => {
                            const updated = [...(editingAula.microLessons || [])]
                            updated[i] = { ...updated[i], titulo: e.target.value }
                            setEditingAula({ ...editingAula, microLessons: updated })
                          }} />
                        </div>
                        <button className="btn-secondary" style={{ padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => {
                          setEditingAula({ ...editingAula, microLessons: (editingAula.microLessons || []).filter((_: any, idx: number) => idx !== i) })
                        }}><i className="icon-x icon-sm" /></button>
                      </div>
                    ))}
                    <button className="btn-secondary" style={{ width: '100%' }} onClick={() => {
                      setEditingAula({ ...editingAula, microLessons: [...(editingAula.microLessons || []), { hours: 0, minutes: 0, seconds: 0, titulo: '' }] })
                    }}>+ Adicionar Ponto</button>
                  </div>
                )}
              </div>
              <div>
                {editingAula.tipo === 'video' && (
                  <div className="form-field">
                    <label className="form-label">Prévia do Vídeo</label>
                    <VideoPreview url={editingAula.url} onDurationChange={(duration) => {
                      const hours = Math.floor(duration / 3600)
                      const minutes = Math.floor((duration % 3600) / 60)
                      const seconds = Math.floor(duration % 60)
                      setEditingAula({ ...editingAula, duration: { hours, minutes, seconds } })
                    }} />
                  </div>
                )}
                {editingAula.tipo === 'pdf' && (
                  <div className="form-field">
                    <label className="form-label">Prévia do PDF</label>
                    <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px', border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius)' }}>
                      A prévia do PDF será exibida aqui
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleEditAula}>Salvar</button>
              <button className="btn-secondary" onClick={() => setEditingAula(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
