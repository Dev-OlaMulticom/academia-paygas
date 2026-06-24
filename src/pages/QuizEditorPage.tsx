import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { pluralize } from '../lib/utils'
import { useToast, useConfirm } from '../components/Toast'

interface QuizEditorPageProps {
  user: any
}

export function QuizEditorPage({ user }: QuizEditorPageProps) {
  const { moduloId, aulaId } = useParams<{ moduloId: string; aulaId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const [aula, setAula] = useState<any>(null)
  const [modulo, setModulo] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Quiz settings
  const [quizTitle, setQuizTitle] = useState('')
  const [notaMinima, setNotaMinima] = useState(7)
  const [autoCert, setAutoCert] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)

  // Question form
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [formData, setFormData] = useState({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })
  const [isEditing, setIsEditing] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  const loadData = useCallback(async () => {
    if (!moduloId || !aulaId) return
    try {
      setLoading(true)
      const [mod, al, qz] = await Promise.all([
        api.getModulo(moduloId),
        api.getAula(moduloId, aulaId).catch(() => null),
        api.getQuiz(moduloId, aulaId).catch(() => null),
      ])
      setModulo(mod)
      setAula(al)
      if (qz) {
        setQuiz(qz)
        setQuizTitle(qz.titulo)
        setNotaMinima(qz.notaMinima ?? 7)
        setAutoCert(qz.autoGerarCertificado ?? false)
      }
    } catch {
      toast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }, [moduloId, aulaId, toast])

  useEffect(() => { loadData() }, [loadData])

  // Create quiz
  const handleCreateQuiz = async () => {
    if (!moduloId || !aulaId) return
    if (!quizTitle.trim()) { toast('Título é obrigatório', 'error'); return }
    try {
      setSaving(true)
      const q = await api.createQuiz(moduloId, { aulaId, titulo: quizTitle, autoGerarCertificado: autoCert, notaMinima })
      setQuiz(q)
      setEditingSettings(false)
      toast('Quiz criado!', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao criar quiz', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Update quiz settings
  const handleUpdateSettings = async () => {
    if (!quiz) return
    try {
      setSaving(true)
      const updated = await api.updateQuiz(quiz.id, { titulo: quizTitle, notaMinima, autoGerarCertificado: autoCert })
      setQuiz(updated)
      setEditingSettings(false)
      toast('Configurações salvas', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete quiz
  const handleDeleteQuiz = async () => {
    if (!quiz) return
    const ok = await confirm({ title: 'Excluir quiz', message: 'Excluir este quiz e todas as perguntas?' })
    if (!ok) return
    try {
      await api.deleteQuiz(quiz.id)
      setQuiz(null)
      setQuizTitle(`Quiz: ${aula?.titulo || ''}`)
      setNotaMinima(7)
      setAutoCert(false)
      toast('Quiz excluído', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir', 'error')
    }
  }

  // Add question
  const handleAddQuestion = async () => {
    if (!quiz) return
    if (!formData.pergunta.trim() || !formData.opcaoA.trim() || !formData.opcaoB.trim()) {
      toast('Pergunta e opções A/B são obrigatórias', 'error')
      return
    }
    try {
      setSaving(true)
      await api.addPergunta(quiz.id, formData)
      setFormData({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })
      const updated = await api.getQuiz(moduloId!, aulaId!)
      setQuiz(updated)
      toast('Pergunta adicionada', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao adicionar pergunta', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Edit question
  const handleSelectQuestion = (p: any) => {
    setActiveQuestion(p.id)
    setIsEditing(true)
    setFormData({ pergunta: p.pergunta, opcaoA: p.opcaoA, opcaoB: p.opcaoB, opcaoC: p.opcaoC || '', opcaoD: p.opcaoD || '', correta: p.correta })
  }

  const handleNewQuestion = () => {
    setActiveQuestion(null)
    setIsEditing(false)
    setFormData({ pergunta: '', opcaoA: '', opcaoB: '', opcaoC: '', opcaoD: '', correta: 'A' })
  }

  const handleSaveQuestion = async () => {
    if (!formData.pergunta.trim() || !formData.opcaoA.trim() || !formData.opcaoB.trim()) {
      toast('Pergunta e opções A/B são obrigatórias', 'error')
      return
    }
    try {
      setSaving(true)
      if (activeQuestion) {
        await api.updatePergunta(activeQuestion, formData)
        toast('Pergunta atualizada', 'success')
      } else {
        await api.addPergunta(quiz.id, formData)
        toast('Pergunta adicionada', 'success')
      }
      const updated = await api.getQuiz(moduloId!, aulaId!)
      setQuiz(updated)
      handleNewQuestion()
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar pergunta', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete question
  const handleDeleteQuestion = async (id: string) => {
    const ok = await confirm({ title: 'Excluir pergunta', message: 'Excluir esta pergunta?' })
    if (!ok) return
    try {
      await api.deletePergunta(id)
      if (activeQuestion === id) handleNewQuestion()
      const updated = await api.getQuiz(moduloId!, aulaId!)
      setQuiz(updated)
      toast('Pergunta excluída', 'success')
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir', 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
        Carregando quiz...
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gray-50)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate(-1)}>
          ← Voltar
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {modulo?.titulo || 'Módulo'} → {aula?.titulo || 'Aula'}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--gray-500)' }}>
            {quiz ? `${quiz.perguntas?.length || 0} ${pluralize(quiz.perguntas?.length || 0, 'pergunta')}` : 'Sem quiz ainda'}
          </p>
        </div>
        {quiz && isAdmin && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingSettings(true)}>
              ⚙ Configurações
            </button>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }} onClick={handleDeleteQuiz}>
              🗑 Excluir Quiz
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {editingSettings && (
        <div style={{ flexShrink: 0, padding: '16px 24px', background: '#fffbe6', borderBottom: '1px solid #ffe58f' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Configurações do Quiz</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '700px' }}>
            <div className="form-field">
              <label className="form-label">Título</label>
              <input className="form-input" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Nota Mínima (0-10)</label>
              <input className="form-input" type="number" min="0" max="10" value={notaMinima} onChange={e => setNotaMinima(parseInt(e.target.value) || 7)} />
              {quiz && quiz.perguntas?.length > 0 && (
                <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                  {(() => {
                    const total = quiz.perguntas.length
                    const needed = Math.ceil((notaMinima / 10) * total)
                    return `Acertar ${needed} de ${total} (${notaMinima}/10)`
                  })()}
                </p>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">Certificado Automático</label>
              <select className="form-select" value={autoCert ? 'true' : 'false'} onChange={e => setAutoCert(e.target.value === 'true')}>
                <option value="false">Não</option>
                <option value="true">Sim (ao aprovar)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={quiz ? handleUpdateSettings : handleCreateQuiz} disabled={saving}>
              {saving ? 'Salvando...' : quiz ? 'Salvar' : 'Criar Quiz'}
            </button>
            <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => { setEditingSettings(false); if (!quiz) navigate(-1) }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* No quiz state */}
      {!quiz && !editingSettings && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--gray-700)' }}>Esta aula não possui quiz</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--gray-500)', fontSize: '14px' }}>
              Crie um quiz para avaliar o conhecimento dos alunos nesta aula.
            </p>
            {isAdmin && (
              <button className="btn-primary" onClick={() => { setEditingSettings(true); setQuizTitle(`Quiz: ${aula?.titulo || ''}`) }}>
                Criar Quiz
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Two Columns */}
      {quiz && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: Questions List */}
          <div style={{ width: '40%', minWidth: '280px', borderRight: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                Perguntas ({quiz.perguntas?.length || 0})
              </span>
              {isAdmin && (
                <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={handleNewQuestion}>
                  + Nova
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {!quiz.perguntas?.length ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '13px' }}>
                  Nenhuma pergunta ainda.<br />Clique em "+ Nova" para começar.
                </div>
              ) : (
                quiz.perguntas.map((p: any, i: number) => (
                  <div
                    key={p.id}
                    onClick={() => isAdmin && handleSelectQuestion(p)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      cursor: isAdmin ? 'pointer' : 'default',
                      background: activeQuestion === p.id ? '#eff6ff' : 'transparent',
                      border: activeQuestion === p.id ? '1px solid #bfdbfe' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (activeQuestion !== p.id) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (activeQuestion !== p.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: activeQuestion === p.id ? '#3b82f6' : 'var(--gray-200)', color: activeQuestion === p.id ? '#fff' : 'var(--gray-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gray-800)' }}>
                          {p.pergunta}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--gray-400)' }}>
                          Resp: <b style={{ color: '#16a34a' }}>{p.correta}</b>
                          {p.opcaoC ? ' · 4 opts' : ' · 2 opts'}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteQuestion(p.id) }}
                          style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', padding: '2px', fontSize: '14px' }}
                          title="Excluir"
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-400)'}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Question Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', background: '#fff' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                {activeQuestion ? `Editando Pergunta` : 'Nova Pergunta'}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ maxWidth: '600px' }}>
                <div className="form-field">
                  <label className="form-label">Pergunta *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={formData.pergunta}
                    onChange={e => setFormData({ ...formData, pergunta: e.target.value })}
                    placeholder="Digite a pergunta..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-flex', width: '20px', height: '20px', borderRadius: '4px', background: formData.correta === 'A' ? '#dcfce7' : 'var(--gray-100)', color: formData.correta === 'A' ? '#16a34a' : 'var(--gray-500)', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>A</span>
                      Opção A *
                    </label>
                    <input className="form-input" value={formData.opcaoA} onChange={e => setFormData({ ...formData, opcaoA: e.target.value })} placeholder="Resposta A" />
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-flex', width: '20px', height: '20px', borderRadius: '4px', background: formData.correta === 'B' ? '#dcfce7' : 'var(--gray-100)', color: formData.correta === 'B' ? '#16a34a' : 'var(--gray-500)', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>B</span>
                      Opção B *
                    </label>
                    <input className="form-input" value={formData.opcaoB} onChange={e => setFormData({ ...formData, opcaoB: e.target.value })} placeholder="Resposta B" />
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-flex', width: '20px', height: '20px', borderRadius: '4px', background: formData.correta === 'C' ? '#dcfce7' : 'var(--gray-100)', color: formData.correta === 'C' ? '#16a34a' : 'var(--gray-500)', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>C</span>
                      Opção C
                    </label>
                    <input className="form-input" value={formData.opcaoC} onChange={e => setFormData({ ...formData, opcaoC: e.target.value })} placeholder="Opcional" />
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-flex', width: '20px', height: '20px', borderRadius: '4px', background: formData.correta === 'D' ? '#dcfce7' : 'var(--gray-100)', color: formData.correta === 'D' ? '#16a34a' : 'var(--gray-500)', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>D</span>
                      Opção D
                    </label>
                    <input className="form-input" value={formData.opcaoD} onChange={e => setFormData({ ...formData, opcaoD: e.target.value })} placeholder="Opcional" />
                  </div>
                </div>

                <div className="form-field" style={{ marginTop: '4px' }}>
                  <label className="form-label">Resposta Correta</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['A', 'B', ...(formData.opcaoC ? ['C'] : []), ...(formData.opcaoD ? ['D'] : [])].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, correta: opt })}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '6px',
                          border: formData.correta === opt ? '2px solid #16a34a' : '1px solid var(--gray-200)',
                          background: formData.correta === opt ? '#dcfce7' : '#fff',
                          color: formData.correta === opt ? '#16a34a' : 'var(--gray-600)',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button className="btn-primary" onClick={handleSaveQuestion} disabled={saving} style={{ padding: '8px 20px' }}>
                      {saving ? 'Salvando...' : activeQuestion ? 'Salvar Alterações' : '+ Adicionar Pergunta'}
                    </button>
                    {activeQuestion && (
                      <button className="btn-secondary" onClick={handleNewQuestion} style={{ padding: '8px 20px' }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive: mobile stack */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="flex-direction: column; overflow: hidden"] > div:first-child {
            width: 100% !important;
            min-width: 0 !important;
            border-right: none !important;
            border-bottom: 1px solid var(--gray-200) !important;
            max-height: 40vh;
          }
        }
      `}</style>
    </div>
  )
}
