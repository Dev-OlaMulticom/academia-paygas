import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface CriarModuloPageProps {
  user: any
}

export function CriarModuloPage({ user }: CriarModuloPageProps) {
  const navigate = useNavigate()
  const [modulo, setModulo] = useState({
    titulo: '',
    descricao: '',
    obrigatorio: false,
    disponivelParaTodos: true,
    disponivelParaGestores: [] as string[],
    autoCertificado: false
  })
  const [gestores, setGestores] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadGestores()
  }, [])

  const loadGestores = async () => {
    try {
      const users = await api.getUsuarios()
      setGestores(users.filter((u: any) => u.role === 'GESTOR'))
    } catch {
      setGestores([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modulo.titulo) {
      alert('Título é obrigatório!')
      return
    }
    setLoading(true)
    try {
      await api.createModulo(modulo)
      alert('Módulo criado com sucesso!')
      navigate('/cms')
    } catch (err: any) {
      alert(err.message || 'Erro ao criar módulo')
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
          <div className="page-title">Criar Novo Módulo</div>
          <div className="page-subtitle">Configure as informações do módulo de aprendizado</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div className="form-field">
          <label className="form-label">Título</label>
          <input
            className="form-input"
            value={modulo.titulo}
            onChange={e => setModulo({ ...modulo, titulo: e.target.value })}
            placeholder="Nome do módulo"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-input"
            value={modulo.descricao}
            onChange={e => setModulo({ ...modulo, descricao: e.target.value })}
            placeholder="Descrição do módulo"
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
            <option value="true">Sim</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Disponibilidade</label>
          <select
            className="form-select"
            value={modulo.disponivelParaTodos ? 'todos' : 'especificos'}
            onChange={e => setModulo({ ...modulo, disponivelParaTodos: e.target.value === 'todos', disponivelParaGestores: [] })}
          >
            <option value="todos">Todos os usuários</option>
            <option value="especificos">Gestores específicos</option>
          </select>
        </div>

        {!modulo.disponivelParaTodos && (
          <div className="form-field">
            <label className="form-label">Gestores Permitidos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              {gestores.length > 0 ? (
                gestores.map((gestor) => (
                  <label key={gestor.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={modulo.disponivelParaGestores.includes(gestor.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setModulo({ ...modulo, disponivelParaGestores: [...modulo.disponivelParaGestores, gestor.id] })
                        } else {
                          setModulo({ ...modulo, disponivelParaGestores: modulo.disponivelParaGestores.filter((id: string) => id !== gestor.id) })
                        }
                      }}
                    />
                    <span>{gestor.nome}</span>
                  </label>
                ))
              ) : (
                <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Nenhum gestor encontrado</span>
              )}
            </div>
          </div>
        )}

        <div className="form-field">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Gerar Certificado Automaticamente
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <i className="icon-info icon-sm" style={{ color: 'var(--gray-400)', cursor: 'help' }} />
              <span style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--gray-800)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                opacity: 0,
                visibility: 'hidden',
                transition: 'opacity 0.2s, visibility 0.2s',
                marginBottom: '8px',
                zIndex: 100
              }} className="tooltip-content">
                Ativado: O certificado é gerado automaticamente ao concluir a avaliação
                <br />
                Desativado: O gestor do posto deve aprovar antes de gerar o certificado
              </span>
            </span>
          </label>
          <select
            className="form-select"
            value={modulo.autoCertificado ? 'true' : 'false'}
            onChange={e => setModulo({ ...modulo, autoCertificado: e.target.value === 'true' })}
          >
            <option value="false">Não (Requer aprovação do gestor)</option>
            <option value="true">Sim (Automático ao concluir)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Módulo'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/cms')}>
            Cancelar
          </button>
        </div>
      </form>

      <style>{`
        .tooltip-content:hover {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .icon-info:hover + .tooltip-content {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>
    </div>
  )
}
