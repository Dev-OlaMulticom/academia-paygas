import { useState } from 'react'

interface LoginPageProps {
  onLogin: (email: string, password: string, role: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
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
            <option value="ADMIN">🌐 Administrador</option>
            <option value="GESTOR">⛽ Gestor de Posto</option>
            <option value="ATENDENTE">👤 Atendente/Frentista</option>
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
