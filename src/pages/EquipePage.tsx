import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { PERSONAS } from '../data/constants'
import { api } from '../lib/api'


interface EquipePageProps {
  user: User
}

export function EquipePage({ user }: EquipePageProps) {
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const [teamData, setTeamData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEquipe()
  }, [])

  const loadEquipe = async () => {
    try {
      const data = await api.getEquipe()
      setTeamData(data)
    } catch {
      setTeamData([])
    } finally {
      setLoading(false)
    }
  }

  const getPersonaIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <i className="icon-globe icon-sm" />
      case 'GESTOR': return <i className="icon-fuel icon-sm" />
      case 'ATENDENTE': return <i className="icon-user icon-sm" />
      default: return <i className="icon-user icon-sm" />
    }
  }

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Minha Equipe</div>
          <div className="page-subtitle">Acompanhe o progresso de cada colaborador</div>
        </div>
        {(isAdmin || isGestor) && <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><i className="icon-download icon-sm" /> Exportar CSV</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Perfil</th>
              <th>Progresso</th>
              <th>XP</th>
              <th>Certificados</th>
              <th>Status</th>
              {(isAdmin || isGestor) && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {teamData.length > 0 ? (
              teamData.map((member, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '11px', background: PERSONAS[member.role as keyof typeof PERSONAS].color }}>
                        {member.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <b style={{ fontSize: '13px' }}>{member.nome}</b>
                        <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{member.estado}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="track-badge badge-new" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{getPersonaIcon(member.role)} {PERSONAS[member.role as keyof typeof PERSONAS].label}</span></td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-mini">
                        <div className={`progress-mini-fill ${member.progress === 100 ? 'done' : ''}`} style={{ width: member.progress + '%' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '32px' }}>{member.progress}%</span>
                    </div>
                  </td>
                  <td><span style={{ fontWeight: '600', color: 'var(--pg-orange)' }}>0</span></td>
                  <td><span className={`status-pill ${member.cert ? 'pill-green' : 'pill-gray'}`}>{member.cert ? <><i className="icon-check icon-xs" />1</> : 'Pendente'}</span></td>
                  <td><span className={`status-pill ${member.ativo ? 'pill-green' : 'pill-gray'}`}>{member.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  {(isAdmin || isGestor) && (
                    <td>
                      <button className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>Ver Detalhes</button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                  Dados não carregados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
