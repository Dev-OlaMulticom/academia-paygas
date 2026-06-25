import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { pluralize } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import { VideoPlayer } from '../components/VideoPlayer'
import { PDFViewer } from '../components/PDFViewer'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function ModulosPage() {
  const navigate = useNavigate()
  const { moduloNombre } = useParams<{ moduloNombre: string }>()
  const { user } = useAuth()
  const [currentLesson, setCurrentLesson] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [showAllQuizzes, setShowAllQuizzes] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [lessons, setLessons] = useState<any[]>([])
  const [modulo, setModulo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [expandedLicao, setExpandedLicao] = useState<string | null>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [allQuizResults, setAllQuizResults] = useState<Record<string, any>>({})
  const [showConfetti, setShowConfetti] = useState(false)
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, string>>>({})
  const [quizSubmittedMap, setQuizSubmittedMap] = useState<Record<string, boolean>>({})
  const [quizResultMap, setQuizResultMap] = useState<Record<string, any>>({})

  const loadModulo = async () => {
    if (!moduloNombre) return
    try {
      const allMods = await api.getCmsModulos()
      const foundModulo = allMods.find((m: any) => slugify(m.titulo || m.title || '') === moduloNombre)
      if (foundModulo) {
        setModulo(foundModulo)
        const aulasData = await api.getAulas(foundModulo.id)
        setLessons(aulasData)
        api.trackModuleOpen(foundModulo.id).catch(() => {})
      } else {
        setModulo(null)
        setLessons([])
      }
    } catch (err) {
      console.error('Erro ao carregar módulo:', err)
      setLessons([])
    } finally {
      setLoading(false)
    }
  }

  const loadQuizResults = useCallback(async () => {
    if (!modulo) return
    try {
      const results: Record<string, any> = {}
      for (const lesson of lessons) {
        if (lesson.quiz) {
          try {
            const res = await api.getQuizResults(lesson.quiz.id)
            const data = Array.isArray(res) ? res : (res as any)?.data || []
            const myResult = data.find((r: any) => r.userId === user?.id)
            if (myResult) results[lesson.quiz.id] = myResult
          } catch {}
        }
      }
      setAllQuizResults(results)
    } catch {}
  }, [modulo, lessons, user?.id])

  const loadCertificate = useCallback(async () => {
    if (!modulo) return
    try {
      const certs = await api.getCertificates()
      const data = Array.isArray(certs) ? certs : (certs as any)?.data || []
      const myCert = data.find((c: any) => c.moduloId === modulo.id)
      setCertificate(myCert || null)
    } catch {
      setCertificate(null)
    }
  }, [modulo])

  useEffect(() => {
    loadModulo()
  }, [moduloNombre])

  useEffect(() => {
    if (modulo && lessons.length > 0) {
      loadQuizResults()
      loadCertificate()
    }
  }, [modulo, lessons, loadQuizResults, loadCertificate])

  const isLessonCompleted = (lesson: any) => lesson.concluido === true

  const canAdvanceToLesson = (index: number) => {
    if (index === 0) return true
    for (let i = 0; i < index; i++) {
      if (lessons[i].obrigatorio && !isLessonCompleted(lessons[i])) return false
    }
    return true
  }

  const resetLessonState = () => {
    setShowQuiz(false)
    setSelectedAnswers({})
    setQuizSubmitted(false)
    setQuizResult(null)
    setVideoEnded(false)
  }

  const handleConcluir = async () => {
    const lesson = lessons[currentLesson]
    if (!lesson || !modulo) return

    if (lesson.quiz) {
      setShowQuiz(true)
      return
    }

    try {
      await api.updateProgresso(modulo.id, lesson.id, true)
      const updated = [...lessons]
      updated[currentLesson] = { ...updated[currentLesson], concluido: true }
      setLessons(updated)
    } catch {}

    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1)
      resetLessonState()
    }
  }

  const handleAvanzar = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1)
      resetLessonState()
    }
  }

  const handleAnswerQuiz = (questionId: string, answer: string) => {
    if (quizSubmitted) return
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmitQuiz = async () => {
    const lesson = lessons[currentLesson]
    if (!lesson?.quiz) return

    try {
      const result: any = await api.submitQuiz(lesson.quiz.id, selectedAnswers)
      const nota = result.nota || 0
      const total = result.total || lesson.quiz.perguntas.length
      const correct = result.correct || 0
      const passed = result.concluido || nota >= (lesson.quiz?.notaMinima ?? 7)

      setQuizResult({ nota, total, correct, passed })
      setQuizSubmitted(true)

      if (passed) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 4000)

        const updated = [...lessons]
        updated[currentLesson] = { ...updated[currentLesson], concluido: true }
        setLessons(updated)

        loadQuizResults()
        loadCertificate()

        if (lesson.quiz.autoGerarCertificado) {
          setTimeout(() => {
            setShowQuiz(false)
            setShowCertificate(true)
          }, 2500)
        }
      }
    } catch {
      setQuizResult({ nota: 0, total: lesson.quiz.perguntas.length, correct: 0, passed: false })
      setQuizSubmitted(true)
    }
  }

  const handleVideoEnd = () => {
    setVideoEnded(true)
  }

  const allCompleted = lessons.length > 0 && lessons.every((l: any) => isLessonCompleted(l))
  const isLastLesson = currentLesson === lessons.length - 1
  const current = lessons[currentLesson]

  const isAtendente = user?.role === 'ATENDENTE'
  const semGestor = isAtendente && !user?.gestorId

  const quizzesWithLesson = lessons.filter(l => l.quiz)
  const hasCertificate = !!certificate

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando módulo...</div>
        </div>
      </div>
    )
  }

  if (semGestor) {
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate('/modulos')}><i className="icon-arrow-left icon-sm" /> Voltar</button>
            <div className="page-title">Acesso restrito</div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Você precisa ser associado a um Gestor de Posto</p>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>Aguarde a aprovação do seu gestor.</p>
        </div>
      </div>
    )
  }

  if (!modulo) {
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate('/modulos')}><i className="icon-arrow-left icon-sm" /> Voltar</button>
            <div className="page-title">Módulo não encontrado</div>
          </div>
        </div>
      </div>
    )
  }

  const renderCertificateTab = () => {
    if (!hasCertificate) {
      return (
        <div className="empty-state" style={{ padding: '40px' }}>
          <div className="empty-icon">📜</div>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Nenhum certificado disponível</p>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>Complete todas as aulas e aprov nos quizzes para gerar seu certificado.</p>
        </div>
      )
    }

    const template = certificate.moduloCertTemplate || certificate.modulo?.certificadoTemplate
    const titulo = certificate.modulo?.titulo || modulo.titulo
    const icone = certificate.modulo?.icone || modulo.icone || '📚'
    const nome = user?.nome || 'Usuário'

    return (
      <div style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>📜 Seu Certificado</h3>
        <div className="cert-card" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="cert-header">
            <h3>ACADEMIA PAYGAS</h3>
            <h2>{icone} {titulo}</h2>
          </div>
          <div className="cert-body">
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '10px' }}>Certificamos que</p>
            <div className="cert-name">{nome}</div>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '16px' }}>
              concluiu o módulo de <strong>{titulo}</strong> com sucesso.
            </p>
            <div className="cert-footer" style={{ marginTop: '24px' }}>
              <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{new Date().toLocaleDateString('pt-BR')}</span>
              <div className="cert-seal">PG</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn-primary" onClick={() => navigate('/certificados')}>
            <i className="icon-download icon-sm" /> Ver meus certificados
          </button>
        </div>
      </div>
    )
  }

  const handleInlineAnswer = (quizId: string, perguntaId: string, answer: string) => {
    if (quizSubmittedMap[quizId]) return
    setQuizAnswers(prev => ({
      ...prev,
      [quizId]: { ...(prev[quizId] || {}), [perguntaId]: answer }
    }))
  }

  const handleInlineSubmit = async (quiz: any) => {
    const answers = quizAnswers[quiz.id] || {}
    try {
      const result: any = await api.submitQuiz(quiz.id, answers)
      const nota = result.nota || 0
      const total = result.total || quiz.perguntas.length
      const correct = result.correct || 0
      const passed = result.concluido || nota >= (quiz.notaMinima ?? 7)

      setQuizResultMap(prev => ({ ...prev, [quiz.id]: { nota, total, correct, passed } }))
      setQuizSubmittedMap(prev => ({ ...prev, [quiz.id]: true }))

      if (passed) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 4000)
        loadQuizResults()
        loadCertificate()
      }
    } catch {
      setQuizResultMap(prev => ({ ...prev, [quiz.id]: { nota: 0, total: quiz.perguntas.length, correct: 0, passed: false } }))
      setQuizSubmittedMap(prev => ({ ...prev, [quiz.id]: true }))
    }
  }

  const renderAllQuizzes = () => {
    return (
      <div style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>📝 Todos os Quizzes</h3>
        {quizzesWithLesson.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p style={{ color: 'var(--gray-500)' }}>Nenhum quiz disponível neste módulo.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quizzesWithLesson.map((lesson) => {
              const quiz = lesson.quiz
              const result = allQuizResults[quiz.id]
              const passed = result?.concluido
              const isExpanded = expandedQuizId === quiz.id
              const isSubmitted = quizSubmittedMap[quiz.id]
              const inlineResult = quizResultMap[quiz.id]
              const answers = quizAnswers[quiz.id] || {}

              return (
                <div key={quiz.id} style={{
                  border: `1px solid ${passed ? '#4CAF50' : isExpanded ? '#F47C20' : 'var(--gray-200)'}`,
                  borderRadius: '8px',
                  background: passed ? '#F1F8E9' : '#fff',
                  transition: 'all 0.15s',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '16px',
                    cursor: 'pointer',
                  }} onClick={() => setExpandedQuizId(isExpanded ? null : quiz.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>📝 {quiz.titulo}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                          Aula: {lesson.titulo} · {quiz.perguntas?.length || 0} perguntas · Nota mínima: {quiz.notaMinima ?? 7}/10
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {result ? (
                          <span style={{
                            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                            background: passed ? '#DCFCE7' : '#FEE2E2',
                            color: passed ? '#166534' : '#991B1B',
                          }}>
                            {passed ? `✓ ${result.nota}/10` : `✗ ${result.nota}/10`}
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: 'var(--gray-100)', color: 'var(--gray-500)' }}>
                            Não resolvido
                          </span>
                        )}
                        <i className={`icon-chevron-${isExpanded ? 'up' : 'down'} icon-sm`} style={{ color: 'var(--gray-400)' }} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--gray-100)' }}>
                      {inlineResult && (
                        <div className={`quiz-result-banner ${inlineResult.passed ? 'passed' : 'failed'}`} style={{ marginTop: '12px' }}>
                          <div className="quiz-result-header">
                            <span className="quiz-result-icon">{inlineResult.passed ? '🎉' : '❌'}</span>
                            <div>
                              <h3 style={{ margin: 0 }}>{inlineResult.passed ? 'Aprovado!' : 'Reprovado'}</h3>
                              <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.8 }}>
                                Nota: {inlineResult.nota}/10 ({inlineResult.correct}/{inlineResult.total} corretas)
                              </p>
                            </div>
                          </div>
                          {!inlineResult.passed && (
                            <div style={{ marginTop: '8px' }}>
                              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => {
                                setQuizSubmittedMap(prev => ({ ...prev, [quiz.id]: false }))
                                setQuizResultMap(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
                                setQuizAnswers(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
                              }}>
                                Tentar Novamente
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: '12px' }}>
                        {quiz.perguntas?.map((pergunta: any, qIndex: number) => (
                          <div key={qIndex} style={{ marginBottom: '16px', padding: '14px', background: '#f9f9f9', borderRadius: '8px' }}>
                            <p style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>{qIndex + 1}. {pergunta.pergunta}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD].filter(Boolean).map((opt: string, oIndex: number) => {
                                const letter = ['A', 'B', 'C', 'D'][oIndex]
                                const isSelected = answers[pergunta.id] === letter
                                const isCorrect = isSubmitted && letter === pergunta.correta
                                const isWrong = isSubmitted && isSelected && letter !== pergunta.correta
                                return (
                                  <label key={oIndex} className={`quiz-opt ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}>
                                    <input
                                      type="radio"
                                      name={`inline-${quiz.id}-${pergunta.id}`}
                                      checked={isSelected}
                                      onChange={() => handleInlineAnswer(quiz.id, pergunta.id, letter)}
                                      disabled={isSubmitted}
                                    />
                                    <span className="quiz-letter">{letter}</span>
                                    {opt}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        {!isSubmitted ? (
                          <button
                            className="btn-primary"
                            style={{ padding: '8px 20px', fontSize: '13px' }}
                            onClick={() => handleInlineSubmit(quiz)}
                            disabled={Object.keys(answers).length < (quiz.perguntas?.length || 0)}
                          >
                            Enviar Respostas
                          </button>
                        ) : !inlineResult?.passed && (
                          <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }} onClick={() => {
                            setQuizSubmittedMap(prev => ({ ...prev, [quiz.id]: false }))
                            setQuizResultMap(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
                            setQuizAnswers(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
                          }}>
                            Tentar Novamente
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page active">
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              background: ['#F47C20', '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#FFD700'][i % 6],
            }} />
          ))}
          <div className="confetti-message">
            <div className="confetti-emoji">🎉</div>
            <div className="confetti-text">Parabéns!</div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate(-1)}><i className="icon-arrow-left icon-sm" /> Voltar</button>
          <div className="page-title">{modulo.titulo}</div>
          <div className="page-subtitle">{lessons.length} {pluralize(lessons.length, 'aula')}{modulo.autoCertificado ? ' · Certificado automático' : ''}</div>
        </div>
      </div>
      <div className="lesson-layout">
        <div className="lesson-sidebar">
          <div className="lesson-sidebar-header">
            <h3>{modulo.titulo}</h3>
            <p>{lessons.filter(l => isLessonCompleted(l)).length}/{lessons.length} concluídas</p>
          </div>

          {lessons.map((lesson, i) => {
            const completed = isLessonCompleted(lesson)
            const locked = lesson.obrigatorio && !completed && !canAdvanceToLesson(i)
            const canClick = !locked || completed
            const isActive = i === currentLesson && !showAllQuizzes && !showCertificate

            return (
              <div
                key={lesson.id || i}
                className={`lesson-item ${isActive ? 'active' : ''} ${completed ? 'done' : ''}`}
                onClick={() => {
                  if (!canClick) return
                  setShowAllQuizzes(false)
                  setShowCertificate(false)
                  setCurrentLesson(i)
                  resetLessonState()
                }}
                style={!canClick ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <div className="lesson-num">
                  {completed ? <i className="icon-check icon-sm" /> : locked ? <i className="icon-lock icon-sm" /> : i + 1}
                </div>
                <div className="lesson-item-info">
                  <b>{lesson.titulo}</b>
                  <span>
                    {lesson.tipo === 'PDF' ? 'PDF' : lesson.tipo === 'TEXTO' ? 'Texto' : lesson.videoUrl ? 'Vídeo' : 'Conteúdo'}
                    {lesson.licoes && lesson.licoes.length > 0 ? ` · ${lesson.licoes.length} ${pluralize(lesson.licoes.length, 'lição')}` : ''}
                    {!lesson.licoes || lesson.licoes.length === 0 ? (
                      lesson.videoInicio || lesson.videoFim ? ` · ${lesson.videoInicio || 0}s-${lesson.videoFim || 'fim'}s` : ''
                    ) : ''}
                  </span>
                </div>
                {completed && <span className="lesson-check"><i className="icon-check icon-sm" /></span>}
                {locked && !completed && <span style={{ color: 'var(--gray-400)', fontSize: '14px' }}><i className="icon-lock icon-sm" /></span>}
              </div>
            )
          })}

          {allCompleted && (
            <div style={{ padding: '16px', textAlign: 'center', background: '#E8F5E9', borderRadius: '8px', marginTop: '12px' }}>
              <i className="icon-check-circle icon-lg" style={{ color: '#2E7D32' }} />
              <p style={{ color: '#2E7D32', fontWeight: 600, marginTop: '8px' }}>Módulo Concluído!</p>
              {modulo.autoCertificado && (
                <p style={{ color: '#1B5E20', fontSize: '12px', marginTop: '4px' }}>Certificado gerado automaticamente.</p>
              )}
            </div>
          )}

          <div className="lesson-sidebar-extras">
            <div
              className={`sidebar-extra-item ${showAllQuizzes ? 'active' : ''}`}
              onClick={() => {
                setShowAllQuizzes(!showAllQuizzes)
                setShowCertificate(false)
                resetLessonState()
              }}
            >
              <i className="icon-file-text icon-sm" />
              <span>Todos os Quizzes</span>
              <span className="sidebar-extra-badge">{quizzesWithLesson.length}</span>
            </div>
            <div
              className={`sidebar-extra-item ${showCertificate ? 'active' : ''}`}
              onClick={() => {
                setShowCertificate(!showCertificate)
                setShowAllQuizzes(false)
                resetLessonState()
                loadCertificate()
              }}
            >
              <i className="icon-award icon-sm" />
              <span>Meu Certificado</span>
              {hasCertificate && <span className="sidebar-extra-check">✓</span>}
            </div>
          </div>
        </div>

        <div className="lesson-content">
          {showAllQuizzes ? (
            renderAllQuizzes()
          ) : showCertificate ? (
            renderCertificateTab()
          ) : !showQuiz ? (
            <>
              {current?.tipo === 'PDF' && current?.pdfUrl ? (
                <div className="lesson-video">
                  <PDFViewer url={current.pdfUrl} />
                </div>
              ) : current?.videoUrl ? (
                <div className="lesson-video">
                  <VideoPlayer
                    key={`${current.id}-${current.videoInicio}`}
                    url={current.videoUrl}
                    startAt={current.videoInicio || 0}
                    endAt={current.videoFim || undefined}
                    onTimeUpdate={(time) => {
                      if (current.videoFim && time >= current.videoFim) {
                        handleVideoEnd()
                      }
                    }}
                  />
                </div>
              ) : current?.tipo === 'TEXTO' ? (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn"><i className="icon-file-text icon-xl" /></div>
                    <p>Conteúdo de Texto</p>
                    <small style={{ opacity: .5 }}>{current?.titulo}</small>
                  </div>
                </div>
              ) : (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn"><i className="icon-file-text icon-xl" /></div>
                    <p>Conteúdo da Aula</p>
                    <small style={{ opacity: .5 }}>{current?.titulo || 'Material de leitura'}</small>
                  </div>
                </div>
              )}
              <div className="lesson-body">
                <h2>{current?.titulo}</h2>
                <div className="lesson-tags">
                  <span className="lesson-tag">
                    {current?.tipo === 'PDF' ? 'PDF' : current?.videoUrl ? 'Vídeo' : 'Conteúdo'}
                  </span>
                  {current?.licoes && current.licoes.length > 0 && (
                    <span className="lesson-tag">{current.licoes.length} {pluralize(current.licoes.length, 'lição')}</span>
                  )}
                  {current?.videoInicio || current?.videoFim ? (
                    <span className="lesson-tag">⏱ {current.videoInicio || 0}s – {current.videoFim || 'fim'}s</span>
                  ) : null}
                  {current?.concluido && <span className="lesson-tag" style={{ background: '#E8F5E9', color: '#2E7D32' }}>✓ Concluído</span>}
                  {current?.obrigatorio && <span className="lesson-tag" style={{ background: '#FFF3E0', color: '#E65100' }}>Obrigatório</span>}
                </div>
                <div className="lesson-text">
                  {current?.descricao || 'Conteúdo da aula.'}
                </div>
                {current?.licoes && current.licoes.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '8px' }}>
                      Lições ({current.licoes.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[...current.licoes].sort((a: any, b: any) => a.ordem - b.ordem).map((licao: any) => {
                        const isExpanded = expandedLicao === licao.id
                        const tipoIcon = licao.tipo === 'VIDEO' ? 'icon-play' : licao.tipo === 'PDF' ? 'icon-file-text' : 'icon-file'
                        const tipoLabel = licao.tipo === 'VIDEO' ? 'Video' : licao.tipo === 'PDF' ? 'PDF' : 'Texto'

                        return (
                          <div key={licao.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
                            <div
                              onClick={() => setExpandedLicao(isExpanded ? null : licao.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', background: isExpanded ? 'var(--gray-50)' : '#fff', transition: 'background 0.15s' }}
                            >
                              <i className={`${tipoIcon} icon-sm`} style={{ color: 'var(--pg-red)' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: '13px' }}>{licao.titulo}</div>
                                <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                                  {tipoLabel}
                                  {licao.duracaoMin ? ` · ${licao.duracaoMin} min` : ''}
                                </div>
                              </div>
                              <i className={`icon-chevron-${isExpanded ? 'up' : 'down'} icon-sm`} style={{ color: 'var(--gray-400)' }} />
                            </div>
                            {isExpanded && (
                              <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--gray-100)' }}>
                                {licao.tipo === 'VIDEO' && licao.conteudo ? (
                                  <div style={{ marginTop: '8px', borderRadius: '6px', overflow: 'hidden' }}>
                                    <VideoPlayer key={licao.id} url={licao.conteudo} startAt={licao.inicioSeg || 0} endAt={licao.fimSeg || undefined} />
                                  </div>
                                ) : licao.tipo === 'PDF' && licao.conteudo ? (
                                  <div style={{ marginTop: '8px' }}>
                                    <PDFViewer url={licao.conteudo} />
                                  </div>
                                ) : licao.tipo === 'TEXTO' && licao.conteudo ? (
                                  <div style={{ marginTop: '8px', padding: '12px', background: '#f9f9f9', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {licao.conteudo}
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '8px', padding: '12px', background: '#f9f9f9', borderRadius: '6px', color: 'var(--gray-500)', fontSize: '13px' }}>
                                    Sem conteúdo disponível
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {current?.quiz && (
                  <div style={{ padding: '12px 16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF9800', marginBottom: '16px' }}>
                    <b>📝 Esta aula contém um quiz</b>
                    <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: '4px 0 0' }}>
                      Ao concluir, você será direcionado para responder as perguntas. Nota mínima: {current.quiz.notaMinima ?? 7}/10.
                    </p>
                  </div>
                )}
                <div className="lesson-actions">
                  {!current?.concluido ? (
                    <>
                      {current?.quiz ? (
                        <>
                          <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handleConcluir}>
                            Iniciar Quiz <i className="icon-chevron-right icon-sm" />
                          </button>
                          {!current?.obrigatorio && currentLesson < lessons.length - 1 && (
                            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handleAvanzar}>
                              Pular <i className="icon-chevron-right icon-sm" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handleConcluir}>
                          Próximo <i className="icon-chevron-right icon-sm" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {currentLesson < lessons.length - 1 && (
                        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handleAvanzar}>
                          <span>Próxima Aula</span><i className="icon-chevron-right icon-sm" />
                        </button>
                      )}
                      {isLastLesson && allCompleted && (
                        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#2E7D32' }} onClick={() => navigate('/modulos')}>
                          <i className="icon-check-circle icon-sm" /> Finalizar Módulo
                        </button>
                      )}
                    </>
                  )}
                  {currentLesson > 0 && (
                    <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => { setCurrentLesson(currentLesson - 1); resetLessonState() }}>
                      <i className="icon-arrow-left icon-sm" /> Anterior
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="lesson-body">
              <h2>Quiz: {current?.titulo}</h2>
              <div className="lesson-text">Responda todas as perguntas para concluir esta aula. Nota mínima: {current?.quiz?.notaMinima ?? 7}/10.</div>

              {quizResult && (
                <div className={`quiz-result-banner ${quizResult.passed ? 'passed' : 'failed'}`}>
                  <div className="quiz-result-header">
                    <span className="quiz-result-icon">{quizResult.passed ? '🎉' : '❌'}</span>
                    <div>
                      <h3 style={{ margin: 0 }}>{quizResult.passed ? 'Aprovado!' : 'Reprovado'}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.8 }}>
                        Nota: {quizResult.nota}/10 ({quizResult.correct}/{quizResult.total} corretas)
                      </p>
                    </div>
                  </div>

                  <div className="quiz-result-breakdown">
                    {current?.quiz?.perguntas?.map((pergunta: any, qIndex: number) => {
                      const userAnswer = selectedAnswers[pergunta.id]
                      const isCorrect = userAnswer === pergunta.correta
                      return (
                        <div key={qIndex} className={`quiz-breakdown-item ${isCorrect ? 'correct' : 'wrong'}`}>
                          <span className="quiz-breakdown-icon">{isCorrect ? '✓' : '✗'}</span>
                          <span className="quiz-breakdown-text">
                            {qIndex + 1}. {pergunta.pergunta.substring(0, 60)}{pergunta.pergunta.length > 60 ? '...' : ''}
                          </span>
                          <span className="quiz-breakdown-answer">
                            {isCorrect ? pergunta.correta : `${userAnswer || '-'} → ${pergunta.correta}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="quiz-result-actions">
                    {!quizResult.passed && (
                      <button className="btn-secondary" onClick={() => { setQuizSubmitted(false); setQuizResult(null); setSelectedAnswers({}) }}>
                        Tentar Novamente
                      </button>
                    )}
                    {quizResult.passed && (
                      <button className="btn-primary" onClick={() => {
                        setShowQuiz(false)
                        setQuizSubmitted(false)
                        setQuizResult(null)
                        if (current?.quiz?.autoGerarCertificado) {
                          loadCertificate()
                          setShowCertificate(true)
                        } else if (currentLesson < lessons.length - 1) {
                          setCurrentLesson(currentLesson + 1)
                        }
                      }}>
                        {current?.quiz?.autoGerarCertificado ? 'Ver Certificado' : currentLesson < lessons.length - 1 ? 'Avançar para Próxima Aula' : 'Finalizar'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                {current?.quiz?.perguntas?.map((pergunta: any, qIndex: number) => (
                  <div key={qIndex} style={{ marginBottom: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                    <p style={{ fontWeight: '600', marginBottom: '12px' }}>{qIndex + 1}. {pergunta.pergunta}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD].filter(Boolean).map((opt: string, oIndex: number) => {
                        const letter = ['A', 'B', 'C', 'D'][oIndex]
                        const isSelected = selectedAnswers[pergunta.id] === letter
                        const isCorrect = quizSubmitted && letter === pergunta.correta
                        const isWrong = quizSubmitted && isSelected && letter !== pergunta.correta
                        return (
                          <label key={oIndex} className={`quiz-opt ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}>
                            <input
                              type="radio"
                              name={`q${pergunta.id}`}
                              checked={isSelected}
                              onChange={() => handleAnswerQuiz(pergunta.id, letter)}
                              disabled={quizSubmitted}
                            />
                            <span className="quiz-letter">{letter}</span>
                            {opt}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="lesson-actions">
                {!quizSubmitted ? (
                  <>
                    <button className="btn-primary" onClick={handleSubmitQuiz} disabled={Object.keys(selectedAnswers).length < (current?.quiz?.perguntas?.length || 0)}>
                      Enviar Respostas
                    </button>
                    <button className="btn-secondary" onClick={() => { setShowQuiz(false); setSelectedAnswers({}) }}>Cancelar</button>
                  </>
                ) : (
                  <button className="btn-secondary" onClick={() => { setShowQuiz(false); setQuizSubmitted(false); setQuizResult(null) }}>Voltar à Aula</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
