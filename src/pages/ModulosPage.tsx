import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { VideoPlayer } from '../components/VideoPlayer'

export function ModulosPage() {
  const navigate = useNavigate()
  const [currentLesson, setCurrentLesson] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    loadAulas()
  }, [])

  const loadAulas = async () => {
    try {
      // For demo, load from first trilha's first modulo
      const trilhas = await api.getTrilhas()
      if (trilhas.length > 0) {
        const modulos = await api.getModulos(trilhas[0].id)
        if (modulos.length > 0 && modulos[0].aulas) {
          setLessons(modulos[0].aulas)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar aulas:', err)
      // Fallback to mock data
      setLessons([
        { id: '1', titulo: 'Fundamentos do Atendimento', tipo: 'video', duracaoMin: 8, concluido: true, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoInicio: 0, videoFim: 480 },
        { id: '2', titulo: 'Comunicação Eficaz', tipo: 'video', duracaoMin: 10, concluido: true, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoInicio: 480, videoFim: 1080 },
        { id: '3', titulo: 'Resolução de Conflitos', tipo: 'leitura', duracaoMin: 12, concluido: true },
        { id: '4', titulo: 'Cashback: Como Explicar ao Cliente', tipo: 'video', duracaoMin: 7, concluido: false, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoInicio: 1080, videoFim: 1500 },
        { id: '5', titulo: 'Avaliação de Desempenho', tipo: 'quiz', duracaoMin: 10, concluido: false },
        { id: '6', titulo: 'Certificação — Atendimento', tipo: 'cert', duracaoMin: 5, concluido: false },
      ])
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
          <div className="page-title">Módulo</div>
          <div className="page-subtitle">Excelência no Atendimento · {lessons.length} aulas</div>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/trilhas')}>← Voltar às Trilhas</button>
      </div>
      <div className="lesson-layout">
        <div className="lesson-sidebar">
          <div className="lesson-sidebar-header">
            <h3>Excelência no Atendimento</h3>
            <p>{lessons.length} aulas · Técnicas de atendimento</p>
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
              {current?.videoUrl ? (
                <div className="lesson-video">
                  <VideoPlayer
                    url={current.videoUrl}
                    startAt={current.videoInicio || 0}
                    endAt={current.videoFim}
                  />
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
                  <span className="lesson-tag">{current?.duracaoMin || 10} min</span>
                  <span className="lesson-tag" style={{ background: 'var(--pg-red-lt)', color: 'var(--pg-red)' }}>Obrigatória</span>
                </div>
                <div className="lesson-text">
                  O atendimento de qualidade começa com empatia, clareza e agilidade. Nesta aula você aprende os pilares fundamentais para encantar o cliente no posto de combustível.
                </div>
                <div className="lesson-objectives">
                  <h4>🎯 Objetivos de Aprendizado</h4>
                  <ul>
                    <li>Compreender os conceitos fundamentais desta aula</li>
                    <li>Aplicar o conhecimento na rotina diária</li>
                    <li>Identificar situações práticas de uso</li>
                  </ul>
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
                <div style={{ marginBottom: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '12px' }}>1. Qual é o principal objetivo do atendimento ao cliente?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['A) Maximizar as vendas', 'B) Garantir a satisfação do cliente', 'C) Processar pagamentos rapidamente'].map(opt => (
                      <label key={opt} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="radio" name="q1" checked={selectedAnswers['q1'] === opt[0]} onChange={() => handleAnswerQuiz('q1', opt[0])} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '12px' }}>2. Como lidar com clientes insatisfeitos?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['A) Ignorar e atender o próximo cliente', 'B) Ouvir ativamente e buscar solução', 'C) Argumentar que o cliente está errado'].map(opt => (
                      <label key={opt} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="radio" name="q2" checked={selectedAnswers['q2'] === opt[0]} onChange={() => handleAnswerQuiz('q2', opt[0])} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
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
