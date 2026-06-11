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

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Minha Equipe</div>
          <div className="page-subtitle">Acompanhe o progresso de cada colaborador</div>
        </div>
        {(isAdmin || isGestor) && <button className="btn-primary">📥 Exportar CSV</button>}
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
            {teamData.map((member, i) => (
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
                <td><span className="track-badge badge-new" style={{ fontSize: '11px' }}>{PERSONAS[member.role as keyof typeof PERSONAS].icon} {PERSONAS[member.role as keyof typeof PERSONAS].label}</span></td>
                <td>
                  <div className="progress-cell">
                    <div className="progress-mini">
                      <div className={`progress-mini-fill ${member.progress === 100 ? 'done' : ''}`} style={{ width: member.progress + '%' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '32px' }}>{member.progress}%</span>
                  </div>
                </td>
                <td><span style={{ fontWeight: '600', color: 'var(--pg-orange)' }}>{member.xp.toLocaleString('pt-BR')}</span></td>
                <td><span className={`status-pill ${member.cert ? 'pill-green' : 'pill-gray'}`}>{member.cert ? '✓ 1' : 'Pendente'}</span></td>
                <td><span className={`status-pill ${member.ativo ? 'pill-green' : 'pill-gray'}`}>{member.ativo ? 'Ativo' : 'Inativo'}</span></td>
                {(isAdmin || isGestor) && (
                  <td>
                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>Ver Detalhes</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
