import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [view, setView] = useState<'modulos' | 'aulas'>('modulos')
  const [selectedModulo, setSelectedModulo] = useState<any>(null)
  const [showAulaModal, setShowAulaModal] = useState(false)
  const [editingMod, setEditingMod] = useState<any>(null)
  const [editingAula, setEditingAula] = useState<any>(null)
  const [newAula, setNewAula] = useState({ titulo: '', tipo: 'video' as 'video' | 'pdf', url: '', microLessons: [] as MicroLesson[], duration: { hours: 0, minutes: 0, seconds: 0 } as VideoDuration })
  const [modulos, setModulos] = useState<any[]>([])
  const [aulas, setAulas] = useState<any[]>([])
  const [gestores, setGestores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuiz, setEditingQuiz] = useState<any>(null)
  const [quizAula, setQuizAula] = useState<any>(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [newPergunta, setNewPergunta] = useState({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => { loadModulos() }, [])
  useEffect(() => { if (selectedModulo) loadAulas(selectedModulo.id) }, [selectedModulo])
  useEffect(() => { loadGestores() }, [])

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

  const loadGestores = async () => {
    try {
      const users = await api.getUsuarios()
      setGestores(users.filter((u: any) => u.role === 'GESTOR'))
    } catch {
      setGestores([])
    }
  }

  const loadAulas = async (moduloId: string) => {
    try {
      const lessons = await api.getAulas(moduloId)
      setAulas(lessons)
    } catch {
      setAulas([])
    }
  }


  const handleEditModulo = async () => {
    if (!editingMod) return
    try {
      await api.updateModulo(editingMod.id, { titulo: editingMod.titulo, descricao: editingMod.descricao, obrigatorio: editingMod.obrigatorio, disponivelParaTodos: editingMod.disponivelParaTodos, disponivelParaGestores: editingMod.disponivelParaGestores, autoCertificado: editingMod.autoCertificado })
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

  const handleOpenQuiz = async (aula: any) => {
    setQuizAula(aula)
    if (aula.quiz) {
      setEditingQuiz(aula.quiz)
    } else {
      setEditingQuiz(null)
    }
    setShowQuizModal(true)
  }

  const handleCreateQuiz = async () => {
    if (!quizAula || !editingQuiz) return
    try {
      await api.createQuiz(selectedModulo.id, {
        aulaId: quizAula.id,
        titulo: editingQuiz.titulo || `Quiz: ${quizAula.titulo}`,
        autoGerarCertificado: editingQuiz.autoGerarCertificado || false,
      })
      alert('Quiz criado com sucesso!')
      loadAulas(selectedModulo.id)
      setShowQuizModal(false)
    } catch (err: any) {
      alert(err.message || 'Erro ao criar quiz')
    }
  }

  const handleAddPergunta = async () => {
    if (!editingQuiz || !newPergunta.pergunta || !newPergunta.opcaoA || !newPergunta.opcaoB) {
      alert('Pergunta e opções A e B são obrigatórias!')
      return
    }
    try {
      await api.addPergunta(editingQuiz.id, newPergunta)
      alert('Pergunta adicionada!')
      setNewPergunta({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })
      // Reload quiz data
      const updatedQuiz = await api.getQuiz(selectedModulo.id, quizAula.id)
      setEditingQuiz(updatedQuiz)
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar pergunta')
    }
  }

  const handleDeletePergunta = async (perguntaId: string) => {
    if (!confirm('Excluir esta pergunta?')) return
    try {
      await api.deletePergunta(perguntaId)
      const updatedQuiz = await api.getQuiz(selectedModulo.id, quizAula.id)
      setEditingQuiz(updatedQuiz)
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir pergunta')
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
          <button className="btn-primary" onClick={() => navigate('/cms/criar-modulo')}>+ Novo Módulo</button>
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
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditingMod({ ...mod, obrigatorio: mod.obrigatorio || false, disponivelParaTodos: mod.disponivelParaTodos !== false, disponivelParaGestores: mod.disponivelParaGestores || [], autoCertificado: mod.autoCertificado || false })}><i className="icon-pencil icon-xs" /> Editar</button>
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
              <tr><th>Título</th><th>Tipo</th><th>URL</th><th>Quiz</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {aulas.length > 0 ? (
                aulas.map((aula) => (
                  <tr key={aula.id}>
                    <td><b>{aula.titulo}</b></td>
                    <td><span className={`track-badge ${aula.tipo === 'video' ? 'badge-new' : 'badge-blue'}`} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{aula.tipo === 'video' ? <><i className="icon-video icon-xs" /> Vídeo</> : <><i className="icon-file-text icon-xs" /> PDF</>}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aula.url}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: aula.quiz ? '#E8F5E9' : undefined, borderColor: aula.quiz ? '#4CAF50' : undefined, color: aula.quiz ? '#2E7D32' : undefined }} onClick={() => handleOpenQuiz(aula)}>
                        <i className="icon-help-circle icon-xs" /> {aula.quiz ? `${aula.quiz.perguntas?.length || 0} perguntas` : 'Criar Quiz'}
                      </button>
                    </td>
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

      {/* Modal Editar Módulo */}
      {editingMod && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Módulo</h3>
            <div className="form-field"><label className="form-label">Título</label><input className="form-input" value={editingMod.titulo} onChange={e => setEditingMod({ ...editingMod, titulo: e.target.value })} /></div>
            <div className="form-field"><label className="form-label">Descrição</label><textarea className="form-input" value={editingMod.descricao || ''} onChange={e => setEditingMod({ ...editingMod, descricao: e.target.value })} /></div>
            <div className="form-field">
              <label className="form-label">Obrigatório</label>
              <select className="form-select" value={editingMod.obrigatorio ? 'true' : 'false'} onChange={e => setEditingMod({ ...editingMod, obrigatorio: e.target.value === 'true' })}>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Gerar Certificado Automaticamente
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <i className="icon-info icon-sm" style={{ color: 'var(--gray-400)', cursor: 'help' }} />
                  <span style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--gray-800)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    opacity: 0,
                    visibility: 'hidden',
                    transition: 'opacity 0.2s, visibility 0.2s',
                    marginBottom: '8px',
                    zIndex: 100
                  }} className="tooltip-content">
                    Ativado: O certificado é gerado automaticamente ao concluir a avaliação
                    <br />
                    Desativado: O gestor do posto deve aprovar antes de gerar o certificado
                  </span>
                </span>
              </label>
              <select className="form-select" value={editingMod.autoCertificado ? 'true' : 'false'} onChange={e => setEditingMod({ ...editingMod, autoCertificado: e.target.value === 'true' })}>
                <option value="false">Não (Requer aprovação do gestor)</option>
                <option value="true">Sim (Automático ao concluir)</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Disponibilidade</label>
              <select className="form-select" value={editingMod.disponivelParaTodos ? 'todos' : 'especificos'} onChange={e => setEditingMod({ ...editingMod, disponivelParaTodos: e.target.value === 'todos', disponivelParaGestores: [] })}>
                <option value="todos">Todos os usuários</option>
                <option value="especificos">Gestores específicos</option>
              </select>
            </div>
            {!editingMod.disponivelParaTodos && (
              <div className="form-field">
                <label className="form-label">Gestores Permitidos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: '8px' }}>
                  {gestores.length > 0 ? (
                    gestores.map((gestor) => (
                      <label key={gestor.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editingMod.disponivelParaGestores?.includes(gestor.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setEditingMod({ ...editingMod, disponivelParaGestores: [...(editingMod.disponivelParaGestores || []), gestor.id] })
                            } else {
                              setEditingMod({ ...editingMod, disponivelParaGestores: (editingMod.disponivelParaGestores || []).filter((id: string) => id !== gestor.id) })
                            }
                          }}
                        />
                        <span>{gestor.nome}</span>
                      </label>
                    ))
                  ) : (
                    <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Nenhum gestor encontrado</span>
                  )}
                </div>
              </div>
            )}
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

      {/* Modal Quiz Management */}
      {showQuizModal && quizAula && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '700px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Quiz: {quizAula.titulo}</h3>

            {!editingQuiz ? (
              <div>
                <p style={{ color: 'var(--gray-500)', marginBottom: '16px' }}>Esta aula não possui um quiz. Deseja criar um?</p>
                <div className="form-field">
                  <label className="form-label">Título do Quiz</label>
                  <input className="form-input" value={`Quiz: ${quizAula.titulo}`} onChange={e => setEditingQuiz({ titulo: e.target.value, autoGerarCertificado: false, perguntas: [] })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Gerar Certificado Automaticamente</label>
                  <select className="form-select" value={editingQuiz?.autoGerarCertificado ? 'true' : 'false'} onChange={e => setEditingQuiz({ ...(editingQuiz || { titulo: `Quiz: ${quizAula.titulo}`, perguntas: [] }), autoGerarCertificado: e.target.value === 'true' })}>
                    <option value="false">Não</option>
                    <option value="true">Sim (ao passar no quiz)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button className="btn-primary" onClick={handleCreateQuiz}>Criar Quiz</button>
                  <button className="btn-secondary" onClick={() => { setShowQuizModal(false); setQuizAula(null); setEditingQuiz(null) }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--gray-500)' }}>{editingQuiz.perguntas?.length || 0} pergunta(s)</span>
                  <span className={`track-badge ${editingQuiz.autoGerarCertificado ? 'badge-done' : 'badge-new'}`}>
                    {editingQuiz.autoGerarCertificado ? 'Certificado Automático' : 'Sem Certificado Auto'}
                  </span>
                </div>

                {/* Existing questions */}
                {editingQuiz.perguntas?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '8px' }}>Perguntas Existentes</h4>
                    {editingQuiz.perguntas.map((p: any, i: number) => (
                      <div key={p.id} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>{i + 1}. {p.pergunta}</p>
                            <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '4px 0 0' }}>
                              A: {p.opcaoA} | B: {p.opcaoB} {p.opcaoC ? `| C: ${p.opcaoC}` : ''} {p.opcaoD ? `| D: ${p.opcaoD}` : ''} | Resposta: <b>{p.correta}</b>
                            </p>
                          </div>
                          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }} onClick={() => handleDeletePergunta(p.id)}>
                            <i className="icon-trash-2 icon-xs" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new question form */}
                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
                  <h4 style={{ marginBottom: '12px' }}>Adicionar Pergunta</h4>
                  <div className="form-field">
                    <label className="form-label">Pergunta</label>
                    <textarea className="form-input" value={newPergunta.pergunta} onChange={e => setNewPergunta({ ...newPergunta, pergunta: e.target.value })} placeholder="Digite a pergunta..." />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-field">
                      <label className="form-label">Opção A *</label>
                      <input className="form-input" value={newPergunta.opcaoA} onChange={e => setNewPergunta({ ...newPergunta, opcaoA: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Opção B *</label>
                      <input className="form-input" value={newPergunta.opcaoB} onChange={e => setNewPergunta({ ...newPergunta, opcaoB: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Opção C</label>
                      <input className="form-input" value={newPergunta.opcaoC} onChange={e => setNewPergunta({ ...newPergunta, opcaoC: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Opção D</label>
                      <input className="form-input" value={newPergunta.opcaoD} onChange={e => setNewPergunta({ ...newPergunta, opcaoD: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Resposta Correta</label>
                    <select className="form-select" value={newPergunta.correta} onChange={e => setNewPergunta({ ...newPergunta, correta: e.target.value })}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      {newPergunta.opcaoC && <option value="C">C</option>}
                      {newPergunta.opcaoD && <option value="D">D</option>}
                    </select>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={handleAddPergunta}>+ Adicionar Pergunta</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
                  <button className="btn-secondary" onClick={() => { setShowQuizModal(false); setQuizAula(null); setEditingQuiz(null) }}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
