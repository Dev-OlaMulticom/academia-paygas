import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { pluralize } from '../lib/utils'
import { VideoPreview } from '../components/VideoPreview'
import { useToast, useConfirm } from '../components/Toast'


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
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [view, setView] = useState<'modulos' | 'aulas'>('modulos')
  const [selectedModulo, setSelectedModulo] = useState<any>(null)
  const [showAulaModal, setShowAulaModal] = useState(false)
  const [editingMod, setEditingMod] = useState<any>(null)
  const [editingAula, setEditingAula] = useState<any>(null)
  const [newAula, setNewAula] = useState({ titulo: '', tipo: 'VIDEO' as 'VIDEO' | 'PDF', videoUrl: '', pdfUrl: '', obrigatorio: false, microLessons: [] as MicroLesson[], duration: { hours: 0, minutes: 0, seconds: 0 } as VideoDuration })
  const [modulos, setModulos] = useState<any[]>([])
  const [aulas, setAulas] = useState<any[]>([])
  const [gestores, setGestores] = useState<any[]>([])
  const [editingQuiz, setEditingQuiz] = useState<any>(null)
  const [quizAula, setQuizAula] = useState<any>(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [newPergunta, setNewPergunta] = useState({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })

  const isAdmin = user?.role === 'ADMIN'

  const loadModulos = async () => {
    try {
      const mods = await api.getCmsModulos()
      setModulos(mods)
    } catch {
      setModulos([])
    }
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

  useEffect(() => { loadModulos() }, [])
  useEffect(() => { if (selectedModulo) loadAulas(selectedModulo.id) }, [selectedModulo])
  useEffect(() => { loadGestores() }, [])


  const handleEditModulo = async () => {
    if (!editingMod) return
    try {
      await api.updateModulo(editingMod.id, { titulo: editingMod.titulo, descricao: editingMod.descricao, obrigatorio: editingMod.obrigatorio, autoCertificado: editingMod.autoCertificado })
      toast('Curso atualizado!', 'success')
      setEditingMod(null)
      loadModulos()
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar', 'error')
    }
  }

  const handleDeleteModulo = async (id: string) => {
    const mod = modulos.find(m => m.id === id)
    const aulaCount = mod?._count?.aulas || 0

    let message = `Deseja excluir o curso "${mod?.titulo}"?`
    if (aulaCount > 0) {
      message += `\n\nEste curso contém ${aulaCount} aula(s).`
      try {
        let totalLicoes = 0
        for (const aula of (mod.aulas || [])) {
          const licoes = await api.getLicoes(aula.id).catch(() => [])
          totalLicoes += licoes.length
        }
        if (totalLicoes > 0) {
          message += `\n${totalLicoes} ${pluralize(totalLicoes, 'lição')} ${totalLicoes === 1 ? 'será removida' : 'serão removidas'} também.`
        }
      } catch {}
      message += `\n\nEsta ação não pode ser desfeita.`
    }

    const ok = await confirm({
      title: 'Excluir Curso',
      message,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return

    try {
      await api.deleteModulo(id)
      toast('Curso excluído!', 'success')
      loadModulos()
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir', 'error')
    }
  }

  const handleCreateAula = async () => {
    if (!newAula.titulo) {
      toast('Título é obrigatório!', 'info')
      return
    }
    if (newAula.tipo === 'VIDEO' && !newAula.videoUrl) {
      toast('URL do vídeo é obrigatória!', 'info')
      return
    }
    if (newAula.tipo === 'PDF' && !newAula.pdfUrl) {
      toast('URL do PDF é obrigatória!', 'info')
      return
    }
    try {
      const payload: any = {
        titulo: newAula.titulo,
        tipo: newAula.tipo,
        obrigatorio: newAula.obrigatorio,
        videoInicio: 0,
        videoFim: 0,
      }
      if (newAula.tipo === 'VIDEO') {
        payload.videoUrl = newAula.videoUrl
      } else {
        payload.pdfUrl = newAula.pdfUrl
      }
      await api.createAula(selectedModulo.id, payload)
      toast('Aula criada com sucesso!', 'success')
      setShowAulaModal(false)
      setNewAula({ titulo: '', tipo: 'VIDEO', videoUrl: '', pdfUrl: '', obrigatorio: false, microLessons: [], duration: { hours: 0, minutes: 0, seconds: 0 } })
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao criar aula', 'error')
    }
  }

  const handleEditAula = async () => {
    if (!editingAula) return
    try {
      await api.updateAula(editingAula.id, editingAula)
      toast('Aula atualizada!', 'success')
      setEditingAula(null)
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar', 'error')
    }
  }

  const handleDeleteAula = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir aula',
      message: 'Tem certeza?',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      await api.deleteAula(id)
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir', 'error')
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
      toast('Quiz criado com sucesso!', 'success')
      loadAulas(selectedModulo.id)
      setShowQuizModal(false)
    } catch (err: any) {
      toast(err.message || 'Erro ao criar quiz', 'error')
    }
  }

  const handleAddPergunta = async () => {
    if (!editingQuiz || !newPergunta.pergunta || !newPergunta.opcaoA || !newPergunta.opcaoB) {
      toast('Pergunta e opções A e B são obrigatórias!', 'info')
      return
    }
    try {
      await api.addPergunta(editingQuiz.id, newPergunta)
      toast('Pergunta adicionada!', 'success')
      setNewPergunta({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })
      const updatedQuiz = await api.getQuiz(selectedModulo.id, quizAula.id)
      setEditingQuiz(updatedQuiz)
      if (selectedModulo) loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao adicionar pergunta', 'error')
    }
  }

  const handleDeletePergunta = async (perguntaId: string) => {
    const ok = await confirm({
      title: 'Excluir pergunta',
      message: 'Tem certeza?',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      await api.deletePergunta(perguntaId)
      const updatedQuiz = await api.getQuiz(selectedModulo.id, quizAula.id)
      setEditingQuiz(updatedQuiz)
      if (selectedModulo) loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir pergunta', 'error')
    }
  }

  const getMaxTime = (totalDuration: { hours: number; minutes: number; seconds: number }, selectedHour: number) => {
    const totalSec = totalDuration.hours * 3600 + totalDuration.minutes * 60 + totalDuration.seconds
    if (totalSec === 0) return { maxMinutes: 59, maxSeconds: 59 }
    const hourStart = selectedHour * 3600
    const remaining = Math.max(0, totalSec - hourStart)
    const maxMin = Math.floor(remaining / 60)
    const maxSec = remaining - maxMin * 60
    return { maxMinutes: maxMin, maxSeconds: maxSec }
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
            {view === 'modulos' ? 'Gerencie seus cursos' : selectedModulo?.titulo || 'Aulas'}
          </div>
        </div>
        {view === 'modulos' ? (
          isAdmin && <button className="btn-primary" onClick={() => navigate('/cms/criar-modulo')}>+ Novo Curso</button>
        ) : (
          <>
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setView('modulos')}><i className="icon-arrow-left icon-sm" /> Voltar aos Cursos</button>
            {isAdmin && <button className="btn-primary" onClick={() => setShowAulaModal(true)}>+ Nova Aula</button>}
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
                    <td>{mod._count?.aulas || 0} {pluralize(mod._count?.aulas || 0, 'aula')}</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => { setSelectedModulo(mod); setView('aulas') }}><i className="icon-book-open icon-xs" /> Aulas</button>
                      {                       isAdmin && <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditingMod({ ...mod, obrigatorio: mod.obrigatorio || false, autoCertificado: mod.autoCertificado || false })}><i className="icon-pencil icon-xs" /> Editar</button>}
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
                    <td><span className={`track-badge ${aula.tipo === 'VIDEO' ? 'badge-new' : 'badge-blue'}`} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{aula.tipo === 'VIDEO' ? <><i className="icon-video icon-xs" /> Vídeo</> : <><i className="icon-file-text icon-xs" /> PDF</>}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aula.videoUrl || aula.pdfUrl || '—'}</td>
                    <td>
                      {isAdmin && (
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: aula.quiz ? '#E8F5E9' : undefined, borderColor: aula.quiz ? '#4CAF50' : undefined, color: aula.quiz ? '#2E7D32' : undefined }} onClick={() => handleOpenQuiz(aula)}>
                          <i className="icon-help-circle icon-xs" /> {aula.quiz ? `${aula.quiz.perguntas?.length || 0} ${pluralize(aula.quiz.perguntas?.length || 0, 'pergunta')}` : 'Criar Quiz'}
                        </button>
                      )}
                      {!isAdmin && aula.quiz && (
                        <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                          {aula.quiz.perguntas?.length || 0} {pluralize(aula.quiz.perguntas?.length || 0, 'pergunta')}
                        </span>
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      {isAdmin && <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditingAula({ ...aula })}><i className="icon-pencil icon-xs" /> Editar</button>}
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

      {/* Modal Editar Curso */}
      {editingMod && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Curso</h3>
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
                  <select className="form-select" value={newAula.tipo} onChange={e => setNewAula({ ...newAula, tipo: e.target.value as 'VIDEO' | 'PDF' })}>
                    <option value="VIDEO"><i className="icon-video icon-sm" /> Vídeo (YouTube)</option>
                    <option value="PDF"><i className="icon-file-text icon-sm" /> PDF</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">{newAula.tipo === 'VIDEO' ? 'URL do Vídeo (YouTube)' : 'URL do PDF'}</label>
                  <input className="form-input" value={newAula.tipo === 'VIDEO' ? newAula.videoUrl : newAula.pdfUrl} onChange={e => {
                    if (newAula.tipo === 'VIDEO') setNewAula({ ...newAula, videoUrl: e.target.value })
                    else setNewAula({ ...newAula, pdfUrl: e.target.value })
                  }} placeholder={newAula.tipo === 'VIDEO' ? 'https://www.youtube.com/watch?v=...' : 'https://.../documento.pdf'} />
                </div>
                <div className="form-field">
                  <label className="form-label">Obrigatório (bloquear próxima aula até concluir)</label>
                  <select className="form-select" value={newAula.obrigatorio ? 'true' : 'false'} onChange={e => setNewAula({ ...newAula, obrigatorio: e.target.value === 'true' })}>
                    <option value="false">Não</option>
                    <option value="true">Sim — Usuário deve concluir antes de avançar</option>
                  </select>
                </div>
                {newAula.tipo === 'VIDEO' && (
                  <div className="form-field">
                    <label className="form-label">Micro-Leções (pontos de separação)</label>
                    {newAula.microLessons.map((ml, i) => {
                      const { maxMinutes, maxSeconds } = getMaxTime(newAula.duration, ml.hours)
                      return (
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
                            {Array.from({ length: maxMinutes + 1 }, (_, i) => i).map(m => (
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
                            {Array.from({ length: (ml.minutes < maxMinutes ? 60 : maxSeconds) + 1 }, (_, i) => i).map(s => (
                              <option key={s} value={s}>{s.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input className="form-input" placeholder="Título do ponto" value={ml.titulo} onChange={e => updateMicroLesson(i, 'titulo', e.target.value)} />
                        </div>
                        <button className="btn-secondary" style={{ padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => removeMicroLesson(i)}><i className="icon-x icon-sm" /></button>
                      </div>
                      )
                    })}
                    <button className="btn-secondary" style={{ width: '100%' }} onClick={addMicroLesson}>+ Adicionar Ponto</button>
                  </div>
                )}
              </div>
              <div>
                {newAula.tipo === 'VIDEO' && (
                  <div className="form-field">
                    <label className="form-label">Prévia do Vídeo</label>
                    <VideoPreview url={newAula.videoUrl} onDurationChange={(duration) => {
                      const hours = Math.floor(duration / 3600)
                      const minutes = Math.floor((duration % 3600) / 60)
                      const seconds = Math.floor(duration % 60)
                      setNewAula({ ...newAula, duration: { hours, minutes, seconds } })
                    }} />
                  </div>
                )}
                {newAula.tipo === 'PDF' && (
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
                  <select className="form-select" value={editingAula.tipo} onChange={e => setEditingAula({ ...editingAula, tipo: e.target.value as 'VIDEO' | 'PDF' })}>
                    <option value="VIDEO"><i className="icon-video icon-sm" /> Vídeo (YouTube)</option>
                    <option value="PDF"><i className="icon-file-text icon-sm" /> PDF</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">{editingAula.tipo === 'VIDEO' ? 'URL do Vídeo' : 'URL do PDF'}</label>
                  <input className="form-input" value={editingAula.tipo === 'VIDEO' ? editingAula.videoUrl || '' : editingAula.pdfUrl || ''} onChange={e => {
                    if (editingAula.tipo === 'VIDEO') setEditingAula({ ...editingAula, videoUrl: e.target.value })
                    else setEditingAula({ ...editingAula, pdfUrl: e.target.value })
                  }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Obrigatório</label>
                  <select className="form-select" value={editingAula.obrigatorio ? 'true' : 'false'} onChange={e => setEditingAula({ ...editingAula, obrigatorio: e.target.value === 'true' })}>
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </div>
                {editingAula.tipo === 'VIDEO' && (
                  <div className="form-field">
                    <label className="form-label">Micro-Leções (pontos de separação)</label>
                    {(editingAula.microLessons || []).map((ml: MicroLesson, i: number) => {
                      const dur = editingAula.duration || { hours: 0, minutes: 0, seconds: 0 }
                      const { maxMinutes, maxSeconds } = getMaxTime(dur, ml.hours || 0)
                      return (
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
                            {Array.from({ length: dur.hours + 1 }, (_, i) => i).map(h => (
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
                            {Array.from({ length: maxMinutes + 1 }, (_, i) => i).map(m => (
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
                            {Array.from({ length: ((ml.minutes || 0) < maxMinutes ? 60 : maxSeconds) + 1 }, (_, i) => i).map(s => (
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
                      )
                    })}
                    <button className="btn-secondary" style={{ width: '100%' }} onClick={() => {
                      setEditingAula({ ...editingAula, microLessons: [...(editingAula.microLessons || []), { hours: 0, minutes: 0, seconds: 0, titulo: '' }] })
                    }}>+ Adicionar Ponto</button>
                  </div>
                )}
              </div>
              <div>
                {editingAula.tipo === 'VIDEO' && (
                  <div className="form-field">
                    <label className="form-label">Prévia do Vídeo</label>
                    <VideoPreview url={editingAula.videoUrl || ''} onDurationChange={(duration) => {
                      const hours = Math.floor(duration / 3600)
                      const minutes = Math.floor((duration % 3600) / 60)
                      const seconds = Math.floor(duration % 60)
                      setEditingAula({ ...editingAula, duration: { hours, minutes, seconds } })
                    }} />
                  </div>
                )}
                {editingAula.tipo === 'PDF' && (
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
                  <span style={{ color: 'var(--gray-500)' }}>{editingQuiz.perguntas?.length || 0} {pluralize(editingQuiz.perguntas?.length || 0, 'pergunta')}</span>
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
                          {isAdmin && (
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }} onClick={() => handleDeletePergunta(p.id)}>
                              <i className="icon-trash-2 icon-xs" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new question form */}
                {isAdmin && (
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
                )}

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
