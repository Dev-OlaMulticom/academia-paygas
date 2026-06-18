#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function loadEnv() {
  try {
    const env = {}
    fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^#=]+)=(.+)$/)
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    })
    return env
  } catch { return {} }
}

const env = loadEnv()
const BASE = process.env.API_BASE_URL || env.API_BASE_URL
const KEY  = process.env.API_KEY || env.API_KEY

const C = { r: '\x1b[0m', g: '\x1b[32m', e: '\x1b[31m', y: '\x1b[33m', c: '\x1b[36m', gr: '\x1b[90m' }

async function api(endpoint, opts = {}) {
  const url = `${BASE}${endpoint}`
  const headers = { 'Content-Type': 'application/json' }
  if (KEY) headers['X-API-Key'] = KEY
  const start = Date.now()
  try {
    const res = await fetch(url, { headers: { ...headers, ...opts.headers } })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data, ms: Date.now() - start }
  } catch (e) {
    return { ok: false, status: 0, error: e.message, ms: Date.now() - start }
  }
}

function log(icon, msg, color = '') { console.log(`${color}${icon}${C.r} ${msg}`) }

async function main() {
  console.log(`\n${'='.repeat(55)}`)
  log('i', 'PRUEBAS API - ACADEMIA PAYGAS v2.0', C.c)
  console.log('='.repeat(55) + '\n')

  log('i', `URL:  ${BASE}`, C.gr)
  log('i', `Key:  ${KEY ? KEY.substring(0, 8) + '...' + KEY.slice(-4) : 'NO CONFIGURADA'}`, C.gr)
  console.log('')

  if (!KEY) {
    log('x', 'No hay API_KEY en .env', C.e)
    console.log('')
    return
  }

  const tests = [
    ['GET',  '/docs',              'Docs (publico)',          false],
    ['GET',  '/docs/json',          'Docs JSON',               false],
    ['GET',  '/users',             'Listar usuarios',         true],
    ['GET',  '/trilhas',           'Listar trilhas',          true],
    ['GET',  '/modulos',           'Listar modulos',          true],
    ['GET',  '/aulas',             'Listar aulas',            true],
    ['GET',  '/quizzes',           'Listar quizzes',          true],
    ['GET',  '/certificados',      'Listar certificados',     true],
    ['GET',  '/notifications',     'Listar notificaciones',   true],
    ['GET',  '/progresso',         'Listar progreso',         true],
    ['GET',  '/activity-logs',     'Listar activity logs',    true],
    ['GET',  '/trilha-atendente',  'Listar trilha-atendente', true],
  ]

  let pass = 0, fail = 0

  for (const [method, endpoint, name, needsAuth] of tests) {
    const r = await api(endpoint)
    const icon = r.ok ? `${C.g}+` : `${C.e}x`
    const status = `${r.status}`
    console.log(`${icon} ${method} ${endpoint}${C.r}  ${C.gr}${status} ${r.ms}ms${C.r}`)

    if (!r.ok) {
      const msg = r.data?.message || r.data?.code || r.error || ''
      console.log(`    ${C.e}${msg}${C.r}`)
      fail++
    } else {
      if (Array.isArray(r.data?.data)) console.log(`    ${C.gr}${r.data.data.length} registros, pagina ${r.data.pagination?.page || 1}/${r.data.pagination?.total_pages || 1}${C.r}`)
      pass++
    }
  }

  console.log(`\n${'='.repeat(55)}`)
  const color = fail ? C.y : C.g
  log('i', `Resultado: ${pass} OK, ${fail} FAIL`, color)
  console.log('='.repeat(55) + '\n')
}

main()
