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
  <div style="font-size:16px;margin-bottom:40px;">concluiu o modulo de <strong>{{MODULO_TITULO}}</strong> com sucesso.</div>
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
    const titulo = cert.moduloTitulo || 'Modulo'
    const icone = cert.moduloIcone || '📚'
    const nome = cert.user?.nome || 'Usuario'
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
      .replace(/\{\{USUARIO_NOME\}\}/g, 'Joao da Silva')
      .replace(/\{\{DATA\}\}/g, new Date().toLocaleDateString('pt-BR'))
  }

  const statusClass = (status: string) => status === 'APPROVED' ? 'approved' : 'pending'
  const statusLabel = (status: string) => status === 'APPROVED' ? 'Aprovado' : status === 'ISSUED' ? 'Emitido' : 'Pendente'

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
          <div className="cert-tab-bar">
            <button id="tab-meus-cert" className={`tab-btn ${tab === 'meus' ? 'active' : ''}`} onClick={() => setTab('meus')}>Meus Certificados</button>
            <button id="tab-templates" className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</button>
          </div>
        )}
      </div>

      {tab === 'meus' ? (
        <div className="cards-grid cert-grid">
          {certificates.length === 0 ? (
            <div className="cert-empty">Nenhum certificado encontrado</div>
          ) : (
            certificates.map((cert) => (
              <div key={cert.id} className="stat-card cert-card">
                <div className="cert-card-header">
                  <div className="cert-card-icon">{cert.moduloIcone || '🏆'}</div>
                  <span className={`cert-card-badge ${statusClass(cert.status)}`}>{statusLabel(cert.status)}</span>
                </div>
                <div className="cert-card-title">{cert.moduloTitulo || 'Modulo'}</div>
                {cert.user && <div className="cert-card-user">{cert.user.nome}</div>}
                <div className="cert-card-date">{cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('pt-BR') : ''}</div>
                <button id={`btn-download-cert-${cert.id}`} className="cert-card-btn" onClick={() => handleDownloadHTML(cert)}>Baixar HTML</button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <div className="cards-grid cert-grid-templates">
            {modulos.map(mod => (
              <div key={mod.id} className="stat-card cert-template-card">
                <div className="cert-template-header">
                  <span className="cert-template-title">{mod.icone || '📚'} {mod.titulo}</span>
                  <button id={`btn-edit-template-${mod.id}`} className="btn-secondary cert-template-edit-btn" onClick={() => handleEditTemplate(mod)}>
                    <i className="icon-pencil icon-xs" /> Editar Template
                  </button>
                </div>
                <div className="cert-template-preview" dangerouslySetInnerHTML={{ __html: renderPreview(mod.certificadoTemplate || DEFAULT_CERT_TEMPLATE, mod) }} />
              </div>
            ))}
          </div>

          {editingModulo && (
            <div className="modal-overlay">
              <div className="cert-modal">
                <h3>Template: {editingModulo.icone} {editingModulo.titulo}</h3>
                <p className="cert-modal-desc">Variaveis: {'{{MODULO_ICONE}}'} {'{{MODULO_TITULO}}'} {'{{USUARIO_NOME}}'} {'{{DATA}}'}</p>
                <div className="form-field">
                  <label className="form-label">HTML do Template</label>
                  <textarea id="template-editor" className="form-input cert-modal-textarea" value={templateText} onChange={e => setTemplateText(e.target.value)} rows={12} />
                </div>
                <div className="form-field">
                  <label className="form-label">Previa</label>
                  <div id="template-preview" className="cert-modal-preview" dangerouslySetInnerHTML={{ __html: renderPreview(templateText, editingModulo) }} />
                </div>
                <div className="cert-modal-footer">
                  <button id="btn-salvar-template" className="btn-primary" onClick={handleSaveTemplate} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Template'}</button>
                  <button id="btn-cancelar-template" className="btn-secondary" onClick={() => setEditingModulo(null)}>Cancelar</button>
                  <button id="btn-reset-template" className="btn-secondary cert-modal-reset" onClick={() => setTemplateText(DEFAULT_CERT_TEMPLATE)}>Restaurar Padrao</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
