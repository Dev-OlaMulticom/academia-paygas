import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { APP_VERSION } from '../lib/constants'

interface LoginPageProps {
  onLogin: (user: any, token: string) => Promise<void>
}

const isProd = import.meta.env.PROD

type ViewMode = 'login' | 'forgot' | 'code-sent' | 'reset'

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [email, setEmail] = useState(isProd ? '' : 'admin@paygas.com.br')
  const [password, setPassword] = useState(isProd ? '' : '123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [publicStats, setPublicStats] = useState<any>(null)

  const [view, setView] = useState<ViewMode>('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  // Acesso PayGas modal state
  const [payGasModal, setPayGasModal] = useState(false)
  const [payGasType, setPayGasType] = useState<'cpf' | 'email'>('cpf')
  const [payGasInput, setPayGasInput] = useState('')
  const [payGasLoading, setPayGasLoading] = useState(false)
  const [payGasError, setPayGasError] = useState('')
  const [payGasSuccess, setPayGasSuccess] = useState('')

  useEffect(() => {
    api.getPublicStats().then(setPublicStats).catch(() => {})
  }, [])

  const handleLogin = async () => {
    if (!email) { setError('Informe seu e-mail!'); return }
    if (!password) { setError('Informe sua senha!'); return }
    setLoading(true)
    setError('')
    try {
      const data = await api.login(email, password)
      await onLogin(data.user, data.token)
      navigate(redirectTo)
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!resetEmail) { setResetError('Informe seu e-mail!'); return }
    setResetLoading(true)
    setResetError('')
    setResetSuccess('')
    try {
      await api.forgotPassword(resetEmail)
      setView('code-sent')
      setResetSuccess('Codigo enviado! Verifique seu email.')
    } catch (err: any) {
      setResetError(err.message || 'Erro ao enviar codigo')
    } finally {
      setResetLoading(false)
    }
  }

  const handleVerifyCode = () => {
    if (!resetCode || resetCode.length !== 6) { setResetError('Informe o codigo de 6 digitos!'); return }
    setView('reset')
    setResetError('')
  }

  const handleResetPassword = async () => {
    if (!resetNewPassword || !resetConfirmPassword) { setResetError('Preencha ambos os campos de senha!'); return }
    if (resetNewPassword.length < 8) { setResetError('A senha deve ter pelo menos 8 caracteres!'); return }
    if (resetNewPassword !== resetConfirmPassword) { setResetError('As senhas nao coincidem!'); return }
    setResetLoading(true)
    setResetError('')
    try {
      await api.resetPassword(resetEmail, resetCode, resetNewPassword, resetConfirmPassword)
      setResetSuccess('Senha redefinida com sucesso!')
      setView('login')
      setEmail(resetEmail)
      setPassword('')
      setResetEmail('')
      setResetCode('')
      setResetNewPassword('')
      setResetConfirmPassword('')
    } catch (err: any) {
      setResetError(err.message || 'Erro ao redefinir senha')
    } finally {
      setResetLoading(false)
    }
  }

  // ───── Acesso PayGas helpers + handlers ─────
  function formatCpf(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  function formatEmail(value: string): string {
    return value.replace(/\s/g, '').slice(0, 254)
  }

  function openPayGasModal() {
    setPayGasModal(true)
    setPayGasType('cpf')
    setPayGasInput('')
    setPayGasError('')
    setPayGasSuccess('')
  }

  function closePayGasModal() {
    if (payGasLoading) return
    setPayGasModal(false)
    setPayGasInput('')
    setPayGasError('')
    setPayGasSuccess('')
  }

  async function handlePayGasAccess() {
    setPayGasError('')
    setPayGasSuccess('')

    const trimmed = payGasInput.trim()
    if (!trimmed) {
      setPayGasError(payGasType === 'cpf' ? 'Informe seu CPF.' : 'Informe seu e-mail.')
      return
    }
    if (payGasType === 'cpf') {
      const digits = trimmed.replace(/\D/g, '')
      if (digits.length !== 11) {
        setPayGasError('CPF deve conter 11 dígitos.')
        return
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setPayGasError('E-mail inválido.')
      return
    }

    setPayGasLoading(true)
    try {
      const payload = payGasType === 'cpf' ? { cpf: trimmed.replace(/\D/g, '') } : { email: trimmed.toLowerCase() }
      const data = await api.paygasAccess(payload)
      setPayGasSuccess(data.message || 'Acesso liberado!')
      await onLogin(data.user, data.token)
      // small delay so user sees the success message before redirect
      setTimeout(() => {
        navigate(redirectTo)
      }, 600)
    } catch (err: any) {
      setPayGasError(err.message || 'Erro ao acessar via PayGas')
    } finally {
      setPayGasLoading(false)
    }
  }

  const renderLoginForm = () => (
    <>
      {error && <div className="login-alert error">{error}</div>}
      <div className="field">
        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
      </div>
      <div className="field">
        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <button className="btn-login" onClick={handleLogin} disabled={loading}>
        {loading ? 'Entrando...' : 'Acessar Academia'}
      </button>
      <button
        type="button"
        className="btn-login btn-login-secondary"
        onClick={openPayGasModal}
        disabled={loading}
        style={{ marginTop: 10, background: 'transparent', color: '#F47C20', border: '1px solid #F47C20' }}
      >
        Acesso PayGas
      </button>
      <div className="login-forgot-link">
        <button type="button" className="login-link-btn" onClick={() => { setView('forgot'); setResetEmail(email); setResetError(''); setResetSuccess('') }}>
          Esqueci minha senha
        </button>
      </div>
    </>
  )

  const renderForgotForm = () => (
    <>
      <button type="button" className="login-back-btn" onClick={() => { setView('login'); setResetError(''); setResetSuccess('') }}>
        <i className="icon-arrow-left icon-sm" /> Voltar ao login
      </button>
      <h2 className="login-heading">Recuperar Senha</h2>
      <p className="login-desc">Informe o email da sua conta. Voce recebera um codigo de 6 digitos para redefinir sua senha.</p>
      {resetError && <div className="login-alert error">{resetError}</div>}
      {resetSuccess && <div className="login-alert success">{resetSuccess}</div>}
      <div className="field">
        <label>E-mail</label>
        <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="seu@email.com" />
      </div>
      <button className="btn-login" onClick={handleForgotPassword} disabled={resetLoading}>
        {resetLoading ? 'Enviando...' : 'Enviar Codigo'}
      </button>
    </>
  )

  const renderCodeSentForm = () => (
    <>
      <button type="button" className="login-back-btn" onClick={() => { setView('forgot'); setResetError(''); setResetSuccess('') }}>
        <i className="icon-arrow-left icon-sm" /> Voltar
      </button>
      <h2 className="login-heading">Codigo Enviado</h2>
      <p className="login-desc">Um codigo de 6 digitos foi enviado para <strong>{resetEmail}</strong>. O codigo expira em 15 minutos.</p>
      {resetError && <div className="login-alert error">{resetError}</div>}
      {resetSuccess && <div className="login-alert success">{resetSuccess}</div>}
      <div className="field">
        <label>Codigo de Verificacao</label>
        <input className="login-code-input" type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} />
      </div>
      <button className="btn-login" onClick={handleVerifyCode}>Verificar Codigo</button>
      <div className="login-resend">
        <button type="button" className="login-link-btn" onClick={handleForgotPassword}>Reenviar codigo</button>
      </div>
    </>
  )

  const renderResetForm = () => (
    <>
      <button type="button" className="login-back-btn" onClick={() => { setView('code-sent'); setResetError(''); setResetSuccess('') }}>
        <i className="icon-arrow-left icon-sm" /> Voltar
      </button>
      <h2 className="login-heading">Redefinir Senha</h2>
      <p className="login-desc">Codigo verificado! Agora defina sua nova senha.</p>
      {resetError && <div className="login-alert error">{resetError}</div>}
      {resetSuccess && <div className="login-alert success">{resetSuccess}</div>}
      <div className="field">
        <label>Nova Senha</label>
        <input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="Minimo 8 caracteres" />
      </div>
      <div className="field">
        <label>Confirmar Senha</label>
        <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Repita a senha" />
      </div>
      <button className="btn-login" onClick={handleResetPassword} disabled={resetLoading}>
        {resetLoading ? 'Redefinindo...' : 'Redefinir Senha'}
      </button>
    </>
  )

  const renderPayGasModal = () => (
    <div className="modal-overlay" onClick={closePayGasModal}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <button type="button" className="login-back-btn" onClick={closePayGasModal}>
          <i className="icon-arrow-left icon-sm" /> Voltar ao login
        </button>
        <h2 className="login-heading">Acesso PayGas</h2>
        <p className="login-desc">Entre com seu CPF ou e-mail cadastrado no sistema PayGas para acessar a Academia.</p>

        <div className="paygas-type-toggle" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => { setPayGasType('cpf'); setPayGasInput(''); setPayGasError('') }}
            disabled={payGasLoading}
            className={`btn-secondary ${payGasType === 'cpf' ? 'active' : ''}`}
            style={{
              flex: 1,
              background: payGasType === 'cpf' ? '#F47C20' : 'transparent',
              color: payGasType === 'cpf' ? '#fff' : '#F47C20',
              border: '1px solid #F47C20',
            }}
          >
            CPF
          </button>
          <button
            type="button"
            onClick={() => { setPayGasType('email'); setPayGasInput(''); setPayGasError('') }}
            disabled={payGasLoading}
            className={`btn-secondary ${payGasType === 'email' ? 'active' : ''}`}
            style={{
              flex: 1,
              background: payGasType === 'email' ? '#F47C20' : 'transparent',
              color: payGasType === 'email' ? '#fff' : '#F47C20',
              border: '1px solid #F47C20',
            }}
          >
            E-mail
          </button>
        </div>

        {payGasError && <div className="login-alert error">{payGasError}</div>}
        {payGasSuccess && <div className="login-alert success">{payGasSuccess}</div>}

        <div className="field">
          <label>{payGasType === 'cpf' ? 'CPF' : 'E-mail'}</label>
          <input
            type={payGasType === 'cpf' ? 'text' : 'email'}
            inputMode={payGasType === 'cpf' ? 'numeric' : 'email'}
            value={payGasInput}
            onChange={(e) => setPayGasInput(payGasType === 'cpf' ? formatCpf(e.target.value) : formatEmail(e.target.value))}
            placeholder={payGasType === 'cpf' ? '000.000.000-00' : 'seu@email.com'}
            maxLength={payGasType === 'cpf' ? 14 : 254}
            autoComplete="off"
          />
        </div>

        <button className="btn-login" onClick={handlePayGasAccess} disabled={payGasLoading}>
          {payGasLoading ? 'Verificando...' : 'Acessar'}
        </button>
      </div>
    </div>
  )

  return (
    <div id="screen-login">
      <div className="login-panel">
        <div className="login-logo">
          <div className="login-logo-icon">PG</div>
          <div className="login-logo-text">
            <b>Academia PayGas</b>
            <span>Plataforma de Capacitacao</span>
          </div>
        </div>
        {view === 'login' && (<><h2>Bem-vindo de volta!</h2><p>Acesse sua conta para continuar aprendendo e crescendo no ecossistema PayGas.</p></>)}
        {view === 'forgot' && <h2>Recuperar Senha</h2>}
        {view === 'code-sent' && <h2>Verificar Codigo</h2>}
        {view === 'reset' && <h2>Redefinir Senha</h2>}

        {view === 'login' && renderLoginForm()}
        {view === 'forgot' && renderForgotForm()}
        {view === 'code-sent' && renderCodeSentForm()}
        {view === 'reset' && renderResetForm()}

        <p className="login-terms">
          Ao acessar, voce concorda com os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Politica de Privacidade</Link>.
        </p>
      </div>
      <div className="login-bg">
        <span className="ver-badge-login">{APP_VERSION} — Sistema</span>
        <div className="login-bg-content">
          <h1>Capacitacao<br/>em um so lugar</h1>
          <p>A Academia PayGas conecta postos, parceiros e comunidades em todo o Brasil com conteudo profissional, modulos personalizados e certificacao reconhecida.</p>
          <div className="login-stats login-stats-grid">
            <div className="login-stat"><b>{publicStats?.alunos?.toLocaleString('pt-BR') || '—'}</b><span>Usuarios ativos</span></div>
            <div className="login-stat"><b>{publicStats?.notas || '—'}</b><span>Modulos disponiveis</span></div>
            <div className="login-stat"><b>{publicStats?.horas || '—'}</b><span>Horas de conteudo</span></div>
            <div className="login-stat"><b>{publicStats?.certificados || '—'}</b><span>Certificados emitidos</span></div>
          </div>
        </div>
      </div>
      {payGasModal && renderPayGasModal()}
    </div>
  )
}
