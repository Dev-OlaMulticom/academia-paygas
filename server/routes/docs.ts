import { Router, Request, Response } from 'express'

const router = Router()

function getApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Academia PayGas API (Express Server)',
      description: 'API REST para el sistema de aprendizaje Academia PayGas. Backend Express.js con Prisma ORM y MySQL.',
      version: '1.0.0',
      contact: { name: 'PayGas', url: 'https://paygas.com' },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local Development' },
      { url: 'https://api.academia-paygas.com', description: 'Production' },
    ],
    authentication: {
      type: 'Bearer JWT',
      header: 'Authorization: Bearer <token>',
      description: 'Obtener token via POST /api/auth/login. Token valido por 24h.',
      ObtenerToken: 'POST /api/auth/login { email, password } -> { token, user }',
    },
    encryption: {
      type: 'AES-256-GCM',
      description: 'Todos los requests POST/PUT/PATCH van encriptados. El payload debe ser un objeto { payload: "base64string" }.',
      middleware: 'encryptedPayload (global)',
    },
    roles: {
      ADMIN: { description: 'Administrador completo - acceso total a todas las operaciones CRUD' },
      GESTOR: { description: 'Gestor de Posto - puede gestionar usuarios ATENDENTE y contenido' },
      ATENDENTE: { description: 'Atendente - solo lectura y progreso propio' },
    },
    endpoints: [
      // AUTH
      { method: 'POST', path: '/api/auth/login', summary: 'Iniciar sesion', tags: ['Auth'], permission: 'public', request_body: { required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }, response: { token: 'string (JWT)', user: { id: 'string', email: 'string', nome: 'string', role: 'string' } } },
      { method: 'GET', path: '/api/auth/me', summary: 'Obtener usuario autenticado', tags: ['Auth'], permission: 'authenticated', response: { id: 'string', email: 'string', nome: 'string', role: 'string', createdAt: 'datetime', lastLogin: 'datetime|null' } },

      // USUARIOS
      { method: 'GET', path: '/api/usuarios', summary: 'Listar usuarios', tags: ['Usuarios'], permission: 'ADMIN, GESTOR', response: { type: 'array', items: { id: 'string', email: 'string', nome: 'string', role: 'string', gestorId: 'string|null', createdAt: 'datetime', lastLogin: 'datetime|null', xp: 'number', progressCount: 'number', certCount: 'number' } } },
      { method: 'POST', path: '/api/usuarios', summary: 'Crear usuario', tags: ['Usuarios'], permission: 'ADMIN, GESTOR', request_body: { required: ['email', 'nome', 'senha', 'role'], properties: { email: { type: 'string', format: 'email' }, nome: { type: 'string' }, senha: { type: 'string' }, role: { type: 'string', enum: ['ADMIN', 'GESTOR', 'ATENDENTE'] } } } },
      { method: 'PUT', path: '/api/usuarios/:id', summary: 'Actualizar usuario', tags: ['Usuarios'], permission: 'ADMIN', request_body: { optional: ['nome', 'email', 'role', 'gestorId'] } },
      { method: 'DELETE', path: '/api/usuarios/:id', summary: 'Eliminar usuario', tags: ['Usuarios'], permission: 'ADMIN' },
      { method: 'GET', path: '/api/usuarios/equipe', summary: 'Obtener equipo del gestor', tags: ['Usuarios'], permission: 'ADMIN, GESTOR', response: { type: 'array', items: { id: 'string', nome: 'string', email: 'string', role: 'string', xp: 'number', certCount: 'number' } } },

      // TRILHAS
      { method: 'GET', path: '/api/trilhas', summary: 'Listar trilhas de aprendizaje', tags: ['Trilhas'], permission: 'authenticated', response: { type: 'array', items: { id: 'string', titulo: 'string', descricao: 'string', icon: 'string', color: 'string', obrigatorio: 'boolean', lessons: 'number', createdAt: 'datetime', updatedAt: 'datetime' } } },
      { method: 'POST', path: '/api/trilhas', summary: 'Crear trilha', tags: ['Trilhas'], permission: 'ADMIN', request_body: { required: ['titulo'], optional: ['descricao', 'icon', 'color', 'obrigatorio'], properties: { titulo: { type: 'string' }, descricao: { type: 'string' }, icon: { type: 'string', description: 'Emoji icon (ej: 📚)' }, color: { type: 'string', description: 'Hex color (ej: #E6EEF9)' }, obrigatorio: { type: 'boolean' } } } },
      { method: 'PUT', path: '/api/trilhas/:id', summary: 'Actualizar trilha', tags: ['Trilhas'], permission: 'ADMIN' },
      { method: 'DELETE', path: '/api/trilhas/:id', summary: 'Eliminar trilha', tags: ['Trilhas'], permission: 'ADMIN' },
      { method: 'GET', path: '/api/trilhas/:id/modulos', summary: 'Obtener modulos de una trilha', tags: ['Trilhas'], permission: 'authenticated' },

      // CMS / MODULOS
      { method: 'GET', path: '/api/cms', summary: 'Listar modulos (CMS)', tags: ['Modulos'], permission: 'ADMIN, GESTOR' },
      { method: 'POST', path: '/api/cms', summary: 'Crear modulo', tags: ['Modulos'], permission: 'ADMIN, GESTOR', request_body: { required: ['trilhaId', 'titulo'], optional: ['descricao', 'ordem', 'videoUrl', 'videoInicio', 'videoFim'], properties: { trilhaId: { type: 'string' }, titulo: { type: 'string' }, descricao: { type: 'string' }, ordem: { type: 'number' }, videoUrl: { type: 'string', format: 'uri' }, videoInicio: { type: 'number', description: 'Seconds' }, videoFim: { type: 'number', description: 'Seconds' } } } },
      { method: 'PUT', path: '/api/cms/:id', summary: 'Actualizar modulo', tags: ['Modulos'], permission: 'ADMIN, GESTOR' },
      { method: 'DELETE', path: '/api/cms/:id', summary: 'Eliminar modulo', tags: ['Modulos'], permission: 'ADMIN' },
      { method: 'GET', path: '/api/modulos/:id/aulas', summary: 'Obtener aulas de un modulo', tags: ['Modulos'], permission: 'authenticated' },
      { method: 'POST', path: '/api/modulos/:id/aulas', summary: 'Crear aula en modulo', tags: ['Modulos'], permission: 'ADMIN, GESTOR', request_body: { required: ['titulo'], optional: ['descricao', 'videoUrl', 'videoInicio', 'videoFim', 'duracaoMin'] } },
      { method: 'PUT', path: '/api/aulas/:id', summary: 'Actualizar aula', tags: ['Modulos'], permission: 'ADMIN, GESTOR' },
      { method: 'DELETE', path: '/api/aulas/:id', summary: 'Eliminar aula', tags: ['Modulos'], permission: 'ADMIN' },

      // CERTIFICATES
      { method: 'GET', path: '/api/certificates', summary: 'Listar certificados', tags: ['Certificates'], permission: 'authenticated', description: 'ADMIN ve todos, otros ven los suyos' },
      { method: 'POST', path: '/api/certificates', summary: 'Solicitar certificado', tags: ['Certificates'], permission: 'authenticated', request_body: { required: ['trilhaId'] } },
      { method: 'PUT', path: '/api/certificates/:id/approve', summary: 'Aprobar certificado', tags: ['Certificates'], permission: 'authenticated' },
      { method: 'PUT', path: '/api/certificates/:id/issue', summary: 'Emitir certificado', tags: ['Certificates'], permission: 'authenticated' },

      // NOTIFICATIONS
      { method: 'GET', path: '/api/notifications', summary: 'Listar notificaciones del usuario', tags: ['Notifications'], permission: 'authenticated' },
      { method: 'POST', path: '/api/notifications', summary: 'Enviar notificacion', tags: ['Notifications'], permission: 'authenticated', request_body: { required: ['toId', 'titulo', 'mensagem'] } },
      { method: 'PUT', path: '/api/notifications/:id/read', summary: 'Marcar notificacion como leida', tags: ['Notifications'], permission: 'authenticated' },
      { method: 'PUT', path: '/api/notifications/read-all', summary: 'Marcar todas como leidas', tags: ['Notifications'], permission: 'authenticated' },

      // PROGRESSO
      { method: 'GET', path: '/api/progresso', summary: 'Obtener progreso del usuario', tags: ['Progresso'], permission: 'authenticated' },
      { method: 'PUT', path: '/api/progresso', summary: 'Actualizar/crear progreso', tags: ['Progresso'], permission: 'authenticated', request_body: { required: ['moduloId', 'aulaId'], optional: ['concluido'] } },
      { method: 'GET', path: '/api/progresso/stats', summary: 'Estadisticas de progreso', tags: ['Progresso'], permission: 'authenticated', response: { totalAulas: 'number', concluidas: 'number', percentual: 'number', trilhasIniciadas: 'number', xp: 'number' } },

      // DASHBOARD
      { method: 'GET', path: '/api/dashboard', summary: 'Dashboard del usuario', tags: ['Dashboard'], permission: 'authenticated', response: { totalTrilhas: 'number', trilhasConcluidas: 'number', totalCertificados: 'number', totalAulas: 'number', aulasConcluidas: 'number', percentual: 'number', xp: 'number', nivel: 'number', recentActivity: 'ActivityLog[]' } },

      // HEALTH
      { method: 'GET', path: '/api/health', summary: 'Health check', tags: ['System'], permission: 'public', response: { status: 'ok', encrypted: 'boolean', timestamp: 'datetime' } },

      // DOCS
      { method: 'GET', path: '/api/docs', summary: 'Documentacion JSON de la API', tags: ['Docs'], permission: 'public' },
      { method: 'GET', path: '/api/docs/json', summary: 'Spec JSON para agentes IA', tags: ['Docs'], permission: 'public' },
      { method: 'GET', path: '/api/docs/html', summary: 'Documentacion HTML visual', tags: ['Docs'], permission: 'public' },
    ],
    data_models: {
      User: { id: 'string (cuid)', email: 'string (unique)', nome: 'string', senha: 'string (bcrypt hashed)', role: 'enum: ADMIN | GESTOR | ATENDENTE', gestorId: 'string|null (FK User)', createdAt: 'datetime', updatedAt: 'datetime', lastLogin: 'datetime|null' },
      Trilha: { id: 'string (cuid)', titulo: 'string', descricao: 'string', icon: 'string', color: 'string (hex)', obrigatorio: 'boolean (default: false)', createdAt: 'datetime', updatedAt: 'datetime' },
      Modulo: { id: 'string (cuid)', trilhaId: 'string (FK Trilha)', titulo: 'string', descricao: 'string', ordem: 'number', videoUrl: 'string|null', videoInicio: 'number|null (seconds)', videoFim: 'number|null (seconds)', createdAt: 'datetime', updatedAt: 'datetime' },
      Aula: { id: 'string (cuid)', moduloId: 'string (FK Modulo)', titulo: 'string', descricao: 'string', ordem: 'number', videoUrl: 'string|null', videoInicio: 'number|null', videoFim: 'number|null', duracaoMin: 'number|null', createdAt: 'datetime', updatedAt: 'datetime' },
      Quiz: { id: 'string (cuid)', aulaId: 'string (FK Aula, unique)', titulo: 'string', autoGerarCertificado: 'boolean', createdAt: 'datetime', updatedAt: 'datetime' },
      QuizPergunta: { id: 'string (cuid)', quizId: 'string (FK Quiz)', pergunta: 'string', opcaoA: 'string', opcaoB: 'string', opcaoC: 'string|null', opcaoD: 'string|null', correta: 'string (A|B|C|D)', ordem: 'number' },
      QuizResponse: { id: 'string (cuid)', quizId: 'string (FK Quiz)', userId: 'string (FK User)', nota: 'number', total: 'number', concluido: 'boolean', unique: '[quizId, userId]' },
      Certificate: { id: 'string (cuid)', userId: 'string (FK User)', trilhaId: 'string (FK Trilha)', status: 'enum: PENDING | APPROVED | ISSUED', pdfUrl: 'string|null', htmlContent: 'string|null', aprovadoPor: 'string|null', aprovadoEm: 'datetime|null' },
      Notification: { id: 'string (cuid)', fromId: 'string (FK User)', toId: 'string (FK User)', titulo: 'string', mensagem: 'string', lida: 'boolean (default: false)', createdAt: 'datetime' },
      ActivityLog: { id: 'string (cuid)', userId: 'string (FK User)', acao: 'string', detalhes: 'string|null', createdAt: 'datetime' },
      Progresso: { id: 'string (cuid)', moduloId: 'string (FK Modulo)', aulaId: 'string (FK Aula)', userId: 'string (FK User)', concluido: 'boolean', unique: '[moduloId, aulaId, userId]' },
      TrilhaAtendente: { id: 'string (cuid)', trilhaId: 'string (FK Trilha)', userId: 'string (FK User)', unique: '[trilhaId, userId]' },
    },
    error_format: { error: 'string (human-readable message)' },
    examples: {
      login: { request: 'POST /api/auth/login', body: { email: 'admin@academia.com', password: 'admin123' }, response: { token: 'eyJhbGciOiJIUzI1NiIs...', user: { id: 'clx...', email: 'admin@academia.com', nome: 'Admin', role: 'ADMIN' } } },
      list_trilhas: { request: 'GET /api/trilhas', headers: { Authorization: 'Bearer <token>' } },
      create_usuario: { request: 'POST /api/usuarios', body: { email: 'user@test.com', nome: 'Juan Perez', senha: 'pass123', role: 'ATENDENTE' } },
    },
  }
}

// JSON endpoint
router.get('/json', (_req: Request, res: Response) => {
  const spec = getApiSpec()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-API-Version', '1.0.0')
  res.setHeader('X-Documentation-Type', 'openapi-spec')
  res.json(spec)
})

// HTML endpoint
router.get('/html', (_req: Request, res: Response) => {
  const spec = getApiSpec()
  const json = JSON.stringify(spec, null, 2)

  const tags = spec.endpoints.reduce((acc: Record<string, typeof spec.endpoints>, ep) => {
    ep.tags.forEach(t => {
      if (!acc[t]) acc[t] = []
      acc[t].push(ep)
    })
    return acc
  }, {})

  const tagNav = Object.keys(tags).map(t => `<a href="#tag-${t}">${t}</a>`).join('')

  let endpointSections = ''
  for (const [tag, eps] of Object.entries(tags)) {
    let endpointsHtml = ''
    for (const ep of eps) {
      const methodClass = `method-${ep.method}`
      let bodyContent = ''
      if (ep.permission) bodyContent += `<p><strong>Permiso:</strong> <code>${ep.permission}</code></p>`
      if (ep.description) bodyContent += `<p>${ep.description}</p>`
      if (ep.request_body) bodyContent += `<h4>Request Body</h4><pre>${JSON.stringify(ep.request_body, null, 2)}</pre>`
      if (ep.response) bodyContent += `<h4>Response</h4><pre>${JSON.stringify(ep.response, null, 2)}</pre>`

      endpointsHtml += `
        <div class="endpoint">
          <div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <span class="method ${methodClass}">${ep.method}</span>
            <span class="path">${ep.path}</span>
            <span class="summary">${ep.summary}</span>
          </div>
          <div class="endpoint-body">${bodyContent}</div>
        </div>`
    }
    endpointSections += `<div class="section" id="tag-${tag}"><h2>${tag}</h2>${endpointsHtml}</div>`
  }

  let modelsHtml = ''
  for (const [name, model] of Object.entries(spec.data_models)) {
    let rows = ''
    for (const [field, type] of Object.entries(model)) {
      rows += `<tr><td><code>${field}</code></td><td>${type}</td></tr>`
    }
    modelsHtml += `<h3>${name}</h3><table class="model-table"><tr><th>Campo</th><th>Tipo</th></tr>${rows}</table>`
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Academia PayGas - Express API Docs</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.6;color:#333;background:#f8f9fa}
.container{max-width:1100px;margin:0 auto;padding:20px}
header{background:linear-gradient(135deg,#0f172a,#1e40af);color:white;padding:30px;border-radius:8px;margin-bottom:30px}
header h1{font-size:28px;margin-bottom:8px}
header p{opacity:.9;font-size:14px}
.badge{display:inline-block;background:rgba(255,255,255,.2);padding:3px 10px;border-radius:12px;font-size:12px;margin-top:10px;margin-right:4px}
nav{background:white;border-radius:8px;padding:20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
nav h2{font-size:16px;margin-bottom:12px;color:#0f172a}
nav ul{list-style:none;display:flex;flex-wrap:wrap;gap:6px}
nav a{display:inline-block;padding:4px 12px;background:#e0e7ff;color:#1e40af;border-radius:16px;text-decoration:none;font-size:13px}
nav a:hover{background:#1e40af;color:white}
.section{background:white;border-radius:8px;padding:24px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.section h2{font-size:20px;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #e0e7ff;padding-bottom:8px}
.endpoint{border:1px solid #e0e0e0;border-radius:6px;margin-bottom:12px;overflow:hidden}
.endpoint-header{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f9fa;cursor:pointer}
.endpoint-header:hover{background:#e0e7ff}
.method{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:12px;color:white;min-width:60px;text-align:center}
.method-GET{background:#16a34a}.method-POST{background:#2563eb}.method-PUT{background:#d97706;color:#333}.method-DELETE{background:#dc2626}
.path{font-family:monospace;font-size:14px;font-weight:600}
.summary{font-size:13px;color:#666;margin-left:auto}
.endpoint-body{padding:14px;border-top:1px solid #e0e0e0;display:none}
.endpoint-body.open{display:block}
.endpoint-body h4{font-size:13px;color:#555;margin:10px 0 6px}
code{background:#f0f0f0;padding:2px 5px;border-radius:3px;font-size:12px}
pre{background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;margin:8px 0}
.model-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
.model-table th{text-align:left;padding:8px;background:#f0f0f0;border:1px solid #ddd}
.model-table td{padding:8px;border:1px solid #eee}
.json-toggle{display:inline-block;margin-top:10px;padding:6px 14px;background:#0f172a;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px}
.json-toggle:hover{background:#1e40af}
footer{text-align:center;padding:20px;font-size:12px;color:#999}
</style>
</head>
<body>
<div class="container">
<header>
  <h1>Academia PayGas - Express API</h1>
  <p>Backend Express.js con Prisma ORM + MySQL. JWT Auth + AES-256-GCM Encryption.</p>
  <span class="badge">v1.0.0</span>
  <span class="badge">Express 5</span>
  <span class="badge">Prisma ORM</span>
  <span class="badge">MySQL</span>
  <span class="badge">JWT Auth</span>
  <span class="badge">AES-256-GCM</span>
</header>
<nav><h2>Modulos</h2><ul>${tagNav}</ul></nav>
${endpointSections}
<div class="section" id="tag-Models"><h2>Data Models (Prisma Schema)</h2>${modelsHtml}</div>
<div class="section"><h2>JSON Spec (for AI Agents)</h2>
<p>Accede directamente: <code>GET /api/docs/json</code></p>
<button class="json-toggle" onclick="document.getElementById('json-spec').style.display=document.getElementById('json-spec').style.display==='none'?'block':'none'">Toggle JSON</button>
<div id="json-spec" style="display:none"><pre>${json.replace(/</g, '&lt;')}</pre></div>
</div>
<footer>Academia PayGas Express API Documentation v1.0.0</footer>
</div></body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

// Default /docs -> JSON
router.get('/', (_req: Request, res: Response) => {
  const spec = getApiSpec()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.json(spec)
})

export default router
