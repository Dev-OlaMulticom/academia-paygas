import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { api } from '../lib/api'
import { useToast, useConfirm } from '../components/Toast'

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
        {[
          { val: conquistas.length, label: 'Total de Conquistas', icon: 'icon-trophy', bg: '#FEF3C7' },
          { val: totalAtivas, label: 'Ativas', icon: 'icon-check', bg: '#DCFCE7' },
          ...(!canManage ? [{ val: totalConquistadas, label: 'Conquistadas', icon: 'icon-star', bg: '#E6EEF9' }] : []),
        ].map((item, i) => (
          <div key={i} className="stat-info">
            <div className="stat-info-top">
              <div className="stat-card-icon" style={{ background: item.bg }}><i className={`${item.icon} icon-lg`} /></div>
              <div className="stat-card-val">{item.val}</div>
            </div>
            <div className="stat-card-label">{item.label}</div>
          </div>
        ))}
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
              <div className="trophy-icon conq-trophy-icon">{c.icone}</div>
              <div className="trophy-name">{c.titulo}</div>
              <div className="trophy-desc">{c.descricao}</div>

              <div className="conq-meta">
                <span className="conq-meta-item"><span className="conq-meta-orange">{c.pontosMinimos}</span> pts</span>
                <span className="conq-meta-item"><span className="conq-meta-green">+{c.xpRecompensa}</span> XP</span>
              </div>

              {c.earned && (
                <div className="conq-earned-badge" style={{ color: c.cor }}>
                  <i className="icon-check-circle icon-xs" /> Conquistado
                  {c.dataConquista && (
                    <span className="conq-earned-date">· {new Date(c.dataConquista).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              )}

              {!c.earned && !canManage && (
                <div className="conq-progress">
                  <div className="conq-progress-header">
                    <span>{c.progresso || 0}% concluido</span>
                    <span>{c.pontosMinimos} pts</span>
                  </div>
                  <div className="conq-progress-bar">
                    <div className="conq-progress-fill" style={{ width: `${Math.min(c.progresso || 0, 100)}%`, background: c.cor }} />
                  </div>
                </div>
              )}

              {canManage && (
                <div className="conq-card-actions">
                  <button className="btn-secondary conq-btn-sm" onClick={() => openEdit(c)}>
                    <i className="icon-pencil icon-xs" /> Editar
                  </button>
                  <button className={`btn-secondary conq-btn-toggle ${c.ativo ? 'inactive' : 'active'}`} onClick={() => toggleAtivo(c)}>
                    {c.ativo ? <><i className="icon-pause icon-xs" /> Desativar</> : <><i className="icon-play icon-xs" /> Ativar</>}
                  </button>
                  {isAdmin && (
                    <button className="btn-secondary conq-btn-delete" onClick={() => handleDelete(c)}>
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
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{editing ? 'Editar Conquista' : 'Nova Conquista'}</h3>

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
              <div className="conq-icon-grid">
                {ICONES.map(icon => (
                  <button key={icon} className={`conq-icon-btn ${form.icone === icon ? 'selected' : ''}`} onClick={() => setForm({ ...form, icone: icon })}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Cor</label>
              <div className="conq-color-grid">
                {CORES.map(color => (
                  <button key={color} className={`conq-color-btn ${form.cor === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => setForm({ ...form, cor: color })} />
                ))}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label">Pontos Minimos</label>
                <input className="form-input" type="number" min="0" value={form.pontosMinimos} onChange={e => setForm({ ...form, pontosMinimos: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-field">
                <label className="form-label">XP Recompensa</label>
                <input className="form-input" type="number" min="0" value={form.xpRecompensa} onChange={e => setForm({ ...form, xpRecompensa: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="form-grid-2">
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

            <div className="modal-footer">
              <button className="btn-primary" onClick={handleSave}>{editing ? 'Salvar' : 'Criar'}</button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
