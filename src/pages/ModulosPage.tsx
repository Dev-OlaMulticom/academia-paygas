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
  const [expandedMobileLesson, setExpandedMobileLesson] = useState<number | null>(0)
  const [expandedMobileExtra, setExpandedMobileExtra] = useState<string | null>(null)
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
            <button className="btn-secondary back-btn" onClick={() => navigate('/modulos')}><i className="icon-arrow-left icon-sm" /> Voltar</button>
            <div className="page-title">Acesso restrito</div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <p className="empty-msg">Você precisa ser associado a um Gestor de Posto</p>
          <p className="empty-desc">Aguarde a aprovação do seu gestor.</p>
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
            <div className="page-title">Módulo não encontrado</div>
          </div>
        </div>
      </div>
    )
  }

  const renderCertificateTab = () => {
    if (!hasCertificate) {
      return (
        <div className="empty-state section-padding">
          <div className="empty-icon">📜</div>
          <p className="empty-msg">Nenhum certificado disponível</p>
          <p className="empty-desc">Complete todas as aulas e aprov nos quizzes para gerar seu certificado.</p>
        </div>
      )
    }

    const template = certificate.moduloCertTemplate || certificate.modulo?.certificadoTemplate
    const titulo = certificate.modulo?.titulo || modulo.titulo
    const icone = certificate.modulo?.icone || modulo.icone || '📚'
    const nome = user?.nome || 'Usuário'

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
            <p className="cert-body-text-green">
              concluiu o módulo de <strong>{titulo}</strong> com sucesso.
            </p>
            <div className="cert-footer cert-footer-mt">
              <span className="cert-date">{new Date().toLocaleDateString('pt-BR')}</span>
              <div className="cert-seal">PG</div>
            </div>
          </div>
        </div>
        <div className="cert-download-center">
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
      <div className="quizzes-section">
        <h3 className="quizzes-title">📝 Todos os Quizzes</h3>
        {quizzesWithLesson.length === 0 ? (
          <div className="empty-state quizzes-empty-p">
            <p className="quizzes-empty-text">Nenhum quiz disponível neste módulo.</p>
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

              const cardClass = passed ? 'passed' : isExpanded ? 'expanded' : 'default'

              return (
                <div key={quiz.id} className={`quiz-card ${cardClass}`}>
                  <div className="quiz-card-header" onClick={() => setExpandedQuizId(isExpanded ? null : quiz.id)}>
                    <div className="quiz-card-row">
                      <div>
                        <div className="quiz-card-title">📝 {quiz.titulo}</div>
                        <div className="quiz-card-meta">
                          Aula: {lesson.titulo} · {quiz.perguntas?.length || 0} perguntas · Nota mínima: {quiz.notaMinima ?? 7}/10
                        </div>
                      </div>
                      <div className="quiz-card-right">
                        {result ? (
                          <span className={passed ? 'quiz-badge-passed' : 'quiz-badge-failed'}>
                            {passed ? `✓ ${result.nota}/10` : `✗ ${result.nota}/10`}
                          </span>
                        ) : (
                          <span className="quiz-badge-not-started">
                            Não resolvido
                          </span>
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
                              <p className="quiz-result-sub">
                                Nota: {inlineResult.nota}/10 ({inlineResult.correct}/{inlineResult.total} corretas)
                              </p>
                            </div>
                          </div>
                          {!inlineResult.passed && (
                            <div className="quiz-retry-mt">
                              <button className="btn-secondary quiz-retry-btn" onClick={() => {
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

                      <div className="quiz-questions-mt">
                        {quiz.perguntas?.map((pergunta: any, qIndex: number) => (
                          <div key={qIndex} className="quiz-question-item">
                            <p className="quiz-question-text">{qIndex + 1}. {pergunta.pergunta}</p>
                            <div className="quiz-options">
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

                      <div className="quiz-submit-row">
                        {!isSubmitted ? (
                          <button
                            className="btn-primary quiz-submit-btn"
                            onClick={() => handleInlineSubmit(quiz)}
                            disabled={Object.keys(answers).length < (quiz.perguntas?.length || 0)}
                          >
                            Enviar Respostas
                          </button>
                        ) : !inlineResult?.passed && (
                          <button className="btn-secondary quiz-submit-btn" onClick={() => {
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
          <button className="btn-secondary back-btn" onClick={() => navigate(-1)}><i className="icon-arrow-left icon-sm" /> Voltar</button>
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
            const isExpanded = isMobile && expandedMobileLesson === i
            const tipoLabel = lesson.tipo === 'PDF' ? 'PDF' : lesson.tipo === 'TEXTO' ? 'Texto' : lesson.videoUrl ? 'Vídeo' : 'Conteúdo'
            const tipoBadgeClass = lesson.tipo === 'PDF' ? 'pdf' : lesson.tipo === 'TEXTO' ? 'texto' : lesson.videoUrl ? 'video' : 'default'

            const handleLessonClick = () => {
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
                if (!canClick) return
                setShowAllQuizzes(false)
                setShowCertificate(false)
                setCurrentLesson(i)
                resetLessonState()
              }
            }

            return (
              <div
                key={lesson.id || i}
                className={`lesson-item ${isActive ? 'active' : ''} ${completed ? 'done' : ''}`}
                style={!canClick && !isMobile ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <div className="lesson-item-header" onClick={handleLessonClick}>
                  <div className="lesson-num">
                    {completed ? <i className="icon-check icon-sm" /> : locked ? <i className="icon-lock icon-sm" /> : i + 1}
                  </div>
                  <div className="lesson-item-info">
                    <b>{lesson.titulo}</b>
                    <span>
                      {tipoLabel}
                      {lesson.licoes && lesson.licoes.length > 0 ? ` · ${lesson.licoes.length} ${pluralize(lesson.licoes.length, 'lição')}` : ''}
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
                    {lesson.tipo === 'PDF' && lesson.pdfUrl ? (
                      <div className="lesson-video">
                        <PDFViewer url={lesson.pdfUrl} />
                      </div>
                    ) : lesson.videoUrl ? (
                      <div className="lesson-video">
                        <VideoPlayer
                          key={`${lesson.id}-${lesson.videoInicio}`}
                          url={lesson.videoUrl}
                          startAt={lesson.videoInicio || 0}
                          endAt={lesson.videoFim || undefined}
                          onTimeUpdate={(time) => {
                            if (lesson.videoFim && time >= lesson.videoFim) {
                              handleVideoEnd()
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="lesson-video">
                        <div className="lesson-video-placeholder">
                          <div className="play-btn"><i className="icon-file-text icon-xl" /></div>
                          <p>{lesson.tipo === 'TEXTO' ? 'Conteúdo de Texto' : 'Conteúdo da Aula'}</p>
                        </div>
                      </div>
                    )}

                    <div className="lesson-desc">{lesson.descricao || 'Conteúdo da aula.'}</div>

                    <div className="lesson-meta-tags">
                      <span className="lesson-meta-tag">{tipoLabel}</span>
                      {lesson.licoes && lesson.licoes.length > 0 && (
                        <span className="lesson-meta-tag">{lesson.licoes.length} {pluralize(lesson.licoes.length, 'lição')}</span>
                      )}
                      {completed && <span className="lesson-meta-tag completed">✓ Concluído</span>}
                      {lesson.obrigatorio && <span className="lesson-meta-tag required">Obrigatório</span>}
                    </div>

                    {lesson.quiz && (
                      <div className="lesson-quiz-alert">
                        <b>📝 Esta aula contém um quiz</b>
                        <p className="lesson-quiz-alert-p">
                          Nota mínima: {lesson.quiz.notaMinima ?? 7}/10.
                        </p>
                      </div>
                    )}

                    {!completed ? (
                      lesson.quiz ? (
                        <button className="lesson-quiz-btn-mobile" onClick={() => {
                          setCurrentLesson(i)
                          setShowAllQuizzes(false)
                          setShowCertificate(false)
                          handleConcluir()
                        }}>
                          Iniciar Quiz <i className="icon-chevron-right icon-sm" />
                        </button>
                      ) : (
                        <button className="lesson-next-btn-mobile" onClick={() => {
                          setCurrentLesson(i)
                          setShowAllQuizzes(false)
                          setShowCertificate(false)
                          handleConcluir()
                        }}>
                          Próximo <i className="icon-chevron-right icon-sm" />
                        </button>
                      )
                    ) : (
                      i < lessons.length - 1 ? (
                        <button className="lesson-next-btn-mobile" onClick={() => {
                          setExpandedMobileLesson(i + 1)
                          setCurrentLesson(i + 1)
                          resetLessonState()
                        }}>
                          Próxima Aula <i className="icon-chevron-right icon-sm" />
                        </button>
                      ) : allCompleted ? (
                        <button className="lesson-next-btn-mobile completed-finalize-btn" onClick={() => navigate('/modulos')}>
                          <i className="icon-check-circle icon-sm" /> Finalizar Módulo
                        </button>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {allCompleted && (
            <div className="completed-banner">
              <i className="icon-check-circle icon-lg completed-banner-icon" />
              <p className="completed-banner-text">Módulo Concluído!</p>
              {modulo.autoCertificado && (
                <p className="completed-auto-cert">Certificado gerado automaticamente.</p>
              )}
            </div>
          )}

          <div className="lesson-sidebar-extras">
            <div
              className={`sidebar-extra-item ${showAllQuizzes ? 'active' : ''}`}
              onClick={() => {
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
              }}
            >
              <i className="icon-file-text icon-sm" />
              <span>Todos os Quizzes</span>
              <span className="sidebar-extra-badge">{quizzesWithLesson.length}</span>
              {isMobile && <i className={`icon-chevron-${expandedMobileExtra === 'quizzes' ? 'up' : 'down'} icon-sm extra-chevron ${expandedMobileExtra === 'quizzes' ? 'expanded' : ''}`} />}
            </div>
            {isMobile && expandedMobileExtra === 'quizzes' && (
              <div className="sidebar-extra-accordion-body">
                {renderAllQuizzes()}
              </div>
            )}
            <div
              className={`sidebar-extra-item ${showCertificate ? 'active' : ''}`}
              onClick={() => {
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
              }}
            >
              <i className="icon-award icon-sm" />
              <span>Meu Certificado</span>
              {hasCertificate && <span className="sidebar-extra-check">✓</span>}
              {isMobile && <i className={`icon-chevron-${expandedMobileExtra === 'certificate' ? 'up' : 'down'} icon-sm extra-chevron ${expandedMobileExtra === 'certificate' ? 'expanded' : ''}`} />}
            </div>
            {isMobile && expandedMobileExtra === 'certificate' && (
              <div className="sidebar-extra-accordion-body">
                {renderCertificateTab()}
              </div>
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
                    <small className="lesson-text-placeholder">{current?.titulo}</small>
                  </div>
                </div>
              ) : (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn"><i className="icon-file-text icon-xl" /></div>
                    <p>Conteúdo da Aula</p>
                    <small className="lesson-text-placeholder">{current?.titulo || 'Material de leitura'}</small>
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
                  {current?.concluido && <span className="lesson-tag lesson-tags-concluido">✓ Concluído</span>}
                  {current?.obrigatorio && <span className="lesson-tag lesson-tags-obrigatorio">Obrigatório</span>}
                </div>
                <div className="lesson-text">
                  {current?.descricao || 'Conteúdo da aula.'}
                </div>
                {current?.licoes && current.licoes.length > 0 && (
                  <div className="lesson-cons-section">
                    <h3 className="lesson-cons-title">
                      Lições ({current.licoes.length})
                    </h3>
                    <div className="lesson-cons-list">
                      {[...current.licoes].sort((a: any, b: any) => a.ordem - b.ordem).map((licao: any) => {
                        const isExpanded = expandedLicao === licao.id
                        const tipoIcon = licao.tipo === 'VIDEO' ? 'icon-play' : licao.tipo === 'PDF' ? 'icon-file-text' : 'icon-file'
                        const tipoLabel = licao.tipo === 'VIDEO' ? 'Video' : licao.tipo === 'PDF' ? 'PDF' : 'Texto'

                        return (
                          <div key={licao.id} className="lesson-cons-item">
                            <div
                              onClick={() => setExpandedLicao(isExpanded ? null : licao.id)}
                              className={`lesson-cons-header ${isExpanded ? 'expanded' : 'default'}`}
                            >
                              <i className={`${tipoIcon} icon-sm lesson-cons-icon`} />
                              <div className="lesson-cons-info">
                                <div className="lesson-cons-name">{licao.titulo}</div>
                                <div className="lesson-cons-meta">
                                  {tipoLabel}
                                  {licao.duracaoMin ? ` · ${licao.duracaoMin} min` : ''}
                                </div>
                              </div>
                              <i className={`icon-chevron-${isExpanded ? 'up' : 'down'} icon-sm lesson-cons-chevron`} />
                            </div>
                            {isExpanded && (
                              <div className="lesson-cons-body">
                                {licao.tipo === 'VIDEO' && licao.conteudo ? (
                                  <div className="lesson-cons-video">
                                    <VideoPlayer key={licao.id} url={licao.conteudo} startAt={licao.inicioSeg || 0} endAt={licao.fimSeg || undefined} />
                                  </div>
                                ) : licao.tipo === 'PDF' && licao.conteudo ? (
                                  <div className="lesson-cons-video">
                                    <PDFViewer url={licao.conteudo} />
                                  </div>
                                ) : licao.tipo === 'TEXTO' && licao.conteudo ? (
                                  <div className="lesson-cons-text">
                                    {licao.conteudo}
                                  </div>
                                ) : (
                                  <div className="lesson-cons-empty">
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
                  <div className="lesson-quiz-warning">
                    <b>📝 Esta aula contém um quiz</b>
                    <p className="lesson-quiz-warning-p">
                      Ao concluir, você será direcionado para responder as perguntas. Nota mínima: {current.quiz.notaMinima ?? 7}/10.
                    </p>
                  </div>
                )}
                <div className="lesson-actions">
                  {!current?.concluido ? (
                    <>
                      {current?.quiz ? (
                        <>
                          <button className="btn-primary lesson-action-btn" onClick={handleConcluir}>
                            Iniciar Quiz <i className="icon-chevron-right icon-sm" />
                          </button>
                          {!current?.obrigatorio && currentLesson < lessons.length - 1 && (
                            <button className="btn-secondary lesson-action-btn" onClick={handleAvanzar}>
                              Pular <i className="icon-chevron-right icon-sm" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button className="btn-primary lesson-action-btn" onClick={handleConcluir}>
                          Próximo <i className="icon-chevron-right icon-sm" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {currentLesson < lessons.length - 1 && (
                        <button className="btn-primary lesson-action-btn" onClick={handleAvanzar}>
                          <span>Próxima Aula</span><i className="icon-chevron-right icon-sm" />
                        </button>
                      )}
                      {isLastLesson && allCompleted && (
                        <button className="btn-primary lesson-action-btn lesson-action-btn-green" onClick={() => navigate('/modulos')}>
                          <i className="icon-check-circle icon-sm" /> Finalizar Módulo
                        </button>
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
              <div className="lesson-text">Responda todas as perguntas para concluir esta aula. Nota mínima: {current?.quiz?.notaMinima ?? 7}/10.</div>

              {quizResult && (
                <div className={`quiz-result-banner ${quizResult.passed ? 'passed' : 'failed'}`}>
                  <div className="quiz-result-header">
                    <span className="quiz-result-icon">{quizResult.passed ? '🎉' : '❌'}</span>
                    <div>
                      <h3 className="quiz-result-h3">{quizResult.passed ? 'Aprovado!' : 'Reprovado'}</h3>
                      <p className="quiz-result-sub">
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

              <div className="quiz-questions-mt" style={{ marginTop: '20px' }}>
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