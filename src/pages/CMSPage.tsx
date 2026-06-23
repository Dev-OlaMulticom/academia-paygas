import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { pluralize } from '../lib/utils'
import { VideoPreview } from '../components/VideoPreview'
import { PDFViewer } from '../components/PDFViewer'
import { useToast, useConfirm } from '../components/Toast'

const EMOJI_OPTIONS = ['📚', '🎓', '💪', '⭐', '🏆', '🎯', '🔥', '✅', '📖', '💡', '🚀', '🤝', '🛡️', '⛽', '🧑‍💼', '🔧', '📋', '🔑', '🏆', '🌟']


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
  const [newQuizData, setNewQuizData] = useState({ titulo: '', autoGerarCertificado: false, notaMinima: 7 })
  const [showImportExport, setShowImportExport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editingQuizMeta, setEditingQuizMeta] = useState(false)
  const [editingPerguntaId, setEditingPerguntaId] = useState<string | null>(null)
  const [editPerguntaData, setEditPerguntaData] = useState({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })

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
      await api.updateModulo(editingMod.id, { titulo: editingMod.titulo, descricao: editingMod.descricao, obrigatorio: editingMod.obrigatorio, autoCertificado: editingMod.autoCertificado, icone: editingMod.icone, certificadoTemplate: editingMod.certificadoTemplate })
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
      const created: any = await api.createAula(selectedModulo.id, payload)
      if (created?.id && newAula.microLessons?.length > 0) {
        let licaoErrors = 0
        for (const ml of newAula.microLessons) {
          const inicioSeg = (ml.hours || 0) * 3600 + (ml.minutes || 0) * 60 + (ml.seconds || 0)
          await api.createLicao(created.id, { titulo: ml.titulo || 'Sem titulo', tipo: 'VIDEO', conteudo: newAula.videoUrl || null, inicioSeg }).catch(() => { licaoErrors++ })
        }
        if (licaoErrors > 0) {
          toast(`Aula criada, mas ${licaoErrors} lição(ões) falhou ao salvar`, 'info')
        }
      }
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
      const microLessons = editingAula.microLessons || []
      const existing = (editingAula.licoes || []) as any[]
      const existingIds = new Set(existing.map((l: any) => l.id))
      const incomingIds = new Set(microLessons.filter((m: any) => m.id).map((m: any) => m.id))
      for (const lid of existingIds) {
        if (!incomingIds.has(lid)) {
          await api.deleteLicao(lid).catch(() => {})
        }
      }
      let licaoErrors = 0
      for (const ml of microLessons) {
        const inicioSeg = (ml.hours || 0) * 3600 + (ml.minutes || 0) * 60 + (ml.seconds || 0)
        const payload = { titulo: ml.titulo || 'Sem titulo', tipo: 'VIDEO', conteudo: editingAula.videoUrl || null, inicioSeg }
        if (ml.id) {
          await api.updateLicao(ml.id, payload).catch(() => {})
        } else {
          await api.createLicao(editingAula.id, payload).catch(() => { licaoErrors++ })
        }
      }
      if (licaoErrors > 0) {
        toast(`Aula atualizada, mas ${licaoErrors} lição(ões) falhou ao salvar`, 'info')
      } else {
        toast('Aula atualizada!', 'success')
      }
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
      setNewQuizData({ titulo: `Quiz: ${aula.titulo}`, autoGerarCertificado: false, notaMinima: 7 })
    }
    setShowQuizModal(true)
  }

  const handleCreateQuiz = async () => {
    if (!quizAula) return
    try {
      const created = await api.createQuiz(selectedModulo.id, {
        aulaId: quizAula.id,
        titulo: newQuizData.titulo || `Quiz: ${quizAula.titulo}`,
        autoGerarCertificado: newQuizData.autoGerarCertificado,
        notaMinima: newQuizData.notaMinima,
      })
      setEditingQuiz({ ...created, perguntas: [] })
      toast('Quiz criado com sucesso!', 'success')
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao criar quiz', 'error')
    }
  }

  const handleAddPergunta = async () => {
    if (!editingQuiz || !editingQuiz.id) {
      toast('Salve o quiz primeiro antes de adicionar perguntas!', 'info')
      return
    }
    if (!newPergunta.pergunta || !newPergunta.opcaoA || !newPergunta.opcaoB) {
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

  const handleUpdateQuizMeta = async () => {
    if (!editingQuiz) return
    try {
      const updated = await api.updateQuiz(editingQuiz.id, {
        titulo: editingQuiz.titulo,
        autoGerarCertificado: editingQuiz.autoGerarCertificado,
        notaMinima: editingQuiz.notaMinima,
      })
      setEditingQuiz(updated)
      setEditingQuizMeta(false)
      toast('Quiz atualizado!', 'success')
      loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar quiz', 'error')
    }
  }

  const handleDeleteQuiz = async () => {
    if (!editingQuiz) return
    const ok = await confirm({
      title: 'Excluir Quiz',
      message: `Tem certeza que deseja excluir o quiz "${editingQuiz.titulo}" e todas as suas perguntas?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      await api.deleteQuiz(editingQuiz.id)
      toast('Quiz excluído!', 'success')
      setEditingQuiz(null)
      setEditingQuizMeta(false)
      setShowQuizModal(false)
      setQuizAula(null)
      if (selectedModulo) loadAulas(selectedModulo.id)
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir quiz', 'error')
    }
  }

  const handleStartEditPergunta = (p: any) => {
    setEditingPerguntaId(p.id)
    setEditPerguntaData({ pergunta: p.pergunta, opcaoA: p.opcaoA, opcaoB: p.opcaoB, opcaoC: p.opcaoC || '', opcaoD: p.opcaoD || '', correta: p.correta })
  }

  const handleSaveEditPergunta = async () => {
    if (!editingPerguntaId) return
    try {
      await api.updatePergunta(editingPerguntaId, editPerguntaData)
      const updatedQuiz = await api.getQuiz(selectedModulo.id, quizAula.id)
      setEditingQuiz(updatedQuiz)
      setEditingPerguntaId(null)
      toast('Pergunta atualizada!', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar pergunta', 'error')
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

  const handleExport = async (type: 'cursos' | 'aulas' | 'licoes' | 'quiz') => {
    try {
      await api.downloadCsv(type)
      toast(`Exportação de ${type} concluída!`, 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao exportar', 'error')
    }
  }

  const handleImport = async (type: 'cursos' | 'aulas' | 'licoes' | 'quiz') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        const result = await api.importCsv(type, text)
        toast(`Importação concluída: ${result.created} criados, ${result.skipped} ignorados de ${result.total}`, 'success')
        if (type === 'cursos') loadModulos()
        else if (type === 'aulas' && selectedModulo) loadAulas(selectedModulo.id)
      } catch (err: any) {
        toast(err.message || 'Erro ao importar', 'error')
      } finally {
        setImporting(false)
      }
    }
    input.click()
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
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && <button id="btn-import-export-toggle" className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => setShowImportExport(!showImportExport)}><i className="icon-download icon-xs" /> Importar/Exportar</button>}
            {isAdmin && <button id="btn-novo-curso" className="btn-primary" onClick={() => navigate('/cms/criar-modulo')}>+ Novo Curso</button>}
          </div>
        ) : (
          <>
            <button id="btn-voltar-cursos" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setView('modulos')}><i className="icon-arrow-left icon-sm" /> Voltar aos Cursos</button>
            {isAdmin && <button id="btn-nova-aula" className="btn-primary" onClick={() => setShowAulaModal(true)}>+ Nova Aula</button>}
          </>
        )}
      </div>

      {showImportExport && view === 'modulos' && (
        <div style={{ background: '#f8f9fa', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>Importar / Exportar Dados</h4>
            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setShowImportExport(false)}>Fechar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {(['cursos', 'aulas', 'licoes', 'quiz'] as const).map(type => (
              <div key={type} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'capitalize' }}>{type}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button className="btn-secondary" style={{ fontSize: '11px' }} onClick={() => handleExport(type)} disabled={importing}>
                    <i className="icon-download icon-xs" /> Exportar CSV
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '11px' }} onClick={() => handleImport(type)} disabled={importing}>
                    <i className="icon-upload icon-xs" /> Importar CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', padding: '10px', background: '#e8f4fd', borderRadius: '6px', fontSize: '12px', color: '#1a5276' }}>
            <b>Formato dos arquivos CSV:</b> Use o botão "Exportar CSV" para baixar o formato correto. Ao importar, registros duplicados (mesmo título) são ignorados automaticamente.
          </div>
        </div>
      )}

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
                    <td><b>{mod.icone || '📚'} {mod.titulo}</b></td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '13px' }}>{mod.descricao || '—'}</td>
                    <td>{mod._count?.aulas || 0} {pluralize(mod._count?.aulas || 0, 'aula')}</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button id={`btn-mod-aulas-${mod.id}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => { setSelectedModulo(mod); setView('aulas') }}><i className="icon-book-open icon-xs" /> Aulas</button>
                      {                       isAdmin && <button id={`btn-mod-editar-${mod.id}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditingMod({ ...mod, obrigatorio: mod.obrigatorio || false, autoCertificado: mod.autoCertificado || false })}><i className="icon-pencil icon-xs" /> Editar</button>}
                      {isAdmin && <button id={`btn-mod-excluir-${mod.id}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDeleteModulo(mod.id)}><i className="icon-trash-2 icon-xs" /></button>}
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
                        <button id={`btn-aula-quiz-${aula.id}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: aula.quiz ? '#E8F5E9' : undefined, borderColor: aula.quiz ? '#4CAF50' : undefined, color: aula.quiz ? '#2E7D32' : undefined }} onClick={() => handleOpenQuiz(aula)}>
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
                      {isAdmin && <button id={`btn-aula-editar-${aula.id}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => {
                        const licoes = (aula.licoes || []).map((l: any) => ({
                          id: l.id,
                          titulo: l.titulo || '',
                          hours: Math.floor((l.inicioSeg || 0) / 3600),
                          minutes: Math.floor(((l.inicioSeg || 0) % 3600) / 60),
                          seconds: (l.inicioSeg || 0) % 60,
                        }))
                        setEditingAula({ ...aula, microLessons: licoes })
                      }}><i className="icon-pencil icon-xs" /> Editar</button>}
                      {isAdmin && <button id={`btn-aula-excluir-${aula.id}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDeleteAula(aula.id)}><i className="icon-trash-2 icon-xs" /></button>}
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
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '700px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Curso</h3>
            <div className="form-field"><label className="form-label">Título</label><input id="mod-edit-titulo" className="form-input" value={editingMod.titulo} onChange={e => setEditingMod({ ...editingMod, titulo: e.target.value })} /></div>
            <div className="form-field">
              <label className="form-label">Ícone / Emoji</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button id="mod-edit-icone-btn" type="button" className="btn-secondary" style={{ fontSize: '24px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditingMod({ ...editingMod, _showEmoji: !editingMod._showEmoji })}>
                  {editingMod.icone || '📚'}
                </button>
                {editingMod._showEmoji && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '8px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                    {EMOJI_OPTIONS.map(em => (
                      <button key={em} type="button" style={{ fontSize: '20px', background: editingMod.icone === em ? '#e3f2fd' : 'transparent', border: editingMod.icone === em ? '2px solid #1976d2' : '2px solid transparent', borderRadius: '6px', cursor: 'pointer', padding: '4px' }} onClick={() => setEditingMod({ ...editingMod, icone: em, _showEmoji: false })}>
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-field"><label className="form-label">Descrição</label><textarea id="mod-edit-descricao" className="form-input" value={editingMod.descricao || ''} onChange={e => setEditingMod({ ...editingMod, descricao: e.target.value })} /></div>
            <div className="form-field">
              <label className="form-label">Obrigatório</label>
              <select id="mod-edit-obrigatorio" className="form-select" value={editingMod.obrigatorio ? 'true' : 'false'} onChange={e => setEditingMod({ ...editingMod, obrigatorio: e.target.value === 'true' })}>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Gerar Certificado Automaticamente</label>
              <select id="mod-edit-autoCert" className="form-select" value={editingMod.autoCertificado ? 'true' : 'false'} onChange={e => setEditingMod({ ...editingMod, autoCertificado: e.target.value === 'true' })}>
                <option value="false">Não (Requer aprovação do gestor)</option>
                <option value="true">Sim (Automático ao concluir)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button id="mod-edit-salvar" className="btn-primary" onClick={handleEditModulo}>Salvar</button>
              <button id="mod-edit-cancelar" className="btn-secondary" onClick={() => setEditingMod(null)}>Cancelar</button>
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
                    {newAula.pdfUrl ? (
                      <PDFViewer url={newAula.pdfUrl} />
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px', border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius)' }}>
                        Insira a URL do PDF para visualizar a prévia
                      </div>
                    )}
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
                    {editingAula.pdfUrl ? (
                      <PDFViewer url={editingAula.pdfUrl} />
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px', border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius)' }}>
                        Insira a URL do PDF para visualizar a prévia
                      </div>
                    )}
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
                  <input id="quiz-titulo" className="form-input" value={newQuizData.titulo} onChange={e => setNewQuizData({ ...newQuizData, titulo: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Gerar Certificado Automaticamente</label>
                  <select id="quiz-cert-auto" className="form-select" value={newQuizData.autoGerarCertificado ? 'true' : 'false'} onChange={e => setNewQuizData({ ...newQuizData, autoGerarCertificado: e.target.value === 'true' })}>
                    <option value="false">Não</option>
                    <option value="true">Sim (ao passar no quiz)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Nota Mínima para Aprovação (0-10)</label>
                  <input id="quiz-nota-minima" className="form-input" type="number" min="0" max="10" value={newQuizData.notaMinima} onChange={e => setNewQuizData({ ...newQuizData, notaMinima: parseInt(e.target.value) || 7 })} />
                  <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Fórmula: nota = (respostas corretas ÷ total de perguntas) × 10.
                    Ex: nota mínima 7 = acertar pelo menos 70% das perguntas.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button id="btn-criar-quiz" className="btn-primary" onClick={handleCreateQuiz}>Criar Quiz</button>
                  <button id="btn-cancelar-quiz" className="btn-secondary" onClick={() => { setShowQuizModal(false); setQuizAula(null); setEditingQuiz(null) }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                {/* Quiz meta info + edit/delete buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--gray-500)' }}>{editingQuiz.perguntas?.length || 0} {pluralize(editingQuiz.perguntas?.length || 0, 'pergunta')}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`track-badge ${editingQuiz.autoGerarCertificado ? 'badge-done' : 'badge-new'}`}>
                      {editingQuiz.autoGerarCertificado ? 'Certificado Automático' : 'Sem Certificado Auto'}
                    </span>
                    {isAdmin && !editingQuizMeta && (
                      <button id="btn-editar-quiz-meta" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setEditingQuizMeta(true)}>
                        <i className="icon-pencil icon-xs" /> Editar Quiz
                      </button>
                    )}
                    {isAdmin && (
                      <button id="btn-excluir-quiz" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }} onClick={handleDeleteQuiz}>
                        <i className="icon-trash-2 icon-xs" /> Excluir
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit quiz metadata */}
                {editingQuizMeta && (
                  <div style={{ background: '#f8f9fa', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                    <h4 style={{ marginBottom: '8px', fontSize: '13px' }}>Editar Configurações do Quiz</h4>
                    <div className="form-field">
                      <label className="form-label">Título</label>
                      <input id="quiz-edit-titulo" className="form-input" value={editingQuiz.titulo} onChange={e => setEditingQuiz({ ...editingQuiz, titulo: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Nota Mínima (0-10)</label>
                      <input id="quiz-edit-nota" className="form-input" type="number" min="0" max="10" value={editingQuiz.notaMinima ?? 7} onChange={e => setEditingQuiz({ ...editingQuiz, notaMinima: parseInt(e.target.value) || 7 })} />
                      <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        {(() => {
                          const total = editingQuiz.perguntas?.length || 0
                          const minima = editingQuiz.notaMinima ?? 7
                          if (total === 0) return `Nota ${minima}/10 = acertar pelo menos ${minima}% das perguntas.`
                          const needed = Math.ceil((minima / 10) * total)
                          return `Com ${total} ${pluralize(total, 'pergunta')}, o aluno precisa acertar pelo menos ${needed} ${pluralize(needed, 'resposta')} (${minima}/10).`
                        })()}
                      </p>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Certificado Automático</label>
                      <select id="quiz-edit-cert" className="form-select" value={editingQuiz.autoGerarCertificado ? 'true' : 'false'} onChange={e => setEditingQuiz({ ...editingQuiz, autoGerarCertificado: e.target.value === 'true' })}>
                        <option value="false">Não</option>
                        <option value="true">Sim</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button id="btn-salvar-quiz-meta" className="btn-primary" style={{ fontSize: '12px' }} onClick={handleUpdateQuizMeta}>Salvar</button>
                      <button id="btn-cancelar-quiz-meta" className="btn-secondary" style={{ fontSize: '12px' }} onClick={() => setEditingQuizMeta(false)}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Existing questions */}
                {editingQuiz.perguntas?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '8px' }}>Perguntas Existentes</h4>
                    {editingQuiz.perguntas.map((p: any, i: number) => (
                      <div key={p.id} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '8px' }}>
                        {editingPerguntaId === p.id ? (
                          <div>
                            <div className="form-field">
                              <label className="form-label">Pergunta</label>
                              <textarea id="edit-pergunta-texto" className="form-input" value={editPerguntaData.pergunta} onChange={e => setEditPerguntaData({ ...editPerguntaData, pergunta: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div className="form-field">
                                <label className="form-label">A *</label>
                                <input id="edit-pergunta-opcao-a" className="form-input" value={editPerguntaData.opcaoA} onChange={e => setEditPerguntaData({ ...editPerguntaData, opcaoA: e.target.value })} />
                              </div>
                              <div className="form-field">
                                <label className="form-label">B *</label>
                                <input id="edit-pergunta-opcao-b" className="form-input" value={editPerguntaData.opcaoB} onChange={e => setEditPerguntaData({ ...editPerguntaData, opcaoB: e.target.value })} />
                              </div>
                              <div className="form-field">
                                <label className="form-label">C</label>
                                <input id="edit-pergunta-opcao-c" className="form-input" value={editPerguntaData.opcaoC} onChange={e => setEditPerguntaData({ ...editPerguntaData, opcaoC: e.target.value })} />
                              </div>
                              <div className="form-field">
                                <label className="form-label">D</label>
                                <input id="edit-pergunta-opcao-d" className="form-input" value={editPerguntaData.opcaoD} onChange={e => setEditPerguntaData({ ...editPerguntaData, opcaoD: e.target.value })} />
                              </div>
                            </div>
                            <div className="form-field">
                              <label className="form-label">Resposta Correta</label>
                              <select id="edit-pergunta-correta" className="form-select" value={editPerguntaData.correta} onChange={e => setEditPerguntaData({ ...editPerguntaData, correta: e.target.value })}>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                {editPerguntaData.opcaoC && <option value="C">C</option>}
                                {editPerguntaData.opcaoD && <option value="D">D</option>}
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button id="btn-salvar-pergunta" className="btn-primary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={handleSaveEditPergunta}>Salvar</button>
                              <button id="btn-cancelar-pergunta" className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setEditingPerguntaId(null)}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>{i + 1}. {p.pergunta}</p>
                              <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '4px 0 0' }}>
                                A: {p.opcaoA} | B: {p.opcaoB} {p.opcaoC ? `| C: ${p.opcaoC}` : ''} {p.opcaoD ? `| D: ${p.opcaoD}` : ''} | Resposta: <b>{p.correta}</b>
                              </p>
                            </div>
                            {isAdmin && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button id={`btn-edit-pergunta-${p.id}`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleStartEditPergunta(p)}>
                                  <i className="icon-pencil icon-xs" />
                                </button>
                                <button id={`btn-delete-pergunta-${p.id}`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }} onClick={() => handleDeletePergunta(p.id)}>
                                  <i className="icon-trash-2 icon-xs" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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
                    <textarea id="pergunta-texto" className="form-input" value={newPergunta.pergunta} onChange={e => setNewPergunta({ ...newPergunta, pergunta: e.target.value })} placeholder="Digite a pergunta..." />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-field">
                      <label className="form-label">Opção A *</label>
                      <input id="pergunta-opcao-a" className="form-input" value={newPergunta.opcaoA} onChange={e => setNewPergunta({ ...newPergunta, opcaoA: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Opção B *</label>
                      <input id="pergunta-opcao-b" className="form-input" value={newPergunta.opcaoB} onChange={e => setNewPergunta({ ...newPergunta, opcaoB: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Opção C</label>
                      <input id="pergunta-opcao-c" className="form-input" value={newPergunta.opcaoC} onChange={e => setNewPergunta({ ...newPergunta, opcaoC: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Opção D</label>
                      <input id="pergunta-opcao-d" className="form-input" value={newPergunta.opcaoD} onChange={e => setNewPergunta({ ...newPergunta, opcaoD: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Resposta Correta</label>
                    <select id="pergunta-correta" className="form-select" value={newPergunta.correta} onChange={e => setNewPergunta({ ...newPergunta, correta: e.target.value })}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      {newPergunta.opcaoC && <option value="C">C</option>}
                      {newPergunta.opcaoD && <option value="D">D</option>}
                    </select>
                  </div>
                  <button id="btn-adicionar-pergunta" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={handleAddPergunta}>+ Adicionar Pergunta</button>
                </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
                  <button id="btn-fechar-quiz" className="btn-secondary" onClick={() => { setShowQuizModal(false); setQuizAula(null); setEditingQuiz(null) }}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
