import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'

interface CriarModuloPageProps {
  user: any
}

export function CriarModuloPage(_props: CriarModuloPageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [modulo, setModulo] = useState({
    titulo: '',
    descricao: '',
    obrigatorio: false,
    autoCertificado: false
  })
  const [loading, setLoading] = useState(false)

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
          <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} onClick={() => navigate('/cms')}>
            <i className="icon-arrow-left icon-sm" /> Voltar
          </button>
          <div className="page-title">Criar Novo Curso</div>
          <div className="page-subtitle">Configure as informações do curso</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div className="form-field">
          <label className="form-label">Título</label>
          <input
            className="form-input"
            value={modulo.titulo}
            onChange={e => setModulo({ ...modulo, titulo: e.target.value })}
            placeholder="Nome do curso"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-input"
            value={modulo.descricao}
            onChange={e => setModulo({ ...modulo, descricao: e.target.value })}
            placeholder="Descrição do curso"
            rows={4}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Obrigatório</label>
          <select
            className="form-select"
            value={modulo.obrigatorio ? 'true' : 'false'}
            onChange={e => setModulo({ ...modulo, obrigatorio: e.target.value === 'true' })}
          >
            <option value="false">Não</option>
            <option value="true">Sim — Usuários devem concluir este módulo</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Gerar Certificado Automaticamente
          </label>
          <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '0 0 8px' }}>
            Ativado: O certificado é gerado automaticamente ao concluir todas as aulas e quizzes do curso.
            Desativado: Requer aprovação do gestor/admin para emitir o certificado.
          </p>
          <select
            className="form-select"
            value={modulo.autoCertificado ? 'true' : 'false'}
            onChange={e => setModulo({ ...modulo, autoCertificado: e.target.value === 'true' })}
          >
            <option value="false">Não (Requer aprovação)</option>
            <option value="true">Sim (Automático ao concluir)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Curso'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/cms')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
