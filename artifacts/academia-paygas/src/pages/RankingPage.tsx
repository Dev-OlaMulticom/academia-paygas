import { useAuth } from '../hooks/useAuth'

const RANKING_DATA = [
  { nome: 'Mariana Tech', role: 'Integrador ERP', estado: 'PR', xp: 5500, avatar: 'MT', color: '#1F2937' },
  { nome: 'Carlos Mendes', role: 'Gestor', estado: 'RJ', xp: 4100, avatar: 'CM', color: '#D97706' },
  { nome: 'Lúcia Ferreira', role: 'Gestora', estado: 'GO', xp: 3800, avatar: 'LF', color: '#D97706' },
  { nome: 'João Santos', role: 'Líder Comunitário', estado: 'BA', xp: 3200, avatar: 'JS', color: '#0891B2' },
  { nome: 'Ana Paula Costa', role: 'Atendente', estado: 'SP', xp: 2400, avatar: 'AC', color: '#16A34A' },
  { nome: 'Rafael Costa', role: 'Parceiro', estado: 'CE', xp: 1200, avatar: 'RC', color: '#7C3AED' },
  { nome: 'Fernanda Lima', role: 'Parceira', estado: 'MG', xp: 1800, avatar: 'FL', color: '#7C3AED' },
  { nome: 'Pedro Oliveira', role: 'Atendente', estado: 'SC', xp: 900, avatar: 'PO', color: '#16A34A' },
].sort((a, b) => b.xp - a.xp)

const MEDALS = ['🥇', '🥈', '🥉']

export function RankingPage() {
  const { user } = useAuth()

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ranking Nacional 🥇</div>
          <div className="page-subtitle">Top alunos da Academia PayGas no Brasil</div>
        </div>
      </div>
      <div>
        {RANKING_DATA.map((r, i) => {
          const isMe = r.nome === user?.nome
          return (
            <div
              key={i}
              className="ranking-item"
              style={{
                background: isMe ? 'var(--pg-orange-lt)' : '#fff',
                border: `1px solid ${isMe ? 'var(--pg-orange)' : 'var(--gray-200)'}`,
              }}
            >
              <div
                className="rank-pos"
                style={{
                  color: ['#F59E0B', '#9CA3AF', '#CD7F32'][i] || 'var(--gray-500)',
                  fontSize: i < 3 ? '20px' : '16px',
                }}
              >
                {MEDALS[i] || `#${i + 1}`}
              </div>
              <div className="rank-avatar" style={{ background: r.color }}>
                {r.avatar}
              </div>
              <div className="rank-info">
                <b>
                  {r.nome}
                  {isMe && (
                    <span style={{
                      fontSize: '11px',
                      background: 'var(--pg-orange)',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      marginLeft: '6px',
                    }}>
                      Você
                    </span>
                  )}
                </b>
                <span>{r.role} · {r.estado}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="rank-xp">{r.xp.toLocaleString('pt-BR')}</div>
                <div style={{ fontSize: '10px', color: 'var(--gray-400)' }}>XP</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
