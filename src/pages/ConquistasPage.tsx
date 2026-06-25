import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { useToast, useConfirm } from '../components/Toast'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const ICONES = ['🏆', '🎯', '🚀', '⭐', '👑', '🔥', '📊', '🤝', '💎', '🎖️', '🏅', '⚡', '🌟', '🎓', '💪']
const CORES = ['#F47C20', '#16A34A', '#0A2E6E', '#DC2626', '#8B5CF6', '#06B6D4', '#EC4899', '#D97706', '#14B8A6', '#3B82F6']

interface ConquistaData {
  id: string
  titulo: string
  descricao: string
  icone: string
  cor: string
  pontosMinimos: number
  xpRecompensa: number
  ativo: boolean
  ordem: number
  earned?: boolean
  dataConquista?: string | null
  progresso?: number
  disponivel?: boolean
}

interface ConquistasPageProps {
  user: User
}

export function ConquistasPage({ user }: ConquistasPageProps) {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [conquistas, setConquistas] = useState<ConquistaData[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ConquistaData | null>(null)
  const [form, setForm] = useState({
    titulo: '', descricao: '', icone: '🏆', cor: '#F47C20',
    pontosMinimos: 0, xpRecompensa: 0, ativo: true, ordem: 0,
  })

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const canManage = isAdmin || isGestor

  const load = async () => {
    try {
      const data = await api.getConquistas()
      setConquistas(data)
    } catch {
      setConquistas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ titulo: '', descricao: '', icone: '🏆', cor: '#F47C20', pontosMinimos: 0, xpRecompensa: 0, ativo: true, ordem: 0 })
    setShowModal(true)
  }

  const openEdit = (c: ConquistaData) => {
    setEditing(c)
    setForm({
      titulo: c.titulo, descricao: c.descricao, icone: c.icone, cor: c.cor,
      pontosMinimos: c.pontosMinimos, xpRecompensa: c.xpRecompensa, ativo: c.ativo, ordem: c.ordem,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      toast('Preencha titulo e descricao!', 'info')
      return
    }
    try {
      if (editing) {
        await api.updateConquista(editing.id, form)
        toast('Conquista atualizada!', 'success')
      } else {
        await api.createConquista(form)
        toast('Conquista criada!', 'success')
      }
      setShowModal(false)
      load()
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar conquista', 'error')
    }
  }

  const handleDelete = async (c: ConquistaData) => {
    const ok = await confirm({
      title: 'Excluir conquista',
      message: `Excluir "${c.titulo}"? Todos os usuarios que a conquistaram perderao o registro.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      await api.deleteConquista(c.id)
      toast('Conquista excluida!', 'success')
      load()
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir', 'error')
    }
  }

  const toggleAtivo = async (c: ConquistaData) => {
    try {
      await api.updateConquista(c.id, { ativo: !c.ativo })
      toast(c.ativo ? 'Conquista desativada' : 'Conquista ativada', 'success')
      load()
    } catch (err: any) {
      toast(err.message || 'Erro ao alterar status', 'error')
    }
  }

  const totalAtivas = conquistas.filter(c => c.ativo).length
  const totalConquistadas = conquistas.filter(c => c.earned).length

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Conquistas</div>
            <div className="page-subtitle">Carregando...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Conquistas</div>
          <div className="page-subtitle">
            {canManage ? 'Gerencie as conquistas e premios da plataforma' : 'Desbloqueie conquistas acumulando pontos'}
          </div>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>+ Nova Conquista</button>
        )}
      </div>

      <div className="cards-grid">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-icon" style={{ background: '#FEF3C7' }}><i className="icon-trophy icon-lg" /></div>
              <div className="stat-card-val">{conquistas.length}</div>
              <div className="stat-card-label">Total de Conquistas</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Quantidade total de conquistas disponiveis no sistema</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-icon" style={{ background: '#DCFCE7' }}><i className="icon-check icon-lg" /></div>
              <div className="stat-card-val">{totalAtivas}</div>
              <div className="stat-card-label">Ativas</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Conquistas ativas que podem ser desbloqueadas</TooltipContent>
        </Tooltip>
        {!canManage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="stat-card stat-card--static">
                <span className="stat-card-info">i</span>
                <div className="stat-card-icon" style={{ background: '#E6EEF9' }}><i className="icon-star icon-lg" /></div>
                <div className="stat-card-val">{totalConquistadas}</div>
                <div className="stat-card-label">Conquistadas</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Conquistas que voce ja desbloqueou</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="trophy-grid">
        {conquistas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <p>{canManage ? 'Nenhuma conquista configurada. Crie a primeira!' : 'Nenhuma conquista disponivel ainda.'}</p>
          </div>
        ) : (
          conquistas.map(c => (
            <div
              key={c.id}
              className={`trophy-card ${c.earned ? 'earned' : 'locked'}`}
              style={{ borderColor: c.earned ? c.cor : undefined, opacity: !canManage && !c.ativo ? 0.5 : 1 }}
            >
              <div className="trophy-icon" style={{ fontSize: '32px' }}>{c.icone}</div>
              <div className="trophy-name">{c.titulo}</div>
              <div className="trophy-desc">{c.descricao}</div>

              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--gray-400)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ color: 'var(--pg-orange)' }}>{c.pontosMinimos}</span> pts
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ color: 'var(--pg-green)' }}>+{c.xpRecompensa}</span> XP
                </span>
              </div>

              {c.earned && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: c.cor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="icon-check-circle icon-xs" /> Conquistado
                  {c.dataConquista && (
                    <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>
                      · {new Date(c.dataConquista).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              )}

              {!c.earned && !canManage && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--gray-400)', marginBottom: '3px' }}>
                    <span>{c.progresso || 0}% concluido</span>
                    <span>{c.pontosMinimos} pts</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--gray-200)', borderRadius: '2px' }}>
                    <div style={{ width: `${Math.min(c.progresso || 0, 100)}%`, height: '100%', background: c.cor, borderRadius: '2px', transition: 'width .3s' }} />
                  </div>
                </div>
              )}

              {canManage && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    onClick={() => openEdit(c)}
                  >
                    <i className="icon-pencil icon-xs" /> Editar
                  </button>
                  <button
                    className="btn-secondary"
                    style={{
                      padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px',
                      color: c.ativo ? '#D97706' : '#16A34A', borderColor: c.ativo ? '#D97706' : '#16A34A',
                    }}
                    onClick={() => toggleAtivo(c)}
                  >
                    {c.ativo ? <><i className="icon-pause icon-xs" /> Desativar</> : <><i className="icon-play icon-xs" /> Ativar</>}
                  </button>
                  {isAdmin && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => handleDelete(c)}
                    >
                      <i className="icon-trash-2 icon-xs" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '480px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '16px' }}>{editing ? 'Editar Conquista' : 'Nova Conquista'}</h3>

            <div className="form-field">
              <label className="form-label">Titulo *</label>
              <input className="form-input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Primeiro Passo" />
            </div>

            <div className="form-field">
              <label className="form-label">Descricao *</label>
              <input className="form-input" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Complete sua primeira aula" />
            </div>

            <div className="form-field">
              <label className="form-label">Icone</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ICONES.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm({ ...form, icone: icon })}
                    style={{
                      width: '36px', height: '36px', fontSize: '18px', border: `2px solid ${form.icone === icon ? 'var(--pg-orange)' : 'var(--gray-200)'}`,
                      borderRadius: '8px', background: form.icone === icon ? 'var(--pg-orange-lt)' : '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Cor</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CORES.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, cor: color })}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: color, cursor: 'pointer',
                      border: `3px solid ${form.cor === color ? 'var(--gray-800)' : 'transparent'}`,
                      boxShadow: form.cor === color ? '0 0 0 2px #fff, 0 0 0 4px var(--gray-400)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field">
                <label className="form-label">Pontos Minimos</label>
                <input className="form-input" type="number" min="0" value={form.pontosMinimos} onChange={e => setForm({ ...form, pontosMinimos: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-field">
                <label className="form-label">XP Recompensa</label>
                <input className="form-input" type="number" min="0" value={form.xpRecompensa} onChange={e => setForm({ ...form, xpRecompensa: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field">
                <label className="form-label">Ordem</label>
                <input className="form-input" type="number" min="0" value={form.ordem} onChange={e => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.ativo ? 'true' : 'false'} onChange={e => setForm({ ...form, ativo: e.target.value === 'true' })}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Salvar' : 'Criar'}</button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
