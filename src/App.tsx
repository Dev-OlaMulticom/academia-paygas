import { useState, useEffect } from 'react'
import './index.css'

// Simple route-based navigation
type Page = 'login' | 'dashboard' | 'trilhas' | 'modulos' | 'certificados' | 'equipe' | 'relatorios' | 'cms' | 'usuarios' | 'nacional' | 'analitica' | 'ranking' | 'conquistas' | 'notif' | 'perfil' | 'mapa' | 'forum'

const PERSONAS = {
  paygas: { label: 'Administrador Nacional', icon: '🌐', color: '#0A2E6E', initials: 'AD' },
  gestor: { label: 'Gestor de Posto', icon: '⛽', color: '#D97706', initials: 'GP' },
  atendente: { label: 'Atendente', icon: '👤', color: '#16A34A', initials: 'AT' },
  parceiro: { label: 'Parceiro Comercial', icon: '🏪', color: '#7C3AED', initials: 'PC' },
  lider: { label: 'Líder Comunitário', icon: '⛪', color: '#0891B2', initials: 'LC' },
  erp: { label: 'Integrador ERP', icon: '💻', color: '#1F2937', initials: 'ERP' },
}

const TRACKS = [
  { id: 'atendimento', label: 'Excelência no Atendimento', icon: '👤', color: '#DCFCE7', desc: 'Técnicas de atendimento e satisfação do cliente', personas: ['paygas', 'gestor', 'atendente'], lessons: 6, required: true },
  { id: 'cashback', label: 'Sistema de Cashback PayGas', icon: '💰', color: '#FEF3C7', desc: 'Como funciona e como comunicar o cashback ao cliente', personas: ['paygas', 'gestor', 'atendente', 'parceiro', 'lider'], lessons: 5, required: true },
  { id: 'gestao', label: 'Gestão e KPIs do Posto', icon: '📊', color: '#E6EEF9', desc: 'Dashboard, relatórios e indicadores de desempenho', personas: ['paygas', 'gestor'], lessons: 7, required: false },
  { id: 'terminal', label: 'Operação do Terminal', icon: '📱', color: '#F3E8FF', desc: 'Configuração e uso do terminal PayGas', personas: ['paygas', 'atendente'], lessons: 4, required: true },
  { id: 'parceiro', label: 'Portal do Parceiro', icon: '🏪', color: '#FCE7F3', desc: 'Cadastro, comissões e ferramentas para parceiros', personas: ['paygas', 'parceiro'], lessons: 5, required: false },
  { id: 'comunidade', label: 'Pedágio Digital Comunitário', icon: '⛪', color: '#CFFAFE', desc: 'Renda passiva e gestão da rede comunitária', personas: ['paygas', 'lider'], lessons: 4, required: false },
  { id: 'erp', label: 'Integração via API', icon: '💻', color: '#F1F5F9', desc: 'Endpoints, autenticação JWT e sincronização', personas: ['paygas', 'erp'], lessons: 6, required: true },
  { id: 'marketing', label: 'Marketing Digital', icon: '📣', color: '#FEF0E6', desc: 'Campanhas, redes sociais e fidelização', personas: ['paygas', 'parceiro', 'gestor'], lessons: 4, required: false },
  { id: 'lgpd', label: 'LGPD e Segurança de Dados', icon: '🔒', color: '#F0FDF4', desc: 'Proteção de dados e compliance', personas: ['paygas', 'gestor', 'erp'], lessons: 3, required: true },
  { id: 'lideranca', label: 'Liderança e Desenvolvimento de Equipe', icon: '🚀', color: '#EDE9FE', desc: 'Gestão de pessoas, metas e cultura de alta performance', personas: ['paygas', 'gestor'], lessons: 5, required: false },
  { id: 'financeiro', label: 'Gestão Financeira do Posto', icon: '💼', color: '#FEF9C3', desc: 'Fluxo de caixa, conciliação e relatórios financeiros', personas: ['paygas', 'gestor'], lessons: 4, required: false },
  { id: 'inovacao', label: 'Inovação no Setor de Combustíveis', icon: '⚡', color: '#E0F2FE', desc: 'Tendências, fintechs e transformação digital no GLP', personas: ['paygas', 'gestor', 'erp'], lessons: 4, required: false }
]

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login')
  const [user, setUser] = useState<any>(null)
  const [xp, setXp] = useState(0)
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setCurrentPage('dashboard')
      // Set initial XP based on role
      const xpMap: Record<string, number> = {
        paygas: 8500,
        gestor: 4100,
        atendente: 2400,
        parceiro: 1800,
        lider: 3200,
        erp: 5500
      }
      setXp(xpMap[userData.role] || 0)
    }
  }, [])

  const handleLogin = (email: string, password: string, role: string) => {
    if (!role) {
      alert('⚠️ Selecione um perfil!')
      return
    }
    if (!email) {
      alert('⚠️ Informe seu e-mail!')
      return
    }
    const userData = { role, email }
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    
    const xpMap: Record<string, number> = {
      paygas: 8500,
      gestor: 4100,
      atendente: 2400,
      parceiro: 1800,
      lider: 3200,
      erp: 5500
    }
    setXp(xpMap[role] || 0)
    setCurrentPage('dashboard')
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    setCurrentPage('login')
  }

  const getMyTracks = () => {
    if (!user) return []
    if (user.role === 'paygas') return TRACKS
    return TRACKS.filter(t => t.personas.includes(user.role))
  }

  const persona = user ? PERSONAS[user.role as keyof typeof PERSONAS] : null

  if (currentPage === 'login' || !user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div id="screen-app" className="active">
      <AppHeader 
        user={user} 
        persona={persona} 
        onLogout={handleLogout}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />
      <div className="app-body">
        <Sidebar 
          user={user}
          persona={persona}
          xp={xp}
          onNavigate={setCurrentPage}
          currentPage={currentPage}
          tracksCount={getMyTracks().length}
          onToggleAI={() => setAiOpen(!aiOpen)}
          aiOpen={aiOpen}
        />
        <div className="main">
          <MainContent 
            currentPage={currentPage}
            user={user}
            persona={persona}
            xp={xp}
            tracks={getMyTracks()}
            onNavigate={setCurrentPage}
          />
        </div>
        {aiOpen && <AIAssistant user={user} persona={persona} onClose={() => setAiOpen(false)} />}
      </div>
    </div>
  )
}

function LoginPage({ onLogin }: { onLogin: (email: string, password: string, role: string) => void }) {
  const [email, setEmail] = useState('admin@paygas.com.br')
  const [password, setPassword] = useState('123456')
  const [role, setRole] = useState('')

  return (
    <div id="screen-login">
      <div className="login-panel">
        <div className="login-logo">
          <div className="login-logo-icon">PG</div>
          <div className="login-logo-text">
            <b>Academia PayGas</b>
            <span>Plataforma Nacional de Capacitação</span>
          </div>
        </div>
        <h2>Bem-vindo de volta!</h2>
        <p>Acesse sua conta para continuar aprendendo e crescendo no ecossistema PayGas.</p>
        <div className="field">
          <label>E-mail</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>
        <div className="field">
          <label>Senha</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="field">
          <label>Perfil de acesso</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">— Selecione seu perfil —</option>
            <option value="paygas">🌐 PayGas (Administrador Nacional)</option>
            <option value="gestor">⛽ Gestor de Posto</option>
            <option value="atendente">👤 Atendente</option>
            <option value="parceiro">🏪 Parceiro Comercial</option>
            <option value="lider">⛪ Líder Comunitário</option>
            <option value="erp">💻 Integrador ERP</option>
          </select>
        </div>
        <button className="btn-login" onClick={() => onLogin(email, password, role)}>Acessar Academia</button>
        <p className="login-terms">
          Ao acessar, você concorda com os <a href="#">Termos de Uso</a> e a <a href="#">Política de Privacidade</a>.
        </p>
      </div>
      <div className="login-bg">
        <span className="ver-badge-login">V26 — Edição Nacional</span>
        <div className="login-bg-content">
          <h1>Capacitação <span>Nacional</span><br/>em um só lugar</h1>
          <p>A Academia PayGas conecta postos, parceiros e comunidades em todo o Brasil com conteúdo profissional, trilhas personalizadas e certificação reconhecida.</p>
          <div className="login-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="login-stat"><b>12.400+</b><span>Usuários ativos</span></div>
            <div className="login-stat"><b>27</b><span>Estados cobertos</span></div>
            <div className="login-stat"><b>R$ 2,1M</b><span>Cashback gerado</span></div>
            <div className="login-stat"><b>4,8</b><span>NPS médio</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AppHeader({ user, persona, onLogout, onNavigate, currentPage }: any) {
  return (
    <header className="app-header">
      <div className="header-logo">
        <div className="header-logo-icon">PG</div>
        <div>
          <div className="header-logo-name">Academia PayGas</div>
          <div className="header-logo-ver">V26 — Edição Nacional</div>
        </div>
      </div>
      <div className="header-center">
        <div className="header-search">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Buscar módulos, trilhas, certificados..." />
        </div>
      </div>
      <div className="header-right">
        <button className="header-notif" onClick={() => onNavigate('notif')} title="Notificações">
          🔔<span className="notif-dot"></span>
        </button>
        <button className="header-user" onClick={() => onNavigate('perfil')}>
          <div className="user-avatar" style={{ background: persona?.color }}>{persona?.initials}</div>
          <div className="user-info">
            <b>Usuário</b>
            <span>{persona?.label}</span>
          </div>
        </button>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </div>
    </header>
  )
}

function Sidebar({ user, persona, xp, onNavigate, currentPage, tracksCount, onToggleAI, aiOpen }: any) {
  const isGestor = user?.role === 'gestor' || user?.role === 'paygas'
  const isAdmin = user?.role === 'paygas'

  return (
    <nav className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-section-label">Principal</div>
        <button 
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} 
          onClick={() => onNavigate('dashboard')}
        >
          <span className="nav-icon">🏠</span> Dashboard
        </button>
        <button 
          className={`nav-item ${currentPage === 'trilhas' ? 'active' : ''}`} 
          onClick={() => onNavigate('trilhas')}
        >
          <span className="nav-icon">📚</span> Trilhas de Aprendizado
          <span className="nav-badge">{tracksCount}</span>
        </button>
        <button 
          className={`nav-item ${currentPage === 'modulos' ? 'active' : ''}`} 
          onClick={() => onNavigate('modulos')}
        >
          <span className="nav-icon">📖</span> Módulos
        </button>
        <button 
          className={`nav-item ${currentPage === 'certificados' ? 'active' : ''}`} 
          onClick={() => onNavigate('certificados')}
        >
          <span className="nav-icon">🏆</span> Certificados
        </button>
      </div>
      {isGestor && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Gestão</div>
          <button 
            className={`nav-item ${currentPage === 'equipe' ? 'active' : ''}`} 
            onClick={() => onNavigate('equipe')}
          >
            <span className="nav-icon">👥</span> Minha Equipe
          </button>
          <button 
            className={`nav-item ${currentPage === 'relatorios' ? 'active' : ''}`} 
            onClick={() => onNavigate('relatorios')}
          >
            <span className="nav-icon">📊</span> Relatórios
          </button>
        </div>
      )}
      {isAdmin && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Administração</div>
          <button 
            className={`nav-item ${currentPage === 'cms' ? 'active' : ''}`} 
            onClick={() => onNavigate('cms')}
          >
            <span className="nav-icon">✏️</span> Gestão de Conteúdo
          </button>
          <button 
            className={`nav-item ${currentPage === 'usuarios' ? 'active' : ''}`} 
            onClick={() => onNavigate('usuarios')}
          >
            <span className="nav-icon">🧑‍💼</span> Usuários
          </button>
          <button 
            className={`nav-item ${currentPage === 'nacional' ? 'active' : ''}`} 
            onClick={() => onNavigate('nacional')}
          >
            <span className="nav-icon">🗺️</span> Painel Nacional
          </button>
          <button 
            className={`nav-item ${currentPage === 'analitica' ? 'active' : ''}`} 
            onClick={() => onNavigate('analitica')}
          >
            <span className="nav-icon">📈</span> Analytics
          </button>
        </div>
      )}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Comunidade</div>
        <button 
          className={`nav-item ${currentPage === 'mapa' ? 'active' : ''}`} 
          onClick={() => onNavigate('mapa')}
        >
          <span className="nav-icon">🗺️</span> Mapa Nacional
        </button>
        <button 
          className={`nav-item ${currentPage === 'ranking' ? 'active' : ''}`} 
          onClick={() => onNavigate('ranking')}
        >
          <span className="nav-icon">🥇</span> Ranking Nacional
        </button>
        <button 
          className={`nav-item ${currentPage === 'forum' ? 'active' : ''}`} 
          onClick={() => onNavigate('forum')}
        >
          <span className="nav-icon">💬</span> Fórum
        </button>
        <button 
          className={`nav-item ${currentPage === 'conquistas' ? 'active' : ''}`} 
          onClick={() => onNavigate('conquistas')}
        >
          <span className="nav-icon">⭐</span> Conquistas
        </button>
        <button 
          className={`nav-item ${currentPage === 'notif' ? 'active' : ''}`} 
          onClick={() => onNavigate('notif')}
        >
          <span className="nav-icon">🔔</span> Notificações
          <span className="nav-badge">3</span>
        </button>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-label">Suporte</div>
        <button 
          className={`nav-item ${currentPage === 'perfil' ? 'active' : ''}`} 
          onClick={() => onNavigate('perfil')}
        >
          <span className="nav-icon">👤</span> Meu Perfil
        </button>
        <button className={`nav-item ${aiOpen ? 'active' : ''}`} onClick={onToggleAI}>
          <span className="nav-icon">🤖</span> Assistente IA
        </button>
        <button className="nav-item">
          <span className="nav-icon">📄</span> Termos de Uso
        </button>
        <button className="nav-item">
          <span className="nav-icon">🔒</span> Privacidade
        </button>
      </div>
      <div className="sidebar-xp">
        <div className="xp-label">
          <span>⚡ XP Acumulado</span>
          <span>{xp.toLocaleString('pt-BR')} pts</span>
        </div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${(xp % 2000) / 2000 * 100}%` }}></div>
        </div>
        <div className="xp-pts">Próximo nível: {2000 - (xp % 2000)} pts restantes</div>
      </div>
    </nav>
  )
}

function MainContent({ currentPage, user, persona, xp, tracks, onNavigate }: any) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage user={user} persona={persona} xp={xp} tracks={tracks} onNavigate={onNavigate} />
    case 'trilhas':
      return <TrilhasPage tracks={tracks} onNavigate={onNavigate} />
    case 'modulos':
      return <ModulosPage tracks={tracks} onNavigate={onNavigate} />
    case 'certificados':
      return <CertificadosPage tracks={tracks} />
    case 'equipe':
      return <EquipePage />
    case 'relatorios':
      return <RelatoriosPage />
    case 'cms':
      return <CMSPage />
    case 'usuarios':
      return <UsuariosPage />
    case 'nacional':
      return <NacionalPage />
    case 'analitica':
      return <AnaliticaPage />
    case 'ranking':
      return <RankingPage />
    case 'conquistas':
      return <ConquistasPage />
    case 'notif':
      return <NotifPage />
    case 'perfil':
      return <PerfilPage user={user} persona={persona} xp={xp} tracks={tracks} />
    case 'mapa':
      return <MapaPage />
    case 'forum':
      return <ForumPage />
    default:
      return <div className="page active">
        <div className="page-header">
          <div className="page-title">Página em desenvolvimento</div>
          <div className="page-subtitle">Esta funcionalidade será implementada em breve</div>
        </div>
      </div>
  }
}

function DashboardPage({ user, persona, xp, tracks, onNavigate }: any) {
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Olá! 👋</div>
          <div className="page-subtitle">Bem-vindo à Academia PayGas</div>
        </div>
        <div className="level-badge">⭐ Nível {Math.floor(xp / 2000) + 1}</div>
      </div>
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}>📚</div>
          <div className="stat-card-val">{tracks.length}</div>
          <div className="stat-card-label">Trilhas Disponíveis</div>
          <div className="stat-card-trend trend-up">↑ +2 novas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#DCFCE7' }}>✅</div>
          <div className="stat-card-val">{Math.ceil(tracks.length * 0.3)}</div>
          <div className="stat-card-label">Trilhas Concluídas</div>
          <div className="stat-card-trend trend-up">30%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E6EEF9' }}>⚡</div>
          <div className="stat-card-val">{xp.toLocaleString('pt-BR')}</div>
          <div className="stat-card-label">XP Acumulado</div>
          <div className="stat-card-trend trend-up">↑ +150 hoje</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF0E6' }}>🏆</div>
          <div className="stat-card-val">{Math.ceil(tracks.length * 0.2)}</div>
          <div className="stat-card-label">Certificados</div>
          <div className="stat-card-trend trend-up">Emissão automática</div>
        </div>
      </div>
      <div className="two-col" style={{ gap: '16px', marginBottom: '24px' }}>
        <div>
          <div className="section-title">Continuar Aprendendo</div>
          {tracks.slice(0, 3).map((track: any, i: number) => (
            <div key={track.id} className="track-card" onClick={() => onNavigate('modulos')} style={{ marginBottom: '10px' }}>
              <div className="track-card-top">
                <div className="track-icon" style={{ background: track.color }}>{track.icon}</div>
                <div className="track-card-info">
                  <h3>{track.label}</h3>
                  <p>{track.lessons} aulas · {track.desc.substring(0, 40)}...</p>
                </div>
              </div>
              <div className="track-prog-bar">
                <div className="track-prog-fill" style={{ width: [45, 72, 100][i] + '%' }}></div>
              </div>
              <div className="track-meta">
                <span>{[45, 72, 100][i]}% concluído</span>
                <span className={`track-badge ${[45, 72, 100][i] === 100 ? 'badge-done' : 'badge-progress'}`}>
                  {[45, 72, 100][i] === 100 ? '✓ Concluído' : 'Em andamento'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="section-title">Atividade Recente</div>
          <div className="activity-feed">
            <div className="activity-header">Atividade Recente <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: '400' }}>Últimos 7 dias</span></div>
            <div className="activity-item">
              <div className="activity-dot" style={{ background: '#F47C20' }}></div>
              <div className="activity-body">Você completou a aula "Cashback: Como Explicar ao Cliente"<span>Há 1 hora</span></div>
            </div>
            <div className="activity-item">
              <div className="activity-dot" style={{ background: '#16A34A' }}></div>
              <div className="activity-body">Certificado de Atendimento emitido<span>Há 3 horas</span></div>
            </div>
            <div className="activity-item">
              <div className="activity-dot" style={{ background: '#0A2E6E' }}></div>
              <div className="activity-body">Trilha "Sistema de Cashback" iniciada<span>Ontem</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="section-title">Progresso Semanal</div>
      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--gray-400)', marginBottom: '8px' }}>
          <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
        </div>
        <div className="mini-chart">
          {[20, 45, 30, 60, 80, 55, 90].map((h, i) => (
            <div key={i} className={`mini-bar ${i === 6 ? 'active' : ''}`} style={{ height: h + '%' }} title={h + ' min'}></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TrilhasPage({ tracks, onNavigate }: any) {
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Trilhas de Aprendizado</div>
          <div className="page-subtitle">{tracks.length} trilhas disponíveis</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="track-badge badge-progress" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Todas</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Obrigatórias</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Em Andamento</button>
          <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px' }}>Concluídas</button>
        </div>
      </div>
      <div className="track-grid">
        {tracks.map((track: any, i: number) => (
          <div key={track.id} className="track-card" onClick={() => onNavigate('modulos')}>
            <div className="track-card-top">
              <div className="track-icon" style={{ background: track.color }}>{track.icon}</div>
              <div className="track-card-info">
                <h3>{track.label}</h3>
                <p>{track.desc}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span className={`track-badge ${track.required ? 'badge-required' : 'badge-new'}`}>
                {track.required ? 'Obrigatória' : 'Opcional'}
              </span>
              <span className="track-badge badge-gray" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                {track.lessons} aulas
              </span>
            </div>
            <div className="track-prog-bar">
              <div className="track-prog-fill" style={{ width: [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] + '%' }}></div>
            </div>
            <div className="track-meta">
              <span>{[100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i]}% concluído</span>
              <span className={`track-badge ${[100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] === 100 ? 'badge-done' : [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] > 0 ? 'badge-progress' : 'badge-new'}`}>
                {[100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] === 100 ? '✓ Concluído' : [100, 72, 45, 0, 100, 30, 60, 0, 85, 55, 20, 40][i] > 0 ? 'Em andamento' : 'Iniciar'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModulosPage({ tracks, onNavigate }: any) {
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Módulo</div>
          <div className="page-subtitle">Excelência no Atendimento · 6 aulas</div>
        </div>
        <button className="btn-secondary" onClick={() => onNavigate('trilhas')}>← Voltar às Trilhas</button>
      </div>
      <div className="lesson-layout">
        <div className="lesson-sidebar">
          <div className="lesson-sidebar-header">
            <h3>Excelência no Atendimento</h3>
            <p>6 aulas · Técnicas de atendimento e satisfação do cliente</p>
          </div>
          {[
            { title: 'Fundamentos do Atendimento', type: 'video', duration: '8 min', done: true },
            { title: 'Comunicação Eficaz', type: 'video', duration: '10 min', done: true },
            { title: 'Resolução de Conflitos', type: 'leitura', duration: '12 min', done: true },
            { title: 'Cashback: Como Explicar ao Cliente', type: 'video', duration: '7 min', done: false, active: true },
            { title: 'Avaliação de Desempenho', type: 'quiz', duration: '10 min', done: false },
            { title: 'Certificação — Atendimento', type: 'cert', duration: '5 min', done: false }
          ].map((lesson, i) => (
            <div key={i} className={`lesson-item ${lesson.active ? 'active' : ''} ${lesson.done ? 'done' : ''}`}>
              <div className="lesson-num">{lesson.done ? '✓' : i + 1}</div>
              <div className="lesson-item-info">
                <b>{lesson.title}</b>
                <span>{lesson.type} · {lesson.duration}</span>
              </div>
              {lesson.done && <span className="lesson-check">✓</span>}
            </div>
          ))}
        </div>
        <div className="lesson-content">
          <div className="lesson-video">
            <div className="lesson-video-placeholder">
              <div className="play-btn">▶</div>
              <p>Cashback: Como Explicar ao Cliente</p>
              <small style={{ opacity: .5 }}>Clique para reproduzir</small>
            </div>
          </div>
          <div className="lesson-body">
            <h2>Cashback: Como Explicar ao Cliente</h2>
            <div className="lesson-tags">
              <span className="lesson-tag">video</span>
              <span className="lesson-tag">7 min</span>
              <span className="lesson-tag" style={{ background: 'var(--pg-red-lt)', color: 'var(--pg-red)' }}>Obrigatória</span>
            </div>
            <div className="lesson-text">
              O atendimento de qualidade começa com empatia, clareza e agilidade. Nesta aula você aprende os pilares fundamentais para encantar o cliente no posto de combustível.
            </div>
            <div className="lesson-objectives">
              <h4>🎯 Objetivos de Aprendizado</h4>
              <ul>
                <li>Compreender os conceitos fundamentais desta aula</li>
                <li>Aplicar o conhecimento na rotina diária</li>
                <li>Identificar situações práticas de uso</li>
              </ul>
            </div>
            <div className="lesson-actions">
              <button className="btn-primary">Concluir e Avançar ➜</button>
              <button className="btn-secondary">← Anterior</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CertificadosPage({ tracks }: any) {
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Meus Certificados</div>
          <div className="page-subtitle">Conquistas oficiais emitidas pela Academia PayGas</div>
        </div>
      </div>
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {tracks.slice(0, 3).map((track: any) => (
          <div key={track.id} className="cert-card">
            <div className="cert-header">
              <h3>ACADEMIA PAYGAS</h3>
              <h2>{track.label}</h2>
            </div>
            <div className="cert-body">
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)', marginBottom: '6px' }}>Certificamos que</p>
              <div className="cert-name">Usuário</div>
              <div className="cert-desc" style={{ fontSize: '12px' }}>concluiu a trilha de <strong>{track.label}</strong> com êxito.</div>
              <div className="cert-footer">
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{new Date().toLocaleDateString('pt-BR')}</span>
                <div className="cert-seal">PG</div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
              <button className="btn-success" style={{ fontSize: '12px', padding: '7px 14px' }}>📥 Baixar</button>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }}>🔗 Compartilhar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EquipePage() {
  const teamData = [
    { nome: 'Ana Paula Costa', role: 'atendente', estado: 'SP', xp: 2400, progress: 82, cert: true, ativo: true },
    { nome: 'Carlos Mendes', role: 'gestor', estado: 'RJ', xp: 4100, progress: 61, cert: false, ativo: true },
    { nome: 'Fernanda Lima', role: 'parceiro', estado: 'MG', xp: 1800, progress: 45, cert: false, ativo: true },
    { nome: 'João Santos', role: 'lider', estado: 'BA', xp: 3200, progress: 90, cert: true, ativo: true },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Minha Equipe</div>
          <div className="page-subtitle">Acompanhe o progresso de cada colaborador</div>
        </div>
        <button className="btn-primary">📥 Exportar CSV</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Trilha</th>
              <th>Progresso</th>
              <th>XP</th>
              <th>Certificados</th>
              <th>Status</th>
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
                <td><span className="track-badge badge-new" style={{ fontSize: '11px' }}>{PERSONAS[member.role as keyof typeof PERSONAS].label}</span></td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RelatoriosPage() {
  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Relatórios</div>
      </div>
      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#DCFCE7' }}>📊</div>
          <div className="stat-card-val">76%</div>
          <div className="stat-card-label">Taxa de Conclusão</div>
          <div className="stat-card-trend trend-up">↑ +8% vs mês anterior</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF3C7' }}>⭐</div>
          <div className="stat-card-val">8.4</div>
          <div className="stat-card-label">Nota Média nos Quizzes</div>
          <div className="stat-card-trend trend-up">↑ +0.3 pontos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#E6EEF9' }}>👥</div>
          <div className="stat-card-val">8</div>
          <div className="stat-card-label">Usuários Ativos</div>
          <div className="stat-card-trend trend-up">↑ +2 novos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#FEF0E6' }}>⚡</div>
          <div className="stat-card-val">24.700</div>
          <div className="stat-card-label">XP Total da Equipe</div>
          <div className="stat-card-trend trend-up">↑ +1.200 esta semana</div>
        </div>
      </div>
      <div className="section-title">Desempenho por Módulo</div>
      <div className="table-wrap" style={{ marginBottom: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Módulo</th>
              <th>Concluídos</th>
              <th>Em Andamento</th>
              <th>Taxa Conclusão</th>
              <th>Nota Média</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><b>Excelência no Atendimento</b></td><td>6</td><td>2</td><td><div className="progress-cell"><div className="progress-mini"><div className="progress-mini-fill" style={{ width: '75%' }}></div></div>75%</div></td><td><b>8.8</b></td></tr>
            <tr><td><b>Sistema de Cashback PayGas</b></td><td>5</td><td>3</td><td><div className="progress-cell"><div className="progress-mini"><div className="progress-mini-fill" style={{ width: '62%' }}></div></div>62%</div></td><td><b>8.2</b></td></tr>
            <tr><td><b>Gestão e KPIs do Posto</b></td><td>4</td><td>3</td><td><div className="progress-cell"><div className="progress-mini"><div className="progress-mini-fill" style={{ width: '57%' }}></div></div>57%</div></td><td><b>7.9</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CMSPage() {
  const mods = [
    { id: 1, title: 'Boas-Vindas à Academia PayGas', persona: 'Todos', aulas: 3, yt: true, status: 'published' },
    { id: 2, title: 'Manual do Atendente — Versão 2025', persona: 'Atendente', aulas: 8, yt: false, status: 'published' },
    { id: 3, title: 'Guia do Gestor Regional', persona: 'Gestor', aulas: 6, yt: true, status: 'published' },
    { id: 4, title: 'API PayGas — Documentação Técnica', persona: 'ERP', aulas: 5, yt: false, status: 'draft' },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Gestão de Conteúdo</div>
        <button className="btn-primary">+ Novo Módulo</button>
      </div>
      <div className="admin-tabs">
        <button className="admin-tab active">Publicados</button>
        <button className="admin-tab">Rascunhos</button>
        <button className="admin-tab">Todos</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Persona</th>
              <th>Aulas</th>
              <th>Vídeo YT</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {mods.map((mod) => (
              <tr key={mod.id}>
                <td><b>{mod.title}</b></td>
                <td><span className="track-badge badge-new">{mod.persona}</span></td>
                <td>{mod.aulas} aulas</td>
                <td><span className={`status-pill ${mod.yt ? 'pill-green' : 'pill-gray'}`}>{mod.yt ? '✓ Vinculado' : 'Sem vídeo'}</span></td>
                <td><span className={`status-pill ${mod.status === 'published' ? 'pill-green' : 'pill-orange'}`}>{mod.status === 'published' ? 'Publicado' : 'Rascunho'}</span></td>
                <td style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>✏️ Editar</button>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>👁️</button>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--pg-red)', borderColor: 'var(--pg-red)' }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsuariosPage() {
  const users = [
    { nome: 'Ana Paula Costa', email: 'ana@posto1.com.br', role: 'atendente', estado: 'SP', xp: 2400, acesso: 'Hoje', ativo: true },
    { nome: 'Carlos Mendes', email: 'carlos@posto2.com.br', role: 'gestor', estado: 'RJ', xp: 4100, acesso: 'Ontem', ativo: true },
    { nome: 'Fernanda Lima', email: 'fernanda@parceiro.com', role: 'parceiro', estado: 'MG', xp: 1800, acesso: '3 dias', ativo: true },
    { nome: 'João Santos', email: 'joao@comunidade.org', role: 'lider', estado: 'BA', xp: 3200, acesso: 'Hoje', ativo: true },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Usuários da Plataforma</div>
        <button className="btn-primary">📥 Importar Usuários</button>
      </div>
      <div className="cards-grid">
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#E6EEF9' }}>👥</div><div className="stat-card-val">4.800+</div><div className="stat-card-label">Total de Usuários</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#DCFCE7' }}>✅</div><div className="stat-card-val">4.200</div><div className="stat-card-label">Usuários Ativos</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF3C7' }}>🆕</div><div className="stat-card-val">127</div><div className="stat-card-label">Novos este mês</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF0E6' }}>🌎</div><div className="stat-card-val">27</div><div className="stat-card-label">Estados cobertos</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Estado</th>
              <th>XP</th>
              <th>Último Acesso</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '10px', flexShrink: 0, background: PERSONAS[user.role as keyof typeof PERSONAS].color }}>
                      {user.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                    <b>{user.nome}</b>
                  </div>
                </td>
                <td style={{ color: 'var(--gray-500)' }}>{user.email}</td>
                <td><span className="track-badge badge-new" style={{ fontSize: '11px' }}>{PERSONAS[user.role as keyof typeof PERSONAS].icon} {PERSONAS[user.role as keyof typeof PERSONAS].label}</span></td>
                <td>{user.estado}</td>
                <td><b style={{ color: 'var(--pg-orange)' }}>{user.xp.toLocaleString('pt-BR')}</b></td>
                <td style={{ color: 'var(--gray-500)' }}>{user.acesso}</td>
                <td><span className={`status-pill ${user.ativo ? 'pill-green' : 'pill-gray'}`}>{user.ativo ? 'Ativo' : 'Inativo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NacionalPage() {
  const regions = [
    { name: 'Norte', users: 320, pct: 68 },
    { name: 'Nordeste', users: 1140, pct: 82 },
    { name: 'Centro-Oeste', users: 480, pct: 75 },
    { name: 'Sudeste', users: 2180, pct: 91 },
    { name: 'Sul', users: 680, pct: 88 },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Painel Nacional</div>
          <div className="page-subtitle">Academia PayGas em todo o Brasil</div>
        </div>
      </div>
      <div className="cards-grid">
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#E6EEF9' }}>🌎</div><div className="stat-card-val">27</div><div className="stat-card-label">Estados Atendidos</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#DCFCE7' }}>👥</div><div className="stat-card-val">4.800+</div><div className="stat-card-label">Usuários Cadastrados</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF3C7' }}>🏆</div><div className="stat-card-val">1.240</div><div className="stat-card-label">Certificados Emitidos</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF0E6' }}>⚡</div><div className="stat-card-val">2.4M</div><div className="stat-card-label">XP Total Acumulado</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#F3E8FF' }}>📊</div><div className="stat-card-val">76%</div><div className="stat-card-label">Taxa de Engajamento</div></div>
      </div>
      <div className="map-container">
        <div className="section-title">Usuários por Região</div>
        <div className="region-grid">
          {regions.map((region, i) => (
            <div key={i} className="region-card">
              <div className="region-name">{region.name}</div>
              <div className="region-count">{region.users.toLocaleString('pt-BR')}</div>
              <div className="region-label">usuários</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnaliticaPage() {
  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Analytics</div>
      </div>
      <div className="cards-grid">
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#E6EEF9' }}>👁️</div><div className="stat-card-val">12.400</div><div className="stat-card-label">Visualizações/mês</div><div className="stat-card-trend trend-up">↑ +18%</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF3C7' }}>⏱️</div><div className="stat-card-val">42 min</div><div className="stat-card-label">Tempo Médio/sessão</div><div className="stat-card-trend trend-up">↑ +5 min</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#DCFCE7' }}>🔁</div><div className="stat-card-val">68%</div><div className="stat-card-label">Taxa de Retorno</div><div className="stat-card-trend trend-up">↑ +3%</div></div>
        <div className="stat-card"><div className="stat-card-icon" style={{ background: '#FEF0E6' }}>📱</div><div className="stat-card-val">54%</div><div className="stat-card-label">Acesso Mobile</div><div className="stat-card-trend trend-up">→ estável</div></div>
      </div>
    </div>
  )
}

function RankingPage() {
  const ranking = [
    { nome: 'Mariana Tech', role: 'Integradora', estado: 'PR', xp: 5500, avatar: 'MT' },
    { nome: 'Carlos Mendes', role: 'Gestor', estado: 'RJ', xp: 4100, avatar: 'CM' },
    { nome: 'Lúcia Ferreira', role: 'Gestora', estado: 'GO', xp: 3800, avatar: 'LF' },
    { nome: 'João Santos', role: 'Líder', estado: 'BA', xp: 3200, avatar: 'JS' },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Ranking Nacional 🥇</div>
          <div className="page-subtitle">Top alunos da Academia PayGas no Brasil</div>
        </div>
      </div>
      {ranking.map((user, i) => (
        <div key={i} className="ranking-item">
          <div className="rank-pos" style={{ color: ['#F59E0B', '#9CA3AF', '#CD7F32'][i] || 'var(--gray-600)', fontSize: i < 3 ? '20px' : '16px' }}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
          </div>
          <div className="rank-avatar" style={{ background: ['#0A2E6E', '#D97706', '#16A34A', '#7C3AED'][i] }}>{user.avatar}</div>
          <div className="rank-info">
            <b>{user.nome}</b>
            <span>{user.role} · {user.estado}</span>
          </div>
          <div className="rank-xp">{user.xp.toLocaleString('pt-BR')} XP</div>
        </div>
      ))}
    </div>
  )
}

function ConquistasPage() {
  const trophies = [
    { name: 'Primeira Aula', desc: 'Complete sua 1ª aula', icon: '📖', earned: true },
    { name: 'Maratonista', desc: '5 aulas em um dia', icon: '🏃', earned: true },
    { name: 'Certifier', desc: 'Obtenha 1 certificado', icon: '🏆', earned: true },
    { name: 'Trilheiro', desc: 'Conclua 3 trilhas', icon: '🗺️', earned: false },
    { name: 'Expert', desc: 'Nota 10 em 3 quizzes', icon: '🎯', earned: false },
    { name: 'Ranker', desc: 'Top 10 nacional', icon: '🥇', earned: false },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Conquistas ⭐</div>
          <div className="page-subtitle">Desbloqueie troféus completando módulos e desafios</div>
        </div>
      </div>
      <div className="trophy-grid">
        {trophies.map((trophy, i) => (
          <div key={i} className={`trophy-card ${trophy.earned ? 'earned' : ''} ${!trophy.earned ? 'locked' : ''}`}>
            <div className="trophy-icon">{trophy.icon}</div>
            <div className="trophy-name">{trophy.name}</div>
            <div className="trophy-desc">{trophy.desc}</div>
            {trophy.earned && <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--pg-green)', fontWeight: '700' }}>✓ Conquistado</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function NotifPage() {
  const notifs = [
    { title: 'Novo módulo disponível!', body: '"Cashback — Novidades 2025" foi publicado para você.', icon: '📚', time: 'Há 2 horas', unread: true },
    { title: 'Você subiu de nível! 🎉', body: 'Parabéns! Você alcançou o Nível 2 na Academia.', icon: '⭐', time: 'Há 1 dia', unread: true },
    { title: 'Certificado emitido', body: 'Seu certificado de Atendimento está disponível para download.', icon: '🏆', time: 'Há 4 dias', unread: false },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Notificações</div>
        <button className="btn-secondary">✓ Marcar todas como lidas</button>
      </div>
      <div className="notif-list">
        {notifs.map((notif, i) => (
          <div key={i} className={`notif-item ${notif.unread ? 'unread' : ''}`}>
            <div className="notif-icon" style={{ background: notif.unread ? 'var(--pg-orange-lt)' : 'var(--gray-100)' }}>{notif.icon}</div>
            <div className="notif-body">
              <b>{notif.title}</b>
              <p>{notif.body}</p>
              <time>{notif.time}</time>
            </div>
            {notif.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pg-orange)', marginTop: '4px', flexShrink: 0 }}></div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function PerfilPage({ user, persona, xp, tracks }: any) {
  return (
    <div className="page active">
      <div className="page-header">
        <div className="page-title">Meu Perfil</div>
      </div>
      <div className="two-col">
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '20px', background: persona?.color }}>{persona?.initials}</div>
              <div>
                <b style={{ fontSize: '18px', display: 'block', color: 'var(--gray-900)' }}>Usuário</b>
                <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{persona?.label}</span>
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

function MapaPage() {
  const regions = [
    { name: 'Norte', icon: '🌿', users: 1420, pct: 68, growth: '+12%' },
    { name: 'Nordeste', icon: '☀️', users: 3840, pct: 82, growth: '+18%' },
    { name: 'Centro-Oeste', icon: '🌾', users: 2100, pct: 75, growth: '+9%' },
    { name: 'Sudeste', icon: '🏙️', users: 4890, pct: 91, growth: '+22%' },
    { name: 'Sul', icon: '⛵', users: 2150, pct: 88, growth: '+15%' },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Mapa Nacional PayGas</div>
          <div className="page-subtitle">Distribuição de usuários e engajamento por região</div>
        </div>
        <button className="btn-primary">Exportar Relatório</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {regions.map((region, i) => (
          <div key={i} className="region-card">
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{region.icon}</div>
            <div className="region-users">{region.users.toLocaleString('pt-BR')}</div>
            <div className="region-name">{region.name}</div>
            <div className="region-pct">{Math.round(region.users / 14400 * 100)}% do Brasil · {region.growth}</div>
            <div className="track-prog-bar" style={{ marginTop: '8px' }}>
              <div className="track-prog-fill" style={{ width: region.pct + '%' }}></div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '4px' }}>{region.pct}% engajamento</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ForumPage() {
  const posts = [
    { autor: 'Carlos Mendes', av: 'CM', col: '#D97706', role: 'Gestor · RJ', tempo: 'Há 2 horas', tag: 'Case de Sucesso', titulo: 'Minha equipe zerou a trilha de atendimento em 1 semana!', preview: 'Organizamos os turnos para que cada atendente fizesse 2 aulas por dia. O NPS subiu 12 pontos no mês.', likes: 34, rep: 18 },
    { autor: 'Fernanda Lima', av: 'FL', col: '#7C3AED', role: 'Parceira · MG', tempo: 'Há 5 horas', tag: 'Dúvida', titulo: 'Como configurar o cashback automático para novos clientes?', preview: 'Estou com dificuldade no passo 3 da trilha do terminal. Quando o cliente não tem CPF cadastrado, o sistema rejeita.', likes: 12, rep: 24 },
    { autor: 'João Santos', av: 'JS', col: '#0891B2', role: 'Líder · BA', tempo: 'Há 1 dia', tag: 'Dica', titulo: 'Dica: use o WhatsApp para engajar a comunidade no cashback', preview: 'Criei um grupo e mando um print toda semana com o cashback acumulado. A adesão saltou de 30% para 78%!', likes: 67, rep: 31 },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Fórum da Comunidade</div>
          <div className="page-subtitle">Conecte-se com profissionais PayGas de todo o Brasil</div>
        </div>
        <button className="btn-primary">+ Nova Publicação</button>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button className="track-badge badge-progress" style={{ cursor: 'pointer', padding: '6px 14px' }}>Todos</button>
        <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px' }}>Dúvidas</button>
        <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px' }}>Dicas</button>
        <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px' }}>Cases de Sucesso</button>
        <button className="track-badge badge-new" style={{ cursor: 'pointer', padding: '6px 14px' }}>Técnico</button>
      </div>
      {posts.map((post, i) => (
        <div key={i} className="forum-post">
          <div className="forum-author">
            <div className="forum-avatar" style={{ background: post.col }}>{post.av}</div>
            <div className="forum-meta">
              <b>{post.autor}</b>
              <span>{post.role} · {post.tempo}</span>
            </div>
            <span className="track-badge badge-done" style={{ marginLeft: 'auto' }}>{post.tag}</span>
          </div>
          <div className="forum-title">{post.titulo}</div>
          <div className="forum-preview">{post.preview}</div>
          <div className="forum-footer">
            <span>❤️ {post.likes} curtidas</span>
            <span>💬 {post.rep} respostas</span>
            <span>🔖 Salvar</span>
            <span style={{ marginLeft: 'auto', color: 'var(--pg-orange)', fontWeight: '600' }}>Ler mais →</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AIAssistant({ user, persona, onClose }: any) {
  const [messages, setMessages] = useState<Array<{ text: string; type: 'user' | 'bot' }>>([
    { text: `Olá, ${persona?.label}! Posso ajudar com suas dúvidas sobre a Academia PayGas.`, type: 'bot' }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    setMessages([...messages, { text: input, type: 'user' }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, { text: 'Entendido! Consulte as trilhas disponíveis para mais detalhes sobre este tema.', type: 'bot' }])
    }, 1000)
  }

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-header-icon">🤖</div>
        <div className="ai-header-info">
          <b>Assistente PayGas IA</b>
          <span>Online agora</span>
        </div>
        <button className="ai-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="ai-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ${msg.type}`}>{msg.text}</div>
        ))}
      </div>
      <div className="ai-input-area">
        <div className="ai-quick">
          <button onClick={() => setInput('Como funciona o cashback?')}>Como funciona o cashback?</button>
          <button onClick={() => setInput('Quais trilhas devo fazer?')}>Quais trilhas devo fazer?</button>
          <button onClick={() => setInput('Como ganhar mais XP?')}>Como ganhar mais XP?</button>
        </div>
        <div className="ai-input-row">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte ao assistente..."
          />
          <button className="ai-send" onClick={handleSend}>➤</button>
        </div>
      </div>
    </div>
  )
}

export default App
