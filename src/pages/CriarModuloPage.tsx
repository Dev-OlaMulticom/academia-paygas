import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'

const EMOJI_OPTIONS = ['📚', '🎓', '💪', '⭐', '🏆', '🎯', '🔥', '✅', '📖', '💡', '🚀', '🤝', '🛡️', '⛽', '🧑‍💼', '🔧', '📋', '🔑', '🏆', '🌟']

interface CriarModuloPageProps {
  user: any
}

export function CriarModuloPage(_props: CriarModuloPageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [modulo, setModulo] = useState({
    titulo: '',
    descricao: '',
    icone: '📚',
    obrigatorio: false,
    autoCertificado: false,
  })
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modulo.titulo) {
      toast('Título é obrigatório!', 'info')
      return
    }
    setLoading(true)
    try {
      await api.createModulo(modulo)
      toast('Curso criado com sucesso!', 'success')
      navigate('/cms')
    } catch (err: any) {
      toast(err.message || 'Erro ao criar curso', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <button id="btn-voltar-criar" className="btn-secondary back-btn" onClick={() => navigate('/cms')}>
            <i className="icon-arrow-left icon-sm" /> Voltar
          </button>
          <div className="page-title">Criar Novo Curso</div>
          <div className="page-subtitle">Configure as informações do curso</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="criar-form">
        <div className="form-field">
          <label className="form-label">Título</label>
          <input id="criar-titulo" className="form-input" value={modulo.titulo} onChange={e => setModulo({ ...modulo, titulo: e.target.value })} placeholder="Nome do curso" required />
        </div>

        <div className="form-field">
          <label className="form-label">Ícone / Emoji</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button id="criar-icone-btn" type="button" className="btn-secondary criar-emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              {modulo.icone}
            </button>
            {showEmojiPicker && (
              <div className="criar-emoji-picker">
                {EMOJI_OPTIONS.map(em => (
                  <button key={em} type="button" className={`criar-emoji-opt ${modulo.icone === em ? 'selected' : 'default'}`} onClick={() => { setModulo({ ...modulo, icone: em }); setShowEmojiPicker(false) }}>
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Descrição</label>
          <textarea id="criar-descricao" className="form-input" value={modulo.descricao} onChange={e => setModulo({ ...modulo, descricao: e.target.value })} placeholder="Descrição do curso" rows={4} />
        </div>

        <div className="form-field">
          <label className="form-label">Obrigatório</label>
          <select id="criar-obrigatorio" className="form-select" value={modulo.obrigatorio ? 'true' : 'false'} onChange={e => setModulo({ ...modulo, obrigatorio: e.target.value === 'true' })}>
            <option value="false">Não</option>
            <option value="true">Sim — Usuários devem concluir este módulo</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label criar-label-flex">Gerar Certificado Automaticamente</label>
          <p className="criar-hint">
            Ativado: O certificado é gerado automaticamente ao concluir todas as aulas e quizzes do curso.
            Desativado: Requer aprovação do gestor/admin para emitir o certificado.
          </p>
          <select id="criar-auto-cert" className="form-select" value={modulo.autoCertificado ? 'true' : 'false'} onChange={e => setModulo({ ...modulo, autoCertificado: e.target.value === 'true' })}>
            <option value="false">Não (Requer aprovação)</option>
            <option value="true">Sim (Automático ao concluir)</option>
          </select>
        </div>

        <div className="criar-actions">
          <button id="criar-submit" type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Curso'}
          </button>
          <button id="criar-cancelar" type="button" className="btn-secondary" onClick={() => navigate('/cms')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}