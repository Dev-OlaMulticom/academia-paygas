import type { User } from '../hooks/useAuth'

interface PerfilPageProps {
  user: User
  xp: number
  tracks: any[]
}

export function PerfilPage({ user, xp, tracks }: PerfilPageProps) {
  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Meu Perfil</div>
      </div>
      <div className="two-col">
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '20px' }}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <b style={{ fontSize: '18px', display: 'block', color: 'var(--gray-900)' }}>Usuário</b>
                <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{user?.role}</span>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Nome Completo</label>
              <input className="form-input" type="text" defaultValue="Usuário" />
            </div>
            <div className="form-field">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" defaultValue={user?.email} />
            </div>
            <div className="form-field">
              <label className="form-label">Estado</label>
              <select className="form-select" defaultValue="São Paulo">
                <option>São Paulo</option>
                <option>Rio de Janeiro</option>
                <option>Minas Gerais</option>
                <option>Bahia</option>
                <option>Outros</option>
              </select>
            </div>
            <button className="btn-primary" style={{ width: '100%' }}>Salvar Alterações</button>
          </div>
        </div>
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
            <div className="section-title">Estatísticas</div>
            <div className="cards-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>⚡</div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{xp.toLocaleString('pt-BR')}</div>
                <div className="stat-card-label">XP Total</div>
              </div>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>⭐</div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{Math.floor(xp / 2000) + 1}</div>
                <div className="stat-card-label">Nível Atual</div>
              </div>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏆</div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{Math.ceil(tracks.length * 0.2)}</div>
                <div className="stat-card-label">Certificados</div>
              </div>
              <div className="stat-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>📚</div>
                <div className="stat-card-val" style={{ fontSize: '20px' }}>{tracks.length}</div>
                <div className="stat-card-label">Trilhas</div>
              </div>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px' }}>
            <div className="section-title">Segurança</div>
            <div className="form-field">
              <label className="form-label">Nova Senha</label>
              <input className="form-input" type="password" placeholder="••••••••" />
            </div>
            <div className="form-field">
              <label className="form-label">Confirmar Senha</label>
              <input className="form-input" type="password" placeholder="••••••••" />
            </div>
            <button className="btn-secondary" style={{ width: '100%' }}>Alterar Senha</button>
          </div>
        </div>
      </div>
    </div>
  )
}
