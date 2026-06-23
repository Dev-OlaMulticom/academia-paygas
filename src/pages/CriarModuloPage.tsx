import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'

const EMOJI_OPTIONS = ['📚', '🎓', '💪', '⭐', '🏆', '🎯', '🔥', '✅', '📖', '💡', '🚀', '🤝', '🛡️', '⛽', '🧑‍💼', '🔧', '📋', '🔑', '🏆', '🌟']

const DEFAULT_CERT_TEMPLATE = `<div style="width:800px;padding:40px;background:linear-gradient(135deg,#0A2E6E 0%,#1a4494 100%);color:white;border-radius:20px;text-align:center;font-family:Arial,sans-serif;">
  <div style="font-size:14px;letter-spacing:3px;margin-bottom:8px;">ACADEMIA PAYGAS</div>
  <div style="font-size:28px;margin-bottom:20px;">{{MODULO_ICONE}} {{MODULO_TITULO}}</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-bottom:10px;">Certificamos que</div>
  <div style="font-size:32px;font-weight:bold;margin:20px 0;border-bottom:2px solid rgba(255,255,255,0.3);padding-bottom:20px;">{{USUARIO_NOME}}</div>
  <div style="font-size:16px;margin-bottom:40px;">concluiu o módulo de <strong>{{MODULO_TITULO}}</strong> com sucesso.</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:40px;">
    <span style="font-size:13px;">{{DATA}}</span>
    <div style="width:80px;height:80px;background:#F47C20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;">PG</div>
  </div>
</div>`

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

  const renderCertPreview = (template: string) => {
    return template
      .replace(/\{\{MODULO_ICONE\}\}/g, modulo.icone || '📚')
      .replace(/\{\{MODULO_TITULO\}\}/g, modulo.titulo || 'Nome do Curso')
      .replace(/\{\{USUARIO_NOME\}\}/g, 'João da Silva')
      .replace(/\{\{DATA\}\}/g, new Date().toLocaleDateString('pt-BR'))
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <button id="btn-voltar-criar" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate('/cms')}>
            <i className="icon-arrow-left icon-sm" /> Voltar
          </button>
          <div className="page-title">Criar Novo Curso</div>
          <div className="page-subtitle">Configure as informações do curso</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>
        <div className="form-field">
          <label className="form-label">Título</label>
          <input id="criar-titulo" className="form-input" value={modulo.titulo} onChange={e => setModulo({ ...modulo, titulo: e.target.value })} placeholder="Nome do curso" required />
        </div>

        <div className="form-field">
          <label className="form-label">Ícone / Emoji</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button id="criar-icone-btn" type="button" className="btn-secondary" style={{ fontSize: '24px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              {modulo.icone}
            </button>
            {showEmojiPicker && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '8px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                {EMOJI_OPTIONS.map(em => (
                  <button key={em} type="button" style={{ fontSize: '20px', background: modulo.icone === em ? '#e3f2fd' : 'transparent', border: modulo.icone === em ? '2px solid #1976d2' : '2px solid transparent', borderRadius: '6px', cursor: 'pointer', padding: '4px' }} onClick={() => { setModulo({ ...modulo, icone: em }); setShowEmojiPicker(false) }}>
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
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Gerar Certificado Automaticamente</label>
          <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '0 0 8px' }}>
            Ativado: O certificado é gerado automaticamente ao concluir todas as aulas e quizzes do curso.
            Desativado: Requer aprovação do gestor/admin para emitir o certificado.
          </p>
          <select id="criar-auto-cert" className="form-select" value={modulo.autoCertificado ? 'true' : 'false'} onChange={e => setModulo({ ...modulo, autoCertificado: e.target.value === 'true' })}>
            <option value="false">Não (Requer aprovação)</option>
            <option value="true">Sim (Automático ao concluir)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
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
