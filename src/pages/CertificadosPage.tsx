

interface CertificadosPageProps {
  tracks: any[]
}

export function CertificadosPage({ tracks }: CertificadosPageProps) {
  const handleDownloadPDF = (track: any) => {
    alert(`Gerando PDF para ${track.label}...`)
  }

  const handleDownloadHTML = (track: any) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificado - ${track.label}</title>
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
          <h2>${track.label}</h2>
          <p>Certificamos que</p>
          <div class="name">Usuário</div>
          <div class="desc">concluiu a trilha de <strong>${track.label}</strong> com êxito.</div>
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
    a.download = `certificado-${track.id}.html`
    a.click()
    URL.revokeObjectURL(url)
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
              <button className="btn-success" style={{ fontSize: '12px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadPDF(track)}><i className="icon-download icon-sm" /> Baixar PDF</button>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadHTML(track)}><i className="icon-file-text icon-sm" /> Baixar HTML</button>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><i className="icon-share-2 icon-sm" /> Compartilhar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
