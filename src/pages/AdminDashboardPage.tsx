import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { User } from '../hooks/useAuth'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface AdminDashboardPageProps {
  user: User
}

export function AdminDashboardPage({ user: _user }: AdminDashboardPageProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'resumo' | 'acessos' | 'atividades' | 'cursos' | 'email'>('resumo')
  const [emailForm, setEmailForm] = useState({ userId: '', assunto: '', mensagem: '' })
  const [sending, setSending] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashData, usersData] = await Promise.all([
        api.getAdminDashboard(),
        api.getUsuarios(),
      ])
      setData(dashData)
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSendEmail = async () => {
    if (!emailForm.userId || !emailForm.assunto || !emailForm.mensagem) {
      setEmailMsg('Preencha todos os campos')
      return
    }
    setSending(true)
    setEmailMsg('')
    try {
      const result = await api.sendCustomEmail(emailForm.userId, emailForm.assunto, emailForm.mensagem)
      setEmailMsg(result.message || 'Email enviado com sucesso!')
      setEmailForm({ userId: '', assunto: '', mensagem: '' })
    } catch (err: any) {
      setEmailMsg(err.message || 'Erro ao enviar email')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const roleColor = (role: string) => {
    if (role === 'ADMIN') return 'var(--pg-red)'
    if (role === 'GESTOR') return 'var(--pg-gold)'
    return 'var(--pg-green)'
  }

  if (loading) {
    return (
      <div className="page active">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page active">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-400)' }}>Erro ao carregar dados</div>
      </div>
    )
  }

  const { resumoGeral, acessosRecentes, atividadesRecentes, cursosRecentes, emailsStats } = data

  const tabs = [
    { key: 'resumo', label: 'Resumo' },
    { key: 'acessos', label: 'Acessos Recentes' },
    { key: 'atividades', label: 'Atividades' },
    { key: 'cursos', label: 'Cursos' },
    { key: 'email', label: 'Enviar Email' },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard Administrativo</div>
          <div className="page-subtitle">Visao geral do sistema</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-val" style={{ fontSize: '24px' }}>{resumoGeral.totalUsers}</div>
              <div className="stat-card-label">Usuarios</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Total de usuarios cadastrados no sistema</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-val" style={{ fontSize: '24px' }}>{resumoGeral.totalModulos}</div>
              <div className="stat-card-label">Modulos</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Modulos/cursos criados na plataforma</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-val" style={{ fontSize: '24px' }}>{resumoGeral.totalAulas}</div>
              <div className="stat-card-label">Aulas</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Total de aulas disponiveis em todos os modulos</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-val" style={{ fontSize: '24px' }}>{resumoGeral.totalCertificates}</div>
              <div className="stat-card-label">Certificados</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Certificados emitidos para usuarios</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-val" style={{ fontSize: '24px' }}>{resumoGeral.quizzesAprovados}</div>
              <div className="stat-card-label">Quizzes Aprovados</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Quizzes com nota minima atingida pelos usuarios</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="stat-card stat-card--static">
              <span className="stat-card-info">i</span>
              <div className="stat-card-val" style={{ fontSize: '24px' }}>{emailsStats.total}</div>
              <div className="stat-card-label">Emails Enviados</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Total de emails de notificacao enviados pelo sistema</TooltipContent>
        </Tooltip>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '4px', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === t.key ? 600 : 400,
              background: activeTab === t.key ? 'var(--pg-orange)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--gray-600)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

        {/* RESUMO */}
        {activeTab === 'resumo' && (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <div className="section-title" style={{ marginBottom: '12px' }}>Acessos Recentes</div>
                {acessosRecentes.length === 0 ? (
                  <div style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Nenhum acesso registrado</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {acessosRecentes.slice(0, 5).map((log: any) => (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{log.user?.nome || log.user?.email}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDate(log.createdAt)}</div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: roleColor(log.user?.role || ''), color: '#fff' }}>
                          {log.user?.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="section-title" style={{ marginBottom: '12px' }}>Atividade Recente</div>
                {atividadesRecentes.length === 0 ? (
                  <div style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Nenhuma atividade</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {atividadesRecentes.slice(0, 5).map((log: any) => (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{log.acao}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{log.user?.nome} — {formatDate(log.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACESSOS */}
        {activeTab === 'acessos' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Data/Hora</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Usuario</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Email</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {acessosRecentes.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{log.user?.nome || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--gray-500)' }}>{log.user?.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: roleColor(log.user?.role || ''), color: '#fff' }}>
                        {log.user?.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ATIVIDADES */}
        {activeTab === 'atividades' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Data/Hora</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Usuario</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Acao</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {atividadesRecentes.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{log.user?.nome || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{log.user?.email}</div>
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--gray-700)' }}>{log.acao}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--gray-500)', fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.detalhes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CURSOS */}
        {activeTab === 'cursos' && (
          <div style={{ padding: '20px' }}>
            <div className="section-title" style={{ marginBottom: '14px' }}>Modulos com Mais Atividade</div>
            {cursosRecentes.length === 0 ? (
              <div style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Nenhum modulo com atividade</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cursosRecentes.map((curso: any) => (
                  <div key={curso.id} style={{ padding: '14px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>{curso.titulo}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{curso.concluidos} / {curso.totalAulas} aulas</div>
                    </div>
                    <div style={{ background: 'var(--gray-200)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${curso.percentual}%`, height: '100%', background: 'var(--pg-orange)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--gray-400)' }}>
                      <span>{curso.acessos} acessos</span>
                      <span>{curso.percentual}% concluido</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ENVIAR EMAIL */}
        {activeTab === 'email' && (
          <div style={{ padding: '24px', maxWidth: '600px' }}>
            <div className="section-title" style={{ marginBottom: '16px' }}>Enviar Email para Usuario</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-field">
                <label className="form-label">Destinatario</label>
                <select
                  className="form-input"
                  value={emailForm.userId}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, userId: e.target.value }))}
                >
                  <option value="">Selecione um usuario...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nome || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Assunto</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex: Informacao importante..."
                  value={emailForm.assunto}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, assunto: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Mensagem</label>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder="Digite a mensagem do email..."
                  value={emailForm.mensagem}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, mensagem: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: '120px' }}
                />
              </div>
              {emailMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: emailMsg.includes('sucesso') || emailMsg.includes('enviado') ? '#DCFCE7' : '#FEE2E2',
                  color: emailMsg.includes('sucesso') || emailMsg.includes('enviado') ? '#166534' : '#991B1B',
                }}>
                  {emailMsg}
                </div>
              )}
              <button
                className="btn-primary"
                onClick={handleSendEmail}
                disabled={sending}
                style={{ alignSelf: 'flex-start' }}
              >
                {sending ? 'Enviando...' : 'Enviar Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
