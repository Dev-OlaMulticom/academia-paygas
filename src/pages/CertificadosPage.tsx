import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

interface Certificate {
  id: string
  moduloId: string
  moduloTitulo?: string
  moduloIcone?: string
  moduloCertTemplate?: string
  status: string
  pdfUrl?: string
  createdAt?: string
  user?: { nome: string; email: string }
}

interface ModuloCert {
  id: string
  titulo: string
  icone?: string
  certificadoTemplate?: string
}

const DEFAULT_CERT_TEMPLATE = `<div style="width:800px;padding:40px;background:linear-gradient(135deg,#0A2E6E 0%,#1a4494 100%);color:white;border-radius:20px;text-align:center;font-family:Arial,sans-serif;">
  <div style="font-size:14px;letter-spacing:3px;margin-bottom:8px;">ACADEMIA PAYGAS</div>
  <div style="font-size:28px;margin-bottom:20px;">{{MODULO_ICONE}} {{MODULO_TITULO}}</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-bottom:10px;">Certificamos que</div>
  <div style="font-size:32px;font-weight:bold;margin:20px 0;border-bottom:2px solid rgba(255,255,255,0.3);padding-bottom:20px;">{{USUARIO_NOME}}</div>
  <div style="font-size:16px;margin-bottom:40px;">concluiu o módulo de <strong>{{MODULO_TITULO}}</strong> com sucesso.</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:40px;">
    <span style="font-size:13px;">{{DATA}}</span>
    <div style="width:80px;height:80px;background:#F47C20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;">PG</div>
  </div>
</div>`

export function CertificadosPage({ user }: { user?: any }) {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [modulos, setModulos] = useState<ModuloCert[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'meus' | 'templates'>('meus')
  const [editingModulo, setEditingModulo] = useState<ModuloCert | null>(null)
  const [templateText, setTemplateText] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  const loadCertificates = useCallback(async () => {
    try {
      const result = await api.getCertificates()
      const data = Array.isArray(result) ? result : (result as any)?.data || []
      setCertificates(data.map((c: any) => ({
        ...c,
        moduloTitulo: c.modulo?.titulo,
        moduloIcone: c.modulo?.icone,
        moduloCertTemplate: c.modulo?.certificadoTemplate,
      })))
    } catch {
      setCertificates([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadModulos = useCallback(async () => {
    try {
      const mods = await api.getCmsModulos()
      setModulos(mods.map((m: any) => ({ id: m.id, titulo: m.titulo, icone: m.icone, certificadoTemplate: m.certificadoTemplate })))
    } catch {
      setModulos([])
    }
  }, [])

  useEffect(() => {
    loadCertificates()
    if (isAdmin) loadModulos()
  }, [loadCertificates, loadModulos, isAdmin])

  const handleDownloadHTML = (cert: Certificate) => {
    const template = cert.moduloCertTemplate || DEFAULT_CERT_TEMPLATE
    const titulo = cert.moduloTitulo || 'Módulo'
    const icone = cert.moduloIcone || '📚'
    const nome = cert.user?.nome || 'Usuário'
    const html = `<!DOCTYPE html><html><head><title>Certificado - ${titulo}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">${template.replace(/\{\{MODULO_ICONE\}\}/g, icone).replace(/\{\{MODULO_TITULO\}\}/g, titulo).replace(/\{\{USUARIO_NOME\}\}/g, nome).replace(/\{\{DATA\}\}/g, new Date().toLocaleDateString('pt-BR'))}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certificado-${cert.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleEditTemplate = (mod: ModuloCert) => {
    setEditingModulo(mod)
    setTemplateText(mod.certificadoTemplate || DEFAULT_CERT_TEMPLATE)
  }

  const handleSaveTemplate = async () => {
    if (!editingModulo) return
    setSaving(true)
    try {
      await api.updateModulo(editingModulo.id, { certificadoTemplate: templateText })
      setModulos(mods => mods.map(m => m.id === editingModulo.id ? { ...m, certificadoTemplate: templateText } : m))
      setEditingModulo(null)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const renderPreview = (template: string, mod?: ModuloCert) => {
    return template
      .replace(/\{\{MODULO_ICONE\}\}/g, mod?.icone || '📚')
      .replace(/\{\{MODULO_TITULO\}\}/g, mod?.titulo || 'Nome do Curso')
      .replace(/\{\{USUARIO_NOME\}\}/g, 'João da Silva')
      .replace(/\{\{DATA\}\}/g, new Date().toLocaleDateString('pt-BR'))
  }

  if (loading) {
    return (
      <div className="page active">
        <div className="page-header"><div><div className="page-title">Certificados</div><div className="page-subtitle">Carregando...</div></div></div>
      </div>
    )
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Certificados</div>
          <div className="page-subtitle">{isAdmin && tab === 'templates' ? 'Gerenciar templates de certificados por curso' : 'Conquistas oficiais emitidas pela Academia PayGas'}</div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button id="tab-meus-cert" className={`tab-btn ${tab === 'meus' ? 'active' : ''}`} onClick={() => setTab('meus')}>Meus Certificados</button>
            <button id="tab-templates" className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</button>
          </div>
        )}
      </div>

      {tab === 'meus' ? (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {certificates.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>Nenhum certificado encontrado</div>
          ) : (
            certificates.map((cert) => (
              <div key={cert.id} className="stat-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px' }}>{cert.moduloIcone || '🏆'}</div>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: cert.status === 'APPROVED' ? '#DCFCE7' : '#FEF3C7', color: cert.status === 'APPROVED' ? '#166534' : '#92400E' }}>
                    {cert.status === 'APPROVED' ? 'Aprovado' : cert.status === 'ISSUED' ? 'Emitido' : 'Pendente'}
                  </span>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{cert.moduloTitulo || 'Módulo'}</div>
                {cert.user && <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{cert.user.nome}</div>}
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '12px' }}>{cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('pt-BR') : ''}</div>
                <button id={`btn-download-cert-${cert.id}`} onClick={() => handleDownloadHTML(cert)} style={{ width: '100%', padding: '8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Baixar HTML</button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {modulos.map(mod => (
              <div key={mod.id} className="stat-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold' }}>{mod.icone || '📚'} {mod.titulo}</span>
                  <button id={`btn-edit-template-${mod.id}`} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => handleEditTemplate(mod)}>
                    <i className="icon-pencil icon-xs" /> Editar Template
                  </button>
                </div>
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px', background: '#f9f9f9', overflow: 'auto', maxHeight: '120px' }} dangerouslySetInnerHTML={{ __html: renderPreview(mod.certificadoTemplate || DEFAULT_CERT_TEMPLATE, mod) }} />
              </div>
            ))}
          </div>

          {editingModulo && (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: '24px', width: '800px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '12px' }}>Template: {editingModulo.icone} {editingModulo.titulo}</h3>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '12px' }}>
                  Variáveis: {'{{MODULO_ICONE}}'} {'{{MODULO_TITULO}}'} {'{{USUARIO_NOME}}'} {'{{DATA}}'}
                </p>
                <div className="form-field">
                  <label className="form-label">HTML do Template</label>
                  <textarea id="template-editor" className="form-input" value={templateText} onChange={e => setTemplateText(e.target.value)} rows={12} style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Prévia</label>
                  <div id="template-preview" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '16px', background: '#f5f5f5', display: 'flex', justifyContent: 'center', overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: renderPreview(templateText, editingModulo) }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button id="btn-salvar-template" className="btn-primary" onClick={handleSaveTemplate} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Template'}</button>
                  <button id="btn-cancelar-template" className="btn-secondary" onClick={() => setEditingModulo(null)}>Cancelar</button>
                  <button id="btn-reset-template" className="btn-secondary" style={{ marginLeft: 'auto', fontSize: '11px' }} onClick={() => setTemplateText(DEFAULT_CERT_TEMPLATE)}>Restaurar Padrão</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
