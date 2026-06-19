import { useState, useEffect } from 'react'
import type { User } from '../hooks/useAuth'
import { PERSONAS } from '../data/constants'
import { api } from '../lib/api'
import { XP_PER_LEVEL } from '../lib/constants'


interface EquipePageProps {
  user: User
}

export function EquipePage({ user }: EquipePageProps) {
  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadEquipe = async () => {
    try {
      const data = await api.getEquipe()
      setTeamData(data)
    } catch {
      setTeamData([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadEquipe() }, [])

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header"><div className="page-title">Carregando...</div></div>
      </div>
    )
  }

  const renderAtendenteRow = (member: any, i: number) => {
    const memberXp = member.xp || 0
    const level = Math.floor(memberXp / XP_PER_LEVEL) + 1
    return (
      <tr key={i}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '11px', background: PERSONAS.ATENDENTE?.color || '#8b5cf6' }}>
              {member.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <b style={{ fontSize: '13px' }}>{member.nome}</b>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{member.email}</div>
            </div>
          </div>
        </td>
        <td>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '12px',
            background: 'var(--pg-blue-lt)', color: 'var(--pg-blue)',
            fontSize: '12px', fontWeight: 'bold',
          }}>
            Lv. {level}
          </span>
        </td>
        <td>
          <div className="progress-cell">
            <div className="progress-mini">
              <div className={`progress-mini-fill ${(member.progress || 0) === 100 ? 'done' : ''}`} style={{ width: (member.progress || 0) + '%' }}></div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '32px' }}>{member.progress || 0}%</span>
          </div>
        </td>
        <td><span style={{ fontWeight: '600', color: 'var(--pg-orange)' }}>{memberXp} XP</span></td>
        <td><span className={`status-pill ${(member.certCount || 0) > 0 ? 'pill-green' : 'pill-gray'}`}>{(member.certCount || 0) > 0 ? <><i className="icon-check icon-xs" />{member.certCount}</> : 'Pendente'}</span></td>
        <td><span className={`status-pill ${member.ativo !== false ? 'pill-green' : 'pill-gray'}`}>{member.ativo !== false ? 'Ativo' : 'Inativo'}</span></td>
      </tr>
    )
  }

  const tableHeaders = (
    <thead>
      <tr>
        <th>Atendente</th>
        <th>Nivel</th>
        <th>Progresso</th>
        <th>XP</th>
        <th>Certificados</th>
        <th>Status</th>
      </tr>
    </thead>
  )

  if (isGestor) {
    const members = Array.isArray(teamData) ? teamData : []
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <div className="page-title">Minha Equipe</div>
            <div className="page-subtitle">{members.length} atendente(s) atribuido(s)</div>
          </div>
        </div>
        {members.length > 0 ? (
          <div className="table-wrap">
            <table>
              {tableHeaders}
              <tbody>{members.map(renderAtendenteRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>Nenhum atendente atribuido a sua equipe.</p>
          </div>
        )}
      </div>
    )
  }

  const teams = Array.isArray(teamData) ? teamData : []
  const totalMembros = teams.reduce((sum: number, t: any) => sum + (t.totalMembros || 0), 0)

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Equipes</div>
          <div className="page-subtitle">{teams.length} gestor(es) • {totalMembros} atendente(s) no total</div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>Nenhuma equipe criada ainda.</p>
        </div>
      ) : (
        teams.map((team: any, idx: number) => (
          <div key={team.gestor?.id || idx} style={{ marginBottom: '32px' }}>
            {team.gestor && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px',
                padding: '12px 16px', borderRadius: 'var(--radius)',
                background: 'var(--pg-gold-lt)',
                border: '1px solid var(--pg-gold)',
              }}>
                <div className="user-avatar" style={{ background: PERSONAS.GESTOR?.color || 'var(--pg-gold)', width: '36px', height: '36px', fontSize: '12px' }}>
                  {team.gestor.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{team.gestor.nome}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{team.gestor.email}</div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '16px',
                  background: 'var(--pg-gold)', color: '#fff',
                  fontSize: '12px', fontWeight: 700,
                }}>
                  {team.totalMembros} atendente(s)
                </span>
              </div>
            )}
            {team.membros?.length > 0 ? (
              <div className="table-wrap">
                <table>
                  {tableHeaders}
                  <tbody>{team.membros.map(renderAtendenteRow)}</tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px', color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center' }}>
                Nenhum atendente nesta equipe
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
