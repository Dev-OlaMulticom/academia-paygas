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

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div className="page-title">Carregando...</div>
        </div>
      </div>
    )
  }

  const renderAtendenteRow = (member: any, i: number) => {
    const memberXp = member.xp || 0
    const level = Math.floor(memberXp / 2000) + 1
    return (
      <tr key={i}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '11px', background: PERSONAS.ATENDENTE.color }}>
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
            background: '#E6EEF9', color: '#0A2E6E',
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
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <div className="page-title">Minha Equipe</div>
            <div className="page-subtitle">{teamData.length} atendente(s) atribuído(s)</div>
          </div>
          <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><i className="icon-download icon-sm" /> Exportar CSV</button>
        </div>
        {teamData.length > 0 ? (
          <div className="table-wrap">
            <table>
              {tableHeaders}
              <tbody>{teamData.map(renderAtendenteRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>Nenhum atendente atribuído a sua equipe.</p>
          </div>
        )}
      </div>
    )
  }

  const gestoresMap = new Map<string, any>()
  teamData.forEach((m: any) => {
    if (m.role === 'GESTOR') gestoresMap.set(m.id, m)
  })
  const gestores = Array.from(gestoresMap.values())
  const atendentesSemGestor = teamData.filter((m: any) => m.role === 'ATENDENTE' && !m.gestorId)

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Minha Equipe</div>
          <div className="page-subtitle">Acompanhe o progresso de cada colaborador</div>
        </div>
        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><i className="icon-download icon-sm" /> Exportar CSV</button>
      </div>

      {gestores.length === 0 && atendentesSemGestor.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>Nenhum membro na equipe.</p>
        </div>
      ) : (
        <>
          {gestores.map((gestor) => {
            const atendentes = teamData.filter((m: any) => m.role === 'ATENDENTE' && m.gestorId === gestor.id)
            if (atendentes.length === 0) return null
            return (
              <div key={gestor.id} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div className="user-avatar" style={{ background: PERSONAS.GESTOR.color }}>
                    {gestor.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <b style={{ fontSize: '15px' }}>{gestor.nome}</b>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{gestor.email}</div>
                  </div>
                  <span className="track-badge badge-progress" style={{ fontSize: '11px' }}>{atendentes.length} atendentes</span>
                </div>
                <div className="table-wrap">
                  <table>
                    {tableHeaders}
                    <tbody>{atendentes.map(renderAtendenteRow)}</tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {atendentesSemGestor.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-500)' }}>Sem Gestor Atribuído</span>
                <span className="track-badge badge-gray" style={{ fontSize: '11px' }}>{atendentesSemGestor.length} atendentes</span>
              </div>
              <div className="table-wrap">
                <table>
                  {tableHeaders}
                  <tbody>{atendentesSemGestor.map(renderAtendenteRow)}</tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
