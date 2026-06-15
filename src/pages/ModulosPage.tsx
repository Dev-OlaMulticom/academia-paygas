import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { VideoPlayer } from '../components/VideoPlayer'

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
  const [currentLesson, setCurrentLesson] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [lessons, setLessons] = useState<any[]>([])
  const [modulo, setModulo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [allModulos, setAllModulos] = useState<any[]>([])

  useEffect(() => {
    loadModulo()
  }, [moduloNombre])

  const loadModulo = async () => {
    if (!moduloNombre) return
    try {
      const allMods = await api.getCmsModulos()
      setAllModulos(allMods)
      const foundModulo = allMods.find((m: any) => slugify(m.titulo || m.title || '') === moduloNombre)
      if (foundModulo) {
        setModulo(foundModulo)
        const aulasData = await api.getAulas(foundModulo.id)
        setLessons(aulasData)
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
    } catch {
      const updated = [...lessons]
      updated[currentLesson] = { ...updated[currentLesson], concluido: true }
      setLessons(updated)
    }

    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1)
      setShowQuiz(false)
      setSelectedAnswers({})
      setQuizSubmitted(false)
      setQuizResult(null)
    }
  }

  const handleAvanzar = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1)
      setShowQuiz(false)
      setSelectedAnswers({})
      setQuizSubmitted(false)
      setQuizResult(null)
    }
  }

  const handleAnswerQuiz = (questionId: string, answer: string) => {
    if (quizSubmitted) return
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmitQuiz = async () => {
    const lesson = lessons[currentLesson]
    if (!lesson?.quiz) return

    let correct = 0
    const total = lesson.quiz.perguntas.length
    lesson.quiz.perguntas.forEach((p: any) => {
      if (selectedAnswers[p.id] === p.correta) correct++
    })

    const nota = Math.round((correct / total) * 10)
    const result = { nota, total, correct, passed: nota >= 7 }

    setQuizResult(result)
    setQuizSubmitted(true)

    try {
      await api.updateProgresso(modulo!.id, lesson.id, true)
      const updated = [...lessons]
      updated[currentLesson] = { ...updated[currentLesson], concluido: true }
      setLessons(updated)
    } catch {}
  }

  const isLastLesson = currentLesson === lessons.length - 1
  const current = lessons[currentLesson]

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando módulo...</div>
        </div>
      </div>
    )
  }

  if (!modulo) {
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate('/trilhas-aprendizado')}><i className="icon-arrow-left icon-sm" /> Voltar às Trilhas</button>
            <div className="page-title">Módulo não encontrado</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate(-1)}><i className="icon-arrow-left icon-sm" /> Voltar</button>
          <div className="page-title">{modulo.titulo}</div>
          <div className="page-subtitle">{lessons.length} aulas</div>
        </div>
      </div>
      <div className="lesson-layout">
        <div className="lesson-sidebar">
          <div className="lesson-sidebar-header">
            <h3>{modulo.titulo}</h3>
            <p>{lessons.length} aulas</p>
          </div>
          {lessons.map((lesson, i) => (
            <div key={lesson.id || i} className={`lesson-item ${i === currentLesson ? 'active' : ''} ${lesson.concluido ? 'done' : ''}`} onClick={() => { setCurrentLesson(i); setShowQuiz(false); setSelectedAnswers({}); setQuizSubmitted(false); setQuizResult(null) }}>
              <div className="lesson-num">{lesson.concluido ? <i className="icon-check icon-sm" /> : i + 1}</div>
              <div className="lesson-item-info">
                <b>{lesson.titulo}</b>
                <span>{lesson.quiz ? 'Quiz' : (lesson.videoUrl ? 'Vídeo' : 'PDF')} · {lesson.duracaoMin || 10} min</span>
              </div>
              {lesson.concluido && <span className="lesson-check"><i className="icon-check icon-sm" /></span>}
            </div>
          ))}
          {lessons.length > 0 && lessons.every((l: any) => l.concluido) && (
            <div style={{ padding: '16px', textAlign: 'center', background: '#E8F5E9', borderRadius: '8px', marginTop: '12px' }}>
              <i className="icon-check-circle icon-lg" style={{ color: '#2E7D32' }} />
              <p style={{ color: '#2E7D32', fontWeight: 600, marginTop: '8px' }}>Módulo Concluído!</p>
            </div>
          )}
        </div>
        <div className="lesson-content">
          {!showQuiz ? (
            <>
              {current?.videoUrl ? (
                <div className="lesson-video">
                  <VideoPlayer
                    url={current.videoUrl}
                    startAt={current.videoInicio || current.startAt || 0}
                    endAt={current.videoFim || current.endAt}
                  />
                </div>
              ) : (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn"><i className="icon-file-text icon-xl" /></div>
                    <p>Conteúdo PDF</p>
                    <small style={{ opacity: .5 }}>{current?.titulo || 'Material de leitura'}</small>
                  </div>
                </div>
              )}
              <div className="lesson-body">
                <h2>{current?.titulo}</h2>
                <div className="lesson-tags">
                  <span className="lesson-tag">{current?.videoUrl ? 'Vídeo' : 'PDF'}</span>
                  <span className="lesson-tag">{current?.duracaoMin || current?.duration || 10} min</span>
                  {current?.concluido && <span className="lesson-tag" style={{ background: '#E8F5E9', color: '#2E7D32' }}>✓ Concluído</span>}
                </div>
                <div className="lesson-text">
                  {current?.descricao || current?.conteudo || current?.content || 'Conteúdo da aula.'}
                </div>
                {current?.quiz && (
                  <div style={{ padding: '12px 16px', background: '#FFF3E0', borderRadius: '8px', borderLeft: '4px solid #FF9800', marginBottom: '16px' }}>
                    <b>📝 Esta aula contém um quiz</b>
                    <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: '4px 0 0' }}>
                      Ao concluir, você será direcionado para responder as perguntas.
                    </p>
                  </div>
                )}
                <div className="lesson-actions">
                  {!current?.concluido ? (
                    <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handleConcluir}>
                      {current?.quiz ? 'Iniciar Quiz' : 'Concluir e Avançar'}
                      {!current?.quiz && <i className="icon-chevron-right icon-sm" />}
                    </button>
                  ) : (
                    <>
                      {currentLesson < lessons.length - 1 && (
                        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handleAvanzar}>
                          <span>Próxima Aula</span><i className="icon-chevron-right icon-sm" />
                        </button>
                      )}
                    </>
                  )}
                  {currentLesson > 0 && (
                    <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => { setCurrentLesson(currentLesson - 1); setShowQuiz(false); setSelectedAnswers({}); setQuizSubmitted(false); setQuizResult(null) }}>
                      <i className="icon-arrow-left icon-sm" /> Anterior
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="lesson-body">
              <h2>Quiz: {current?.titulo}</h2>
              <div className="lesson-text">Responda às perguntas abaixo para concluir esta aula.</div>

              {quizResult && (
                <div style={{ padding: '16px', borderRadius: '8px', marginTop: '16px', marginBottom: '16px', background: quizResult.passed ? '#E8F5E9' : '#FFEBEE', color: quizResult.passed ? '#1B5E20' : '#B71C1C' }}>
                  <h3 style={{ margin: 0 }}>{quizResult.passed ? '🎉 Aprovado!' : '❌ Reprovado'}</h3>
                  <p style={{ margin: '8px 0 0' }}>Nota: {quizResult.nota}/10 ({quizResult.correct}/{quizResult.total} corretas)</p>
                  {!quizResult.passed && (
                    <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={() => { setQuizSubmitted(false); setQuizResult(null); setSelectedAnswers({}) }}>
                      Tentar Novamente
                    </button>
                  )}
                  {quizResult.passed && (
                    <button className="btn-primary" style={{ marginTop: '12px' }} onClick={() => {
                      setShowQuiz(false)
                      setQuizSubmitted(false)
                      setQuizResult(null)
                      if (currentLesson < lessons.length - 1) {
                        setCurrentLesson(currentLesson + 1)
                      }
                    }}>
                      {currentLesson < lessons.length - 1 ? 'Avançar para Próxima Aula' : 'Finalizar'}
                    </button>
                  )}
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
                          <label key={oIndex} style={{
                            display: 'flex', gap: '8px', alignItems: 'center', cursor: quizSubmitted ? 'default' : 'pointer',
                            padding: '8px 12px', borderRadius: '6px',
                            background: isCorrect ? '#E8F5E9' : isWrong ? '#FFEBEE' : isSelected ? '#E3F2FD' : '#fff',
                            border: `1px solid ${isCorrect ? '#4CAF50' : isWrong ? '#F44336' : isSelected ? '#2196F3' : '#e0e0e0'}`,
                          }}>
                            <input
                              type="radio"
                              name={`q${pergunta.id}`}
                              checked={isSelected}
                              onChange={() => handleAnswerQuiz(pergunta.id, letter)}
                              disabled={quizSubmitted}
                            />
                            {letter}. {opt}
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
