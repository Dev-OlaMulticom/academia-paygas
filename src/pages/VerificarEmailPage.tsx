import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export function VerificarEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Token de verificacao nao fornecido.')
      return
    }

    api.verifyEmail(token)
      .then((result) => {
        if (result.alreadyVerified) {
          setStatus('already')
          setMessage('Seu email ja foi verificado anteriormente.')
        } else {
          setStatus('success')
          setMessage('Email verificado com sucesso! Sua conta esta ativa.')
        }
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || 'Erro ao verificar email. Token invalido ou expirado.')
      })
  }, [searchParams])

  return (
    <div className="verify-page">
      <div className="verify-card">
        {status === 'loading' && (
          <>
            <div className="verify-icon">⏳</div>
            <h2 className="verify-title loading">Verificando...</h2>
            <p className="verify-desc">Aguarde enquanto verificamos seu email.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verify-icon">✅</div>
            <h2 className="verify-title success">Email Verificado!</h2>
            <p className="verify-desc">{message}</p>
            <button className="verify-btn-primary" onClick={() => navigate('/login')}>
              Acessar a Plataforma
            </button>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="verify-icon">ℹ️</div>
            <h2 className="verify-title already">Ja Verificado</h2>
            <p className="verify-desc">{message}</p>
            <button className="verify-btn-primary" onClick={() => navigate('/login')}>
              Fazer Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verify-icon">❌</div>
            <h2 className="verify-title error">Erro na Verificacao</h2>
            <p className="verify-desc">{message}</p>
            <button className="verify-btn-secondary" onClick={() => navigate('/login')}>
              Voltar ao Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
