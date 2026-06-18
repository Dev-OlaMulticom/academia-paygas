import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

interface Certificate {
  id: string
  moduloId: string
  moduloTitulo?: string
  status: string
  pdfUrl?: string
  createdAt?: string
}

export function CertificadosPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const loadCertificates = useCallback(async () => {
    try {
      const data = await api.getCertificates()
      setCertificates(data || [])
    } catch {
      setCertificates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCertificates()
  }, [loadCertificates])

  const handleDownloadHTML = (cert: Certificate) => {
    const titulo = cert.moduloTitulo || 'Módulo'
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificado - ${titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
          .cert { width: 800px; padding: 40px; background: linear-gradient(135deg, #0A2E6E 0%, #1a4494 100%); color: white; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
          .cert h3 { font-size: 24px; margin-bottom: 10px; letter-spacing: 3px; }
          .cert h2 { font-size: 36px; margin-bottom: 30px; }
          .cert p { font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 20px; }
          .cert .name { font-size: 32px; font-weight: bold; margin: 20px 0; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 20px; }
          .cert .desc { font-size: 16px; margin-bottom: 40px; }
          .cert .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
          .cert .seal { width: 80px; height: 80px; background: #F47C20; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="cert">
          <h3>ACADEMIA PAYGAS</h3>
          <h2>${titulo}</h2>
          <p>Certificamos que</p>
          <div class="name">Usuário</div>
          <div class="desc">concluiu o módulo de <strong>${titulo}</strong> com êxito.</div>
          <div class="footer">
            <span>${new Date().toLocaleDateString('pt-BR')}</span>
            <div class="seal">PG</div>
          </div>
        </div>
      </body>
      </html>
    `
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certificado-${cert.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <div className="page-title">Meus Certificados</div>
            <div className="page-subtitle">Carregando...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Meus Certificados</div>
          <div className="page-subtitle">Conquistas oficiais emitidas pela Academia PayGas</div>
        </div>
      </div>
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {certificates.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
            Nenhum certificado encontrado
          </div>
        ) : (
          certificates.map((cert) => (
            <div key={cert.id} className="stat-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px' }}>🏆</div>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: cert.status === 'APPROVED' ? '#DCFCE7' : '#FEF3C7',
                  color: cert.status === 'APPROVED' ? '#166534' : '#92400E',
                }}>
                  {cert.status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                </span>
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{cert.moduloTitulo || 'Módulo'}</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '12px' }}>
                {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('pt-BR') : ''}
              </div>
              <button
                onClick={() => handleDownloadHTML(cert)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Baixar HTML
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
