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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F47C20 0%, #C45E0A 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ color: '#333', marginBottom: '8px' }}>Verificando...</h2>
            <p style={{ color: '#666' }}>Aguarde enquanto verificamos seu email.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '8px' }}>Email Verificado!</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>{message}</p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'linear-gradient(135deg, #F47C20 0%, #C45E0A 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Acessar a Plataforma
            </button>
          </>
        )}

        {status === 'already' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>ℹ️</div>
            <h2 style={{ color: '#2563eb', marginBottom: '8px' }}>Ja Verificado</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>{message}</p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'linear-gradient(135deg, #F47C20 0%, #C45E0A 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Fazer Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ color: '#dc2626', marginBottom: '8px' }}>Erro na Verificacao</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>{message}</p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#666',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Voltar ao Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
