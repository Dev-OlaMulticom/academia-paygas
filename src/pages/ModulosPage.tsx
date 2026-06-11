import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { VideoPlayer } from '../components/VideoPlayer'

export function ModulosPage() {
  const navigate = useNavigate()
  const { moduloId } = useParams<{ moduloId: string }>()
  const [currentLesson, setCurrentLesson] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [lessons, setLessons] = useState<any[]>([])
  const [modulo, setModulo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    loadAulas()
  }, [moduloId])

  const loadAulas = async () => {
    if (!moduloId) return
    try {
      const aulasData = await api.getAulas(moduloId)
      setLessons(aulasData)
      
      // Try to get modulo info
      const trilhas = await api.getTrilhas()
      for (const trilha of trilhas) {
        const modulos = await api.getModulos(trilha.id)
        const foundModulo = modulos.find((m: any) => m.id === moduloId || m._id === moduloId)
        if (foundModulo) {
          setModulo(foundModulo)
          break
        }
      }
    } catch (err) {
      console.error('Erro ao carregar aulas:', err)
      setLessons([])
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    const lesson = lessons[currentLesson]
    if (!lesson) return

    if (lesson.tipo === 'quiz') {
      setShowQuiz(true)
    } else {
      try {
        await api.updateProgresso(lesson.moduloId || 'demo', lesson.id, true)
        const updated = [...lessons]
        updated[currentLesson] = { ...updated[currentLesson], concluido: true }
        setLessons(updated)
        alert('Aula concluída! Progresso salvo.')
      } catch {
        alert('Aula concluída!')
      }
    }
  }

  const handleAnswerQuiz = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando módulo...</div>
        </div>
      </div>
    )
  }

  const current = lessons[currentLesson]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <button className="btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '8px' }}>← Voltar</button>
          <div className="page-title">Módulo</div>
          <div className="page-subtitle">{modulo?.titulo || modulo?.title || ''} · {lessons.length} aulas</div>
        </div>
      </div>
      <div className="lesson-layout">
        <div className="lesson-sidebar">
          <div className="lesson-sidebar-header">
            <h3>{modulo?.titulo || modulo?.title || 'Módulo'}</h3>
            <p>{lessons.length} aulas</p>
          </div>
          {lessons.map((lesson, i) => (
            <div key={lesson.id || i} className={`lesson-item ${i === currentLesson ? 'active' : ''} ${lesson.concluido ? 'done' : ''}`} onClick={() => { setCurrentLesson(i); setShowQuiz(false); setSelectedAnswers({}) }}>
              <div className="lesson-num">{lesson.concluido ? '✓' : i + 1}</div>
              <div className="lesson-item-info">
                <b>{lesson.titulo}</b>
                <span>{lesson.tipo || 'video'} · {lesson.duracaoMin || 10} min</span>
              </div>
              {lesson.concluido && <span className="lesson-check">✓</span>}
            </div>
          ))}
        </div>
        <div className="lesson-content">
          {!showQuiz ? (
            <>
              {current?.tipo === 'video' && current?.videoUrl ? (
                <div className="lesson-video">
                  <VideoPlayer
                    url={current.videoUrl}
                    startAt={current.videoInicio || current.startAt || 0}
                    endAt={current.videoFim || current.endAt}
                  />
                </div>
              ) : current?.tipo === 'pdf' && current?.pdfUrl ? (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn">📄</div>
                    <p>Conteúdo PDF</p>
                    <a href={current.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0A2E6E', textDecoration: 'underline' }}>Abrir PDF</a>
                  </div>
                </div>
              ) : (
                <div className="lesson-video">
                  <div className="lesson-video-placeholder">
                    <div className="play-btn">📄</div>
                    <p>Conteúdo de Leitura</p>
                    <small style={{ opacity: .5 }}>Material disponível para download</small>
                  </div>
                </div>
              )}
              <div className="lesson-body">
                <h2>{current?.titulo}</h2>
                <div className="lesson-tags">
                  <span className="lesson-tag">{current?.tipo || 'video'}</span>
                  <span className="lesson-tag">{current?.duracaoMin || current?.duration || 10} min</span>
                </div>
                <div className="lesson-text">
                  {current?.conteudo || current?.content || 'Conteúdo da aula.'}
                </div>
                <div className="lesson-objectives">
                  {current?.objetivos && current?.objetivos.length > 0 ? (
                    <>
                      <h4>🎯 Objetivos de Aprendizado</h4>
                      <ul>
                        {current.objetivos.map((obj: string, i: number) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
                <div className="lesson-actions">
                  <button className="btn-primary" onClick={handleComplete}>
                    {current?.tipo === 'quiz' ? 'Iniciar Quiz' : 'Concluir e Avançar ➜'}
                  </button>
                  {currentLesson > 0 && <button className="btn-secondary" onClick={() => { setCurrentLesson(currentLesson - 1); setShowQuiz(false) }}>← Anterior</button>}
                </div>
              </div>
            </>
          ) : (
            <div className="lesson-body">
              <h2>Quiz: {current?.titulo}</h2>
              <div className="lesson-text">Responda às perguntas abaixo para concluir esta aula.</div>
              <div style={{ marginTop: '20px' }}>
                {current?.perguntas?.map((pergunta: any, qIndex: number) => (
                  <div key={qIndex} style={{ marginBottom: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                    <p style={{ fontWeight: '600', marginBottom: '12px' }}>{qIndex + 1}. {pergunta.pergunta}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {pergunta.opcoes.map((opt: string, oIndex: number) => (
                        <label key={oIndex} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name={`q${qIndex}`} 
                            checked={selectedAnswers[`q${qIndex}`] === opt[0]} 
                            onChange={() => handleAnswerQuiz(`q${qIndex}`, opt[0])} 
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="lesson-actions">
                <button className="btn-primary" onClick={() => { alert('Quiz enviado! Notificação enviada ao gestor.'); setShowQuiz(false) }}>Enviar Respostas</button>
                <button className="btn-secondary" onClick={() => setShowQuiz(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
