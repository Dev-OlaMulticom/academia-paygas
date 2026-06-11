import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ModulosPage() {
  const navigate = useNavigate()
  const [currentLesson, setCurrentLesson] = useState(3)
  const [showQuiz, setShowQuiz] = useState(false)

  const lessons = [
    { title: 'Fundamentos do Atendimento', type: 'video', duration: '8 min', done: true, videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', videoInicio: 0, videoFim: 480 },
    { title: 'Comunicação Eficaz', type: 'video', duration: '10 min', done: true, videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', videoInicio: 480, videoFim: 1080 },
    { title: 'Resolução de Conflitos', type: 'leitura', duration: '12 min', done: true },
    { title: 'Cashback: Como Explicar ao Cliente', type: 'video', duration: '7 min', done: false, active: true, videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', videoInicio: 1080, videoFim: 1500 },
    { title: 'Avaliação de Desempenho', type: 'quiz', duration: '10 min', done: false },
    { title: 'Certificação — Atendimento', type: 'cert', duration: '5 min', done: false }
  ]

  const handleComplete = () => {
    if (lessons[currentLesson].type === 'quiz') {
      setShowQuiz(true)
    } else {
      alert('Aula concluída! Notificação enviada ao gestor para aprovação do certificado.')
    }
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Módulo</div>
          <div className="page-subtitle">Excelência no Atendimento · 6 aulas</div>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/trilhas')}>← Voltar às Trilhas</button>
      </div>
      <div className="lesson-layout">
        <div className="lesson-sidebar">
          <div className="lesson-sidebar-header">
            <h3>Excelência no Atendimento</h3>
            <p>6 aulas · Técnicas de atendimento e satisfação do cliente</p>
          </div>
          {lessons.map((lesson, i) => (
            <div key={i} className={`lesson-item ${i === currentLesson ? 'active' : ''} ${lesson.done ? 'done' : ''}`} onClick={() => setCurrentLesson(i)}>
              <div className="lesson-num">{lesson.done ? '✓' : i + 1}</div>
              <div className="lesson-item-info">
                <b>{lesson.title}</b>
                <span>{lesson.type} · {lesson.duration}</span>
              </div>
              {lesson.done && <span className="lesson-check">✓</span>}
            </div>
          ))}
        </div>
        <div className="lesson-content">
          {!showQuiz ? (
            <>
              {lessons[currentLesson].videoUrl ? (
                <div className="lesson-video">
                  <iframe
                    width="100%"
                    height="400"
                    src={`${lessons[currentLesson].videoUrl}?start=${lessons[currentLesson].videoInicio || 0}&end=${lessons[currentLesson].videoFim || ''}&autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
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
                <h2>{lessons[currentLesson].title}</h2>
                <div className="lesson-tags">
                  <span className="lesson-tag">{lessons[currentLesson].type}</span>
                  <span className="lesson-tag">{lessons[currentLesson].duration}</span>
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
                    {lessons[currentLesson].type === 'quiz' ? 'Iniciar Quiz' : 'Concluir e Avançar ➜'}
                  </button>
                  {currentLesson > 0 && <button className="btn-secondary" onClick={() => setCurrentLesson(currentLesson - 1)}>← Anterior</button>}
                </div>
              </div>
            </>
          ) : (
            <div className="lesson-body">
              <h2>Quiz: {lessons[currentLesson].title}</h2>
              <div className="lesson-text">
                Responda às perguntas abaixo para concluir esta aula.
              </div>
              <div style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '12px' }}>1. Qual é o principal objetivo do atendimento ao cliente?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="radio" name="q1" /> A) Maximizar as vendas
                    </label>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="radio" name="q1" /> B) Garantir a satisfação do cliente
                    </label>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="radio" name="q1" /> C) Processar pagamentos rapidamente
                    </label>
                  </div>
                </div>
                <div style={{ marginBottom: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '12px' }}>2. Como lidar com clientes insatisfeitos?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="radio" name="q2" /> A) Ignorar e atender o próximo cliente
                    </label>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="radio" name="q2" /> B) Ouvir ativamente e buscar solução
                    </label>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="radio" name="q2" /> C) Argumentar que o cliente está errado
                    </label>
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
