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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
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
  const [quizStep, setQuizStep] = useState<Record<string, number>>({})
  const [desktopQuizStep, setDesktopQuizStep] = useState(0)
  const [expandedMobileLesson, setExpandedMobileLesson] = useState<number | null>(0)
  const [expandedMobileExtra, setExpandedMobileExtra] = useState<string | null>(null)
  const [mediaModal, setMediaModal] = useState<{ url: string; type: 'pdf' | 'video'; title: string } | null>(null)
  const isMobile = useIsMobile()

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
      console.error('Erro ao carregar modulo:', err)
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

  useEffect(() => { loadModulo() }, [moduloNombre])

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

  const areAllQuizzesPassed = () => {
    const quizLessons = lessons.filter(l => l.quiz)
    if (quizLessons.length === 0) return false
    return quizLessons.every(l => {
      const result = allQuizResults[l.quiz.id]
      return result?.concluido
    })
  }

  const canOpenQuiz = (lessonIndex: number) => {
    for (let i = 0; i < lessonIndex; i++) {
      if (lessons[i].quiz) {
        const result = allQuizResults[lessons[i].quiz.id]
        if (!result?.concluido) return false
      }
    }
    return true
  }

  const resetLessonState = () => {
    setShowQuiz(false)
    setSelectedAnswers({})
    setQuizSubmitted(false)
    setQuizResult(null)
    setVideoEnded(false)
    setDesktopQuizStep(0)
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

  const handleVideoEnd = () => { setVideoEnded(true) }

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
          <div className="page-title">Carregando modulo...</div>
        </div>
      </div>
    )
  }

  if (semGestor) {
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <button className="btn-secondary back-btn" onClick={() => navigate('/modulos')}><i className="icon-arrow-left icon-sm" /> Voltar</button>
            <div className="page-title">Acesso restrito</div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <p className="empty-msg">Voce precisa ser associado a um Gestor de Posto</p>
          <p className="empty-desc">Aguarde a aprovacao do seu gestor.</p>
        </div>
      </div>
    )
  }

  if (!modulo) {
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <button className="btn-secondary back-btn" onClick={() => navigate('/modulos')}><i className="icon-arrow-left icon-sm" /> Voltar</button>
            <div className="page-title">Modulo nao encontrado</div>
          </div>
        </div>
      </div>
    )
  }

  const renderCertificateTab = () => {
    const quizzesPassed = areAllQuizzesPassed()
    if (!hasCertificate || !quizzesPassed) {
      const quizLessons = lessons.filter(l => l.quiz)
      const pendingCount = quizLessons.filter(l => {
        const result = allQuizResults[l.quiz.id]
        return !result?.concluido
      }).length
      return (
        <div className="empty-state section-padding">
          <div className="empty-icon">📜</div>
          <p className="empty-msg">{!hasCertificate ? 'Nenhum certificado disponivel' : 'Certificado bloqueado'}</p>
          <p className="empty-desc">
            {!hasCertificate
              ? 'Complete todas as aulas e aprove nos quizzes para gerar seu certificado.'
              : `Aprove em ${pendingCount} ${pluralize(pendingCount, 'quiz')} pendente${pendingCount !== 1 ? 's' : ''} para desbloquear seu certificado.`
            }
          </p>
        </div>
      )
    }
    const template = certificate.moduloCertTemplate || certificate.modulo?.certificadoTemplate
    const titulo = certificate.modulo?.titulo || modulo.titulo
    const icone = certificate.modulo?.icone || modulo.icone || '📚'
    const nome = user?.nome || 'Usuario'
    return (
      <div className="section-padding">
        <h3 className="section-title-mb">📜 Seu Certificado</h3>
        <div className="cert-card cert-max-w">
          <div className="cert-header">
            <h3>ACADEMIA PAYGAS</h3>
            <h2>{icone} {titulo}</h2>
          </div>
          <div className="cert-body">
            <p className="cert-body-text">Certificamos que</p>
            <div className="cert-name">{nome}</div>
            <p className="cert-body-text-green">concluiu o modulo de <strong>{titulo}</strong> com sucesso.</p>
            <div className="cert-footer cert-footer-mt">
              <span className="cert-date">{new Date().toLocaleDateString('pt-BR')}</span>
              <div className="cert-seal">PG</div>
            </div>
          </div>
        </div>
        <div className="cert-download-center">
          <button className="btn-primary" onClick={() => navigate('/certificados')}><i className="icon-download icon-sm" /> Ver meus certificados</button>
        </div>
      </div>
    )
  }

  const handleInlineAnswer = (quizId: string, perguntaId: string, answer: string) => {
    if (quizSubmittedMap[quizId]) return
    setQuizAnswers(prev => ({ ...prev, [quizId]: { ...(prev[quizId] || {}), [perguntaId]: answer } }))
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

  const renderQuizInAccordion = (lessonIndex: number) => {
    const lesson = lessons[lessonIndex]
    if (!lesson?.quiz) return null
    const quiz = lesson.quiz
    const isSubmitted = quizSubmittedMap[quiz.id]
    const inlineResult = quizResultMap[quiz.id]
    const answers = quizAnswers[quiz.id] || {}
    const isCurrentQuiz = showQuiz && currentLesson === lessonIndex
    const perguntas = quiz.perguntas || []
    const currentStep = quizStep[quiz.id] || 0
    const isLastStep = currentStep === perguntas.length - 1

    if (!isCurrentQuiz && !isSubmitted) return null
    if (!canOpenQuiz(lessonIndex)) return null

    return (
      <div className="quiz-in-accordion">
        <h4>📝 {quiz.titulo}</h4>
        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '12px' }}>
          Nota minima: {quiz.notaMinima ?? 7}/10
        </p>

        {inlineResult && (
          <div className={`quiz-result-banner ${inlineResult.passed ? 'passed' : 'failed'}`} style={{ marginBottom: '12px' }}>
            <div className="quiz-result-header">
              <span className="quiz-result-icon">{inlineResult.passed ? '🎉' : '❌'}</span>
              <div>
                <h3 className="quiz-result-h3">{inlineResult.passed ? 'Aprovado!' : 'Reprovado'}</h3>
                <p className="quiz-result-sub">Nota: {inlineResult.nota}/10 ({inlineResult.correct}/{inlineResult.total} corretas)</p>
              </div>
            </div>
          </div>
        )}

        {!isSubmitted && (
          <div className="quiz-step-indicator">
            <span className="quiz-step-text">{currentStep + 1} / {perguntas.length}</span>
            <div className="quiz-step-bar">
              <div className="quiz-step-fill" style={{ width: `${((currentStep + 1) / perguntas.length) * 100}%` }} />
            </div>
          </div>
        )}

        {!isSubmitted && perguntas[currentStep] && (() => {
          const pergunta = perguntas[currentStep]
          const letter = null
          return (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>{currentStep + 1}. {pergunta.pergunta}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD].filter(Boolean).map((opt: string, oIndex: number) => {
                  const l = ['A', 'B', 'C', 'D'][oIndex]
                  const isSelected = answers[pergunta.id] === l
                  return (
                    <label key={oIndex} className={`quiz-opt ${isSelected ? 'selected' : ''}`}>
                      <input type="radio" name={`acc-${quiz.id}-${pergunta.id}`} checked={isSelected} onChange={() => handleInlineAnswer(quiz.id, pergunta.id, l)} />
                      <span className="quiz-letter">{l}</span>
                      {opt}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {isSubmitted && perguntas.map((pergunta: any, qIndex: number) => (
          <div key={qIndex} style={{ marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: answers[pergunta.id] === pergunta.correta ? 'var(--pg-green)' : 'var(--pg-red)', fontWeight: 600 }}>
              {answers[pergunta.id] === pergunta.correta ? '✓' : '✗'} {qIndex + 1}. {pergunta.pergunta.substring(0, 50)}{pergunta.pergunta.length > 50 ? '...' : ''}
            </span>
          </div>
        ))}

        {!isSubmitted && (
          <div className="quiz-step-nav">
            {currentStep > 0 && (
              <button className="btn-secondary" onClick={() => setQuizStep(prev => ({ ...prev, [quiz.id]: currentStep - 1 }))}>
                <i className="icon-arrow-left icon-sm" /> Anterior
              </button>
            )}
            {isLastStep ? (
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleInlineSubmit(quiz)} disabled={Object.keys(answers).length < perguntas.length}>
                Enviar Respostas
              </button>
            ) : (
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setQuizStep(prev => ({ ...prev, [quiz.id]: currentStep + 1 }))} disabled={!answers[perguntas[currentStep]?.id]}>
                Proxima <i className="icon-chevron-right icon-sm" />
              </button>
            )}
          </div>
        )}

        {isSubmitted && !inlineResult?.passed && (
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => {
            setQuizSubmittedMap(prev => ({ ...prev, [quiz.id]: false }))
            setQuizResultMap(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
            setQuizAnswers(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
            setQuizStep(prev => ({ ...prev, [quiz.id]: 0 }))
          }}>
            Tentar Novamente
          </button>
        )}
      </div>
    )
  }

  const renderAllQuizzes = () => {
    return (
      <div className="quizzes-section">
        <h3 className="quizzes-title">📝 Todos os Quizzes</h3>
        {quizzesWithLesson.length === 0 ? (
          <div className="empty-state quizzes-empty-p">
            <p className="quizzes-empty-text">Nenhum quiz disponivel neste modulo.</p>
          </div>
        ) : (
          <div className="quizzes-list">
            {quizzesWithLesson.map((lesson) => {
              const quiz = lesson.quiz
              const result = allQuizResults[quiz.id]
              const passed = result?.concluido
              const isExpanded = expandedQuizId === quiz.id
              const isSubmitted = quizSubmittedMap[quiz.id]
              const inlineResult = quizResultMap[quiz.id]
              const answers = quizAnswers[quiz.id] || {}
              const lessonIdx = lessons.indexOf(lesson)
              const quizAccessible = canOpenQuiz(lessonIdx)
              const cardClass = passed ? 'passed' : isExpanded ? 'expanded' : quizAccessible ? 'default' : 'default'

              return (
                <div key={quiz.id} className={`quiz-card ${cardClass}`}>
                  <div className="quiz-card-header" onClick={() => {
                    if (!quizAccessible && !passed) return
                    setExpandedQuizId(isExpanded ? null : quiz.id)
                  }}>
                    <div className="quiz-card-row">
                      <div>
                        <div className="quiz-card-title">📝 {quiz.titulo}</div>
                        <div className="quiz-card-meta">Aula: {lesson.titulo} · {quiz.perguntas?.length || 0} perguntas · Nota minima: {quiz.notaMinima ?? 7}/10</div>
                      </div>
                      <div className="quiz-card-right">
                        {!quizAccessible && !passed ? (
                          <span className="quiz-badge-not-started"><i className="icon-lock icon-sm" /> Bloqueado</span>
                        ) : result ? (
                          <span className={passed ? 'quiz-badge-passed' : 'quiz-badge-failed'}>{passed ? `✓ ${result.nota}/10` : `✗ ${result.nota}/10`}</span>
                        ) : (
                          <span className="quiz-badge-not-started">Nao resolvido</span>
                        )}
                        <i className={`icon-chevron-${isExpanded ? 'up' : 'down'} icon-sm quiz-chevron-gray`} />
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="quiz-expanded-body">
                      {inlineResult && (
                        <div className={`quiz-result-banner ${inlineResult.passed ? 'passed' : 'failed'} quiz-result-header-mt`}>
                          <div className="quiz-result-header">
                            <span className="quiz-result-icon">{inlineResult.passed ? '🎉' : '❌'}</span>
                            <div>
                              <h3 className="quiz-result-h3">{inlineResult.passed ? 'Aprovado!' : 'Reprovado'}</h3>
                              <p className="quiz-result-sub">Nota: {inlineResult.nota}/10 ({inlineResult.correct}/{inlineResult.total} corretas)</p>
                            </div>
                          </div>
                          {!inlineResult.passed && (
                            <div className="quiz-retry-mt">
                              <button className="btn-secondary quiz-retry-btn" onClick={() => {
                                setQuizSubmittedMap(prev => ({ ...prev, [quiz.id]: false }))
                                setQuizResultMap(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
                                setQuizAnswers(prev => { const n = { ...prev }; delete n[quiz.id]; return n })
                                setQuizStep(prev => ({ ...prev, [quiz.id]: 0 }))
                              }}>Tentar Novamente</button>
                            </div>
                          )}
                        </div>
                      )}
                      {!isSubmitted && (() => {
                        const perguntas = quiz.perguntas || []
                        const step = quizStep[quiz.id] || 0
                        const isLast = step === perguntas.length - 1
                        const pergunta = perguntas[step]
                        if (!pergunta) return null
                        return (
                          <>
                            <div className="quiz-step-indicator">
                              <span className="quiz-step-text">{step + 1} / {perguntas.length}</span>
                              <div className="quiz-step-bar">
                                <div className="quiz-step-fill" style={{ width: `${((step + 1) / perguntas.length) * 100}%` }} />
                              </div>
                            </div>
                            <div className="quiz-questions-mt">
                              <div className="quiz-question-item">
                                <p className="quiz-question-text">{step + 1}. {pergunta.pergunta}</p>
                                <div className="quiz-options">
                                  {[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD].filter(Boolean).map((opt: string, oIndex: number) => {
                                    const letter = ['A', 'B', 'C', 'D'][oIndex]
                                    const isSelected = answers[pergunta.id] === letter
                                    return (
                                      <label key={oIndex} className={`quiz-opt ${isSelected ? 'selected' : ''}`}>
                                        <input type="radio" name={`inline-${quiz.id}-${pergunta.id}`} checked={isSelected} onChange={() => handleInlineAnswer(quiz.id, pergunta.id, letter)} />
                                        <span className="quiz-letter">{letter}</span>
                                        {opt}
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="quiz-step-nav">
                              {step > 0 && (
                                <button className="btn-secondary" onClick={() => setQuizStep(prev => ({ ...prev, [quiz.id]: step - 1 }))}>
                                  <i className="icon-arrow-left icon-sm" /> Anterior
                                </button>
                              )}
                              {isLast ? (
                                <button className="btn-primary quiz-submit-btn" style={{ flex: 1 }} onClick={() => handleInlineSubmit(quiz)} disabled={Object.keys(answers).length < perguntas.length}>
                                  Enviar Respostas
                                </button>
                              ) : (
                                <button className="btn-primary quiz-submit-btn" style={{ flex: 1 }} onClick={() => setQuizStep(prev => ({ ...prev, [quiz.id]: step + 1 }))} disabled={!answers[perguntas[step]?.id]}>
                                  Proxima <i className="icon-chevron-right icon-sm" />
                                </button>
                              )}
                            </div>
                          </>
                        )
                      })()}
                      {isSubmitted && quiz.perguntas?.map((pergunta: any, qIndex: number) => (
                        <div key={qIndex} className="quiz-breakdown-item" style={{ marginBottom: '6px' }}>
                          <span className="quiz-breakdown-icon" style={{ color: answers[pergunta.id] === pergunta.correta ? 'var(--pg-green)' : 'var(--pg-red)' }}>
                            {answers[pergunta.id] === pergunta.correta ? '✓' : '✗'}
                          </span>
                          <span className="quiz-breakdown-text">{qIndex + 1}. {pergunta.pergunta.substring(0, 50)}{pergunta.pergunta.length > 50 ? '...' : ''}</span>
                          <span className="quiz-breakdown-answer">{answers[pergunta.id] === pergunta.correta ? pergunta.correta : `${answers[pergunta.id] || '-'} → ${pergunta.correta}`}</span>
                        </div>
                      ))}
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

  const openMediaModal = (url: string, type: 'pdf' | 'video', title: string) => {
    setMediaModal({ url, type, title })
  }

  const renderMediaButton = (lesson: any) => {
    if (lesson.tipo === 'PDF' && lesson.pdfUrl) {
      return (
        <button className="media-open-btn" onClick={() => openMediaModal(lesson.pdfUrl, 'pdf', lesson.titulo)}>
          <i className="icon-file-text" /> Abrir PDF
        </button>
      )
    }
    if (lesson.videoUrl) {
      return (
        <button className="media-open-btn" onClick={() => openMediaModal(lesson.videoUrl, 'video', lesson.titulo)}>
          <i className="icon-play" /> Assistir Video
        </button>
      )
    }
    return null
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
            <div className="confetti-text">Parabens!</div>
          </div>
        </div>
      )}

      {mediaModal && (
        <div className="media-modal-overlay" onClick={() => setMediaModal(null)}>
          <div className="media-modal" onClick={e => e.stopPropagation()}>
            <div className="media-modal-header">
              <span className="media-modal-title">{mediaModal.title}</span>
              <button className="media-modal-close" onClick={() => setMediaModal(null)}><i className="icon-x" /></button>
            </div>
            <div className="media-modal-body">
              {mediaModal.type === 'pdf' ? (
                <PDFViewer url={mediaModal.url} />
              ) : (
                <iframe src={mediaModal.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} title={mediaModal.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <button className="btn-secondary back-btn" onClick={() => navigate(-1)}><i className="icon-arrow-left icon-sm" /> Voltar</button>
          <div className="page-title">{modulo.titulo}</div>
          <div className="page-subtitle">{lessons.length} {pluralize(lessons.length, 'aula')}{modulo.autoCertificado ? ' · Certificado automatico' : ''}</div>
        </div>
      </div>

      <div className="lesson-layout">
        <div className="lesson-sidebar">
          <div className="lesson-sidebar-header">
            <h3>{modulo.titulo}</h3>
            <p>{lessons.filter(l => isLessonCompleted(l)).length}/{lessons.length} concluidas</p>
          </div>

          {lessons.map((lesson, i) => {
            const completed = isLessonCompleted(lesson)
            const locked = lesson.obrigatorio && !completed && !canAdvanceToLesson(i)
            const canClick = !locked || completed
            const isActive = i === currentLesson && !showAllQuizzes && !showCertificate
            const isExpanded = isMobile && expandedMobileLesson === i
            const tipoLabel = lesson.tipo === 'PDF' ? 'PDF' : lesson.tipo === 'TEXTO' ? 'Texto' : lesson.videoUrl ? 'Video' : 'Conteudo'
            const tipoBadgeClass = lesson.tipo === 'PDF' ? 'pdf' : lesson.tipo === 'TEXTO' ? 'texto' : lesson.videoUrl ? 'video' : 'default'

            const handleLessonClick = () => {
              if (!canClick) return
              if (isMobile) {
                setExpandedMobileLesson(isExpanded ? null : i)
                setExpandedMobileExtra(null)
                if (!isExpanded) {
                  setShowAllQuizzes(false)
                  setShowCertificate(false)
                  setCurrentLesson(i)
                  resetLessonState()
                }
              } else {
                setShowAllQuizzes(false)
                setShowCertificate(false)
                setCurrentLesson(i)
                resetLessonState()
              }
            }

            return (
              <div key={lesson.id || i} className={`lesson-item ${isActive ? 'active' : ''} ${completed ? 'done' : ''} ${locked && !completed ? 'locked' : ''}`} style={!canClick ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                <div className="lesson-item-header" onClick={handleLessonClick}>
                  <div className="lesson-num">
                    {completed ? <i className="icon-check icon-sm" /> : locked ? <i className="icon-lock icon-sm" /> : i + 1}
                  </div>
                  <div className="lesson-item-info">
                    <b>{lesson.titulo}</b>
                    <span>
                      {tipoLabel}
                      {lesson.licoes && lesson.licoes.length > 0 ? ` · ${lesson.licoes.length} ${pluralize(lesson.licoes.length, 'licao')}` : ''}
                    </span>
                  </div>
                  {completed && !isMobile && <span className="lesson-check"><i className="icon-check icon-sm" /></span>}
                  {locked && !completed && !isMobile && <span className="lesson-locked-icon"><i className="icon-lock icon-sm" /></span>}
                  {isMobile && (
                    <>
                      <span className={`lesson-item-type-badge ${tipoBadgeClass}`}>
                        {lesson.tipo === 'PDF' ? <i className="icon-file-text lesson-type-icon" /> : lesson.videoUrl ? <i className="icon-play lesson-type-icon" /> : <i className="icon-file lesson-type-icon" />}
                        {tipoLabel}
                      </span>
                      {completed && <span className="lesson-check"><i className="icon-check icon-sm" /></span>}
                      {locked && !completed && <span className="lesson-locked-icon"><i className="icon-lock icon-sm" /></span>}
                      <i className={`icon-chevron-${isExpanded ? 'up' : 'down'} icon-sm lesson-item-chevron ${isExpanded ? 'expanded' : ''}`} />
                    </>
                  )}
                </div>

                {isMobile && isExpanded && (
                  <div className="lesson-item-accordion-body">
                    {renderMediaButton(lesson)}

                    <div className="lesson-desc">{lesson.descricao || 'Conteudo da aula.'}</div>

                    <div className="lesson-meta-tags">
                      <span className="lesson-meta-tag">{tipoLabel}</span>
                      {lesson.licoes && lesson.licoes.length > 0 && (
                        <span className="lesson-meta-tag">{lesson.licoes.length} {pluralize(lesson.licoes.length, 'licao')}</span>
                      )}
                      {completed && <span className="lesson-meta-tag completed">✓ Concluido</span>}
                      {lesson.obrigatorio && <span className="lesson-meta-tag required">Obrigatorio</span>}
                    </div>

                    {lesson.quiz && !completed && !showQuiz && canOpenQuiz(i) && (
                      <div className="lesson-quiz-alert">
                        <b>📝 Esta aula contem um quiz</b>
                        <p className="lesson-quiz-alert-p">Nota minima: {lesson.quiz.notaMinima ?? 7}/10.</p>
                      </div>
                    )}

                    {showQuiz && currentLesson === i && renderQuizInAccordion(i)}

                    {!showQuiz && (
                      <div className="lesson-nav-btns">
                        {i > 0 && canAdvanceToLesson(i - 1) && (
                          <button className="btn-secondary" onClick={() => {
                            setExpandedMobileLesson(i - 1)
                            setCurrentLesson(i - 1)
                            resetLessonState()
                          }}>
                            <i className="icon-arrow-left icon-sm" /> Anterior
                          </button>
                        )}
                        {!completed ? (
                          lesson.quiz ? (
                            canOpenQuiz(i) ? (
                              <button className="btn-primary" onClick={() => { setCurrentLesson(i); setShowQuiz(true) }}>
                                Iniciar Quiz <i className="icon-chevron-right icon-sm" />
                              </button>
                            ) : (
                              <button className="btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                <i className="icon-lock icon-sm" /> Quiz bloqueado
                              </button>
                            )
                          ) : (
                            <button className="btn-primary" onClick={() => { setCurrentLesson(i); handleConcluir() }}>
                              Proximo <i className="icon-chevron-right icon-sm" />
                            </button>
                          )
                        ) : i < lessons.length - 1 ? (
                          <button className="btn-primary" onClick={() => {
                            setExpandedMobileLesson(i + 1)
                            setCurrentLesson(i + 1)
                            resetLessonState()
                          }}>
                            Proxima Aula <i className="icon-chevron-right icon-sm" />
                          </button>
                        ) : allCompleted ? (
                          <button className="btn-primary" onClick={() => navigate('/modulos')}>
                            <i className="icon-check-circle icon-sm" /> Finalizar Modulo
                          </button>
                        ) : null}
                      </div>
                    )}

                    {showQuiz && currentLesson === i && quizResult?.passed && (
                      <div className="lesson-nav-btns">
                        <button className="btn-primary" onClick={() => {
                          setShowQuiz(false)
                          setQuizSubmitted(false)
                          setQuizResult(null)
                          if (i < lessons.length - 1) {
                            setExpandedMobileLesson(i + 1)
                            setCurrentLesson(i + 1)
                            resetLessonState()
                          } else {
                            navigate('/modulos')
                          }
                        }}>
                          {i < lessons.length - 1 ? 'Proxima Aula' : 'Finalizar Modulo'} <i className="icon-chevron-right icon-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {allCompleted && (
            <div className="completed-banner">
              <i className="icon-check-circle icon-lg completed-banner-icon" />
              <p className="completed-banner-text">Modulo Concluido!</p>
              {modulo.autoCertificado && <p className="completed-auto-cert">Certificado gerado automaticamente.</p>}
            </div>
          )}

          <div className="lesson-sidebar-extras">
            <div className={`sidebar-extra-item ${showAllQuizzes ? 'active' : ''}`} onClick={() => {
              if (isMobile) {
                setExpandedMobileExtra(expandedMobileExtra === 'quizzes' ? null : 'quizzes')
                setExpandedMobileLesson(null)
                setShowAllQuizzes(true)
                setShowCertificate(false)
                resetLessonState()
              } else {
                setShowAllQuizzes(!showAllQuizzes)
                setShowCertificate(false)
                resetLessonState()
              }
            }}>
              <i className="icon-file-text icon-sm" />
              <span>Todos os Quizzes</span>
              <span className="sidebar-extra-badge">{quizzesWithLesson.length}</span>
              {isMobile && <i className={`icon-chevron-${expandedMobileExtra === 'quizzes' ? 'up' : 'down'} icon-sm extra-chevron ${expandedMobileExtra === 'quizzes' ? 'expanded' : ''}`} />}
            </div>
            {isMobile && expandedMobileExtra === 'quizzes' && (
              <div className="sidebar-extra-accordion-body">{renderAllQuizzes()}</div>
            )}
            <div className={`sidebar-extra-item ${showCertificate ? 'active' : ''}`} onClick={() => {
              if (isMobile) {
                setExpandedMobileExtra(expandedMobileExtra === 'certificate' ? null : 'certificate')
                setExpandedMobileLesson(null)
                setShowCertificate(true)
                setShowAllQuizzes(false)
                resetLessonState()
                loadCertificate()
              } else {
                setShowCertificate(!showCertificate)
                setShowAllQuizzes(false)
                resetLessonState()
                loadCertificate()
              }
            }}>
              <i className="icon-award icon-sm" />
              <span>Meu Certificado</span>
              {hasCertificate && areAllQuizzesPassed() && <span className="sidebar-extra-check">✓</span>}
              {isMobile && <i className={`icon-chevron-${expandedMobileExtra === 'certificate' ? 'up' : 'down'} icon-sm extra-chevron ${expandedMobileExtra === 'certificate' ? 'expanded' : ''}`} />}
            </div>
            {isMobile && expandedMobileExtra === 'certificate' && (
              <div className="sidebar-extra-accordion-body">{renderCertificateTab()}</div>
            )}
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
                  <VideoPlayer key={`${current.id}-${current.videoInicio}`} url={current.videoUrl} startAt={current.videoInicio || 0} endAt={current.videoFim || undefined} onTimeUpdate={(time) => { if (current.videoFim && time >= current.videoFim) handleVideoEnd() }} />
                </div>
              ) : current?.tipo === 'TEXTO' ? (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn"><i className="icon-file-text icon-xl" /></div>
                    <p>Conteudo de Texto</p>
                    <small className="lesson-text-placeholder">{current?.titulo}</small>
                  </div>
                </div>
              ) : (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn"><i className="icon-file-text icon-xl" /></div>
                    <p>Conteudo da Aula</p>
                    <small className="lesson-text-placeholder">{current?.titulo || 'Material de leitura'}</small>
                  </div>
                </div>
              )}
              <div className="lesson-body">
                <h2>{current?.titulo}</h2>
                <div className="lesson-tags">
                  <span className="lesson-tag">{current?.tipo === 'PDF' ? 'PDF' : current?.videoUrl ? 'Video' : 'Conteudo'}</span>
                  {current?.licoes && current.licoes.length > 0 && <span className="lesson-tag">{current.licoes.length} {pluralize(current.licoes.length, 'licao')}</span>}
                  {current?.videoInicio || current?.videoFim ? <span className="lesson-tag">⏱ {current.videoInicio || 0}s – {current.videoFim || 'fim'}s</span> : null}
                  {current?.concluido && <span className="lesson-tag lesson-tags-concluido">✓ Concluido</span>}
                  {current?.obrigatorio && <span className="lesson-tag lesson-tags-obrigatorio">Obrigatorio</span>}
                </div>
                <div className="lesson-text">{current?.descricao || 'Conteudo da aula.'}</div>
                {current?.licoes && current.licoes.length > 0 && (
                  <div className="lesson-cons-section">
                    <h3 className="lesson-cons-title">Licoes ({current.licoes.length})</h3>
                    <div className="lesson-cons-list">
                      {[...current.licoes].sort((a: any, b: any) => a.ordem - b.ordem).map((licao: any) => {
                        const isLicaoExpanded = expandedLicao === licao.id
                        const tipoIcon = licao.tipo === 'VIDEO' ? 'icon-play' : licao.tipo === 'PDF' ? 'icon-file-text' : 'icon-file'
                        const licaoTipoLabel = licao.tipo === 'VIDEO' ? 'Video' : licao.tipo === 'PDF' ? 'PDF' : 'Texto'
                        return (
                          <div key={licao.id} className="lesson-cons-item">
                            <div onClick={() => setExpandedLicao(isLicaoExpanded ? null : licao.id)} className={`lesson-cons-header ${isLicaoExpanded ? 'expanded' : 'default'}`}>
                              <i className={`${tipoIcon} icon-sm lesson-cons-icon`} />
                              <div className="lesson-cons-info">
                                <div className="lesson-cons-name">{licao.titulo}</div>
                                <div className="lesson-cons-meta">{licaoTipoLabel}{licao.duracaoMin ? ` · ${licao.duracaoMin} min` : ''}</div>
                              </div>
                              <i className={`icon-chevron-${isLicaoExpanded ? 'up' : 'down'} icon-sm lesson-cons-chevron`} />
                            </div>
                            {isLicaoExpanded && (
                              <div className="lesson-cons-body">
                                {licao.tipo === 'VIDEO' && licao.conteudo ? (
                                  <div className="lesson-cons-video"><VideoPlayer key={licao.id} url={licao.conteudo} startAt={licao.inicioSeg || 0} endAt={licao.fimSeg || undefined} /></div>
                                ) : licao.tipo === 'PDF' && licao.conteudo ? (
                                  <div className="lesson-cons-video"><PDFViewer url={licao.conteudo} /></div>
                                ) : licao.tipo === 'TEXTO' && licao.conteudo ? (
                                  <div className="lesson-cons-text">{licao.conteudo}</div>
                                ) : (
                                  <div className="lesson-cons-empty">Sem conteudo disponivel</div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {current?.quiz && canOpenQuiz(currentLesson) && (
                  <div className="lesson-quiz-warning">
                    <b>📝 Esta aula contem um quiz</b>
                    <p className="lesson-quiz-warning-p">Ao concluir, voce sera direcionado para responder as perguntas. Nota minima: {current.quiz.notaMinima ?? 7}/10.</p>
                  </div>
                )}
                <div className="lesson-actions">
                  {!current?.concluido ? (
                    <>
                      {current?.quiz ? (
                        canOpenQuiz(currentLesson) ? (
                          <>
                            <button className="btn-primary lesson-action-btn" onClick={handleConcluir}>Iniciar Quiz <i className="icon-chevron-right icon-sm" /></button>
                            {!current?.obrigatorio && currentLesson < lessons.length - 1 && (
                              <button className="btn-secondary lesson-action-btn" onClick={handleAvanzar}>Pular <i className="icon-chevron-right icon-sm" /></button>
                            )}
                          </>
                        ) : (
                          <button className="btn-primary lesson-action-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                            <i className="icon-lock icon-sm" /> Complete os quizzes anteriores primeiro
                          </button>
                        )
                      ) : (
                        <button className="btn-primary lesson-action-btn" onClick={handleConcluir}>Proximo <i className="icon-chevron-right icon-sm" /></button>
                      )}
                    </>
                  ) : (
                    <>
                      {currentLesson < lessons.length - 1 && (
                        <button className="btn-primary lesson-action-btn" onClick={handleAvanzar}><span>Proxima Aula</span><i className="icon-chevron-right icon-sm" /></button>
                      )}
                      {isLastLesson && allCompleted && (
                        <button className="btn-primary lesson-action-btn lesson-action-btn-green" onClick={() => navigate('/modulos')}><i className="icon-check-circle icon-sm" /> Finalizar Modulo</button>
                      )}
                    </>
                  )}
                  {currentLesson > 0 && (
                    <button className="btn-secondary lesson-anterior-btn" onClick={() => { setCurrentLesson(currentLesson - 1); resetLessonState() }}>
                      <i className="icon-arrow-left icon-sm" /> Anterior
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="lesson-body">
              <h2>Quiz: {current?.titulo}</h2>
              <div className="lesson-text">Responda todas as perguntas para concluir esta aula. Nota minima: {current?.quiz?.notaMinima ?? 7}/10.</div>

              {quizResult && (
                <div className={`quiz-result-banner ${quizResult.passed ? 'passed' : 'failed'}`}>
                  <div className="quiz-result-header">
                    <span className="quiz-result-icon">{quizResult.passed ? '🎉' : '❌'}</span>
                    <div>
                      <h3 className="quiz-result-h3">{quizResult.passed ? 'Aprovado!' : 'Reprovado'}</h3>
                      <p className="quiz-result-sub">Nota: {quizResult.nota}/10 ({quizResult.correct}/{quizResult.total} corretas)</p>
                    </div>
                  </div>
                  <div className="quiz-result-breakdown">
                    {current?.quiz?.perguntas?.map((pergunta: any, qIndex: number) => {
                      const userAnswer = selectedAnswers[pergunta.id]
                      const isCorrect = userAnswer === pergunta.correta
                      return (
                        <div key={qIndex} className={`quiz-breakdown-item ${isCorrect ? 'correct' : 'wrong'}`}>
                          <span className="quiz-breakdown-icon">{isCorrect ? '✓' : '✗'}</span>
                          <span className="quiz-breakdown-text">{qIndex + 1}. {pergunta.pergunta.substring(0, 60)}{pergunta.pergunta.length > 60 ? '...' : ''}</span>
                          <span className="quiz-breakdown-answer">{isCorrect ? pergunta.correta : `${userAnswer || '-'} → ${pergunta.correta}`}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="quiz-result-actions">
                    {!quizResult.passed && (
                      <button className="btn-secondary" onClick={() => { setQuizSubmitted(false); setQuizResult(null); setSelectedAnswers({}); setDesktopQuizStep(0) }}>Tentar Novamente</button>
                    )}
                    {quizResult.passed && (
                      <button className="btn-primary" onClick={() => {
                        setShowQuiz(false)
                        setQuizSubmitted(false)
                        setQuizResult(null)
                        setDesktopQuizStep(0)
                        if (current?.quiz?.autoGerarCertificado) {
                          loadCertificate()
                          setShowCertificate(true)
                        } else if (currentLesson < lessons.length - 1) {
                          setCurrentLesson(currentLesson + 1)
                        }
                      }}>
                        {current?.quiz?.autoGerarCertificado ? 'Ver Certificado' : currentLesson < lessons.length - 1 ? 'Avancar para Proxima Aula' : 'Finalizar'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!quizSubmitted && (() => {
                const perguntas = current?.quiz?.perguntas || []
                const step = desktopQuizStep
                const isLast = step === perguntas.length - 1
                const pergunta = perguntas[step]
                if (!pergunta) return null
                return (
                  <>
                    <div className="quiz-step-indicator">
                      <span className="quiz-step-text">{step + 1} / {perguntas.length}</span>
                      <div className="quiz-step-bar">
                        <div className="quiz-step-fill" style={{ width: `${((step + 1) / perguntas.length) * 100}%` }} />
                      </div>
                    </div>
                    <div className="quiz-questions-mt" style={{ marginTop: '16px' }}>
                      <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                        <p style={{ fontWeight: '600', marginBottom: '12px' }}>{step + 1}. {pergunta.pergunta}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD].filter(Boolean).map((opt: string, oIndex: number) => {
                            const letter = ['A', 'B', 'C', 'D'][oIndex]
                            const isSelected = selectedAnswers[pergunta.id] === letter
                            return (
                              <label key={oIndex} className={`quiz-opt ${isSelected ? 'selected' : ''}`}>
                                <input type="radio" name={`q${pergunta.id}`} checked={isSelected} onChange={() => handleAnswerQuiz(pergunta.id, letter)} />
                                <span className="quiz-letter">{letter}</span>
                                {opt}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="quiz-step-nav">
                      {step > 0 && (
                        <button className="btn-secondary" onClick={() => setDesktopQuizStep(step - 1)}>
                          <i className="icon-arrow-left icon-sm" /> Anterior
                        </button>
                      )}
                      {isLast ? (
                        <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmitQuiz} disabled={Object.keys(selectedAnswers).length < perguntas.length}>
                          Enviar Respostas
                        </button>
                      ) : (
                        <button className="btn-primary" style={{ flex: 1 }} onClick={() => setDesktopQuizStep(step + 1)} disabled={!selectedAnswers[pergunta.id]}>
                          Proxima <i className="icon-chevron-right icon-sm" />
                        </button>
                      )}
                    </div>
                  </>
                )
              })()}

              <div className="lesson-actions" style={{ marginTop: '12px' }}>
                {!quizSubmitted ? (
                  <button className="btn-secondary" onClick={() => { setShowQuiz(false); setSelectedAnswers({}); setDesktopQuizStep(0) }}>Cancelar</button>
                ) : (
                  <button className="btn-secondary" onClick={() => { setShowQuiz(false); setQuizSubmitted(false); setQuizResult(null); setDesktopQuizStep(0) }}>Voltar a Aula</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
