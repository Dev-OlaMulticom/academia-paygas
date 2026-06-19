import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { User } from '../hooks/useAuth'
import { useToast } from '../components/Toast'

interface XPConfigPageProps {
  user: User
}

interface XPConfigItem {
  id: string
  action: string
  label: string
  points: number
  description: string | null
}

export function XPConfigPage({ user: _user }: XPConfigPageProps) {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<XPConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ points: string; label: string; description: string }>({ points: '', label: '', description: '' })

  const loadConfigs = useCallback(async () => {
    try {
      const data = await api.getXPConfig()
      setConfigs(data)
    } catch {
      setConfigs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleEdit = (config: XPConfigItem) => {
    setEditingId(config.id)
    setEditValues({
      points: String(config.points),
      label: config.label,
      description: config.description || '',
    })
  }

  const handleSave = async (action: string) => {
    const points = parseFloat(editValues.points)
    if (isNaN(points) || points < 0) {
      toast('Pontos deve ser um número válido e não negativo', 'error')
      return
    }

    try {
      await api.updateXPConfig(action, {
        points,
        label: editValues.label,
        description: editValues.description || undefined,
      })
      toast('Configuração atualizada!', 'success')
      setEditingId(null)
      loadConfigs()
    } catch (err: any) {
      toast(err.message || 'Erro ao atualizar', 'error')
    }
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Configuração de Pontos (XP)</div>
          <div className="page-subtitle">Ajuste os pontos acumulados por cada ação na plataforma</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <i className="icon-info icon-md" style={{ color: 'var(--pg-blue)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6 }}>
          <b>Como funciona:</b> Cada vez que um usuário realiza uma ação (login, abrir módulo, ver lição, completar lição),
          ele acumula pontos de XP conforme configurado abaixo. Os pontos são somados automaticamente e o nível é calculado
          com base no total: <b>Nível = XP ÷ 2000 + 1</b>. Os valores podem ser decimais (ex: 0.05).
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ação</th>
              <th>Descrição</th>
              <th>Pontos (XP)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                  Carregando...
                </td>
              </tr>
            ) : configs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                  Nenhuma configuração encontrada
                </td>
              </tr>
            ) : (
              configs.map((config) => (
                <tr key={config.id}>
                  <td>
                    {editingId === config.id ? (
                      <input
                        className="form-input"
                        style={{ width: '100%', minWidth: '180px' }}
                        value={editValues.label}
                        onChange={(e) => setEditValues({ ...editValues, label: e.target.value })}
                      />
                    ) : (
                      <>
                        <b style={{ fontSize: '13px', color: 'var(--gray-900)' }}>{config.label}</b>
                        <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{config.action}</div>
                      </>
                    )}
                  </td>
                  <td>
                    {editingId === config.id ? (
                      <input
                        className="form-input"
                        style={{ width: '100%', minWidth: '200px' }}
                        value={editValues.description}
                        placeholder="Descrição..."
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      />
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{config.description || '—'}</span>
                    )}
                  </td>
                  <td>
                    {editingId === config.id ? (
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        min="0"
                        style={{ width: '100px' }}
                        value={editValues.points}
                        onChange={(e) => setEditValues({ ...editValues, points: e.target.value })}
                      />
                    ) : (
                      <b style={{ fontSize: '16px', color: 'var(--pg-orange)' }}>{config.points}</b>
                    )}
                  </td>
                  <td>
                    {editingId === config.id ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleSave(config.action)}>
                          Salvar
                        </button>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => setEditingId(null)}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleEdit(config)}>
                        <i className="icon-pencil icon-xs" /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
