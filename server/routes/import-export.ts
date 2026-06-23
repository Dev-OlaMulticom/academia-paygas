import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { logActivity } from '../services/log'

const router = Router()

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map(parseCsvLine)
  return { headers, rows }
}

function rowsToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = row[i] || '' })
    return obj
  })
}

function sendCsv(res: any, filename: string, csvContent: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + csvContent)
}

// ==================== EXPORT ====================

router.get('/export/cursos', authenticate, authorize('ADMIN'), async (_req: any, res) => {
  try {
    const modulos = await prisma.modulo.findMany({
      include: { _count: { select: { aulas: true } } },
      orderBy: { ordem: 'asc' },
    })
    const headers = ['titulo', 'descricao', 'ordem', 'obrigatorio', 'autoCertificado', 'videoUrl', 'videoInicio', 'videoFim']
    const rows = modulos.map(m => headers.map(h => escapeCsvField((m as any)[h])))
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    sendCsv(res, 'cursos.csv', csv)
  } catch (error) {
    console.error('[EXPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao exportar cursos' })
  }
})

router.get('/export/aulas', authenticate, authorize('ADMIN'), async (_req: any, res) => {
  try {
    const aulas = await prisma.aula.findMany({
      include: { modulo: { select: { titulo: true } } },
      orderBy: [{ modulo: { ordem: 'asc' } }, { ordem: 'asc' }],
    })
    const headers = ['modulo_titulo', 'titulo', 'descricao', 'tipo', 'videoUrl', 'pdfUrl', 'obrigatorio', 'duracaoMin', 'videoInicio', 'videoFim']
    const rows = aulas.map(a => [
      escapeCsvField(a.modulo.titulo),
      escapeCsvField(a.titulo),
      escapeCsvField(a.descricao),
      escapeCsvField(a.tipo),
      escapeCsvField(a.videoUrl),
      escapeCsvField(a.pdfUrl),
      escapeCsvField(a.obrigatorio),
      escapeCsvField(a.duracaoMin),
      escapeCsvField(a.videoInicio),
      escapeCsvField(a.videoFim),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    sendCsv(res, 'aulas.csv', csv)
  } catch (error) {
    console.error('[EXPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao exportar aulas' })
  }
})

router.get('/export/licoes', authenticate, authorize('ADMIN'), async (_req: any, res) => {
  try {
    const licoes = await prisma.licao.findMany({
      include: {
        aula: { select: { titulo: true, modulo: { select: { titulo: true } } } },
      },
      orderBy: [{ aula: { modulo: { ordem: 'asc' } } }, { aula: { ordem: 'asc' } }, { ordem: 'asc' }],
    })
    const headers = ['modulo_titulo', 'aula_titulo', 'titulo', 'tipo', 'conteudo', 'duracaoMin', 'inicioSeg', 'fimSeg']
    const rows = licoes.map(l => [
      escapeCsvField(l.aula.modulo.titulo),
      escapeCsvField(l.aula.titulo),
      escapeCsvField(l.titulo),
      escapeCsvField(l.tipo),
      escapeCsvField(l.conteudo),
      escapeCsvField(l.duracaoMin),
      escapeCsvField(l.inicioSeg),
      escapeCsvField(l.fimSeg),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    sendCsv(res, 'licoes.csv', csv)
  } catch (error) {
    console.error('[EXPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao exportar licoes' })
  }
})

router.get('/export/quiz', authenticate, authorize('ADMIN'), async (_req: any, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        perguntas: { orderBy: { ordem: 'asc' } },
        aula: { select: { titulo: true, modulo: { select: { titulo: true } } } },
      },
      orderBy: [{ aula: { modulo: { ordem: 'asc' } } }, { aula: { ordem: 'asc' } }],
    })
    const headers = ['modulo_titulo', 'aula_titulo', 'quiz_titulo', 'notaMinima', 'autoGerarCertificado', 'pergunta', 'opcaoA', 'opcaoB', 'opcaoC', 'opcaoD', 'correta']
    const rows: string[][] = []
    for (const quiz of quizzes) {
      if (quiz.perguntas.length === 0) {
        rows.push([
          escapeCsvField(quiz.aula.modulo.titulo),
          escapeCsvField(quiz.aula.titulo),
          escapeCsvField(quiz.titulo),
          escapeCsvField(quiz.notaMinima),
          escapeCsvField(quiz.autoGerarCertificado),
          '', '', '', '', '', '',
        ])
      } else {
        for (const p of quiz.perguntas) {
          rows.push([
            escapeCsvField(quiz.aula.modulo.titulo),
            escapeCsvField(quiz.aula.titulo),
            escapeCsvField(quiz.titulo),
            escapeCsvField(quiz.notaMinima),
            escapeCsvField(quiz.autoGerarCertificado),
            escapeCsvField(p.pergunta),
            escapeCsvField(p.opcaoA),
            escapeCsvField(p.opcaoB),
            escapeCsvField(p.opcaoC),
            escapeCsvField(p.opcaoD),
            escapeCsvField(p.correta),
          ])
        }
      }
    }
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    sendCsv(res, 'quiz.csv', csv)
  } catch (error) {
    console.error('[EXPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao exportar quiz' })
  }
})

// ==================== IMPORT ====================

router.post('/import/cursos', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { csv: csvText } = req.body
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ error: 'Dados CSV inválidos' })
    }
    const { headers, rows } = parseCsv(csvText)
    if (headers.length === 0 || rows.length === 0) {
      return res.status(400).json({ error: 'CSV vazio ou sem cabeçalhos' })
    }
    const objects = rowsToObjects(headers, rows)
    const existing = await prisma.modulo.findMany({ select: { titulo: true } })
    const existingTitles = new Set(existing.map(m => m.titulo))
    let created = 0
    let skipped = 0
    const maxOrdem = (await prisma.modulo.aggregate({ _max: { ordem: true } }))._max.ordem || 0
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i]
      const titulo = obj.titulo?.trim()
      if (!titulo) { skipped++; continue }
      if (existingTitles.has(titulo)) { skipped++; continue }
      await prisma.modulo.create({
        data: {
          titulo,
          descricao: obj.descricao || '',
          ordem: maxOrdem + i + 1,
          obrigatorio: obj.obrigatorio === 'true' || obj.obrigatorio === '1',
          autoCertificado: obj.autoCertificado === 'true' || obj.autoCertificado === '1',
          videoUrl: obj.videoUrl || null,
          videoInicio: obj.videoInicio ? parseInt(obj.videoInicio) : null,
          videoFim: obj.videoFim ? parseInt(obj.videoFim) : null,
        },
      })
      existingTitles.add(titulo)
      created++
    }
    await logActivity(req.userId!, 'Importar Cursos', `Criados: ${created}, Ignorados: ${skipped}`)
    res.json({ created, skipped, total: objects.length })
  } catch (error) {
    console.error('[IMPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao importar cursos' })
  }
})

router.post('/import/aulas', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { csv: csvText } = req.body
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ error: 'Dados CSV inválidos' })
    }
    const { headers, rows } = parseCsv(csvText)
    if (headers.length === 0 || rows.length === 0) {
      return res.status(400).json({ error: 'CSV vazio ou sem cabeçalhos' })
    }
    const objects = rowsToObjects(headers, rows)
    const modulos = await prisma.modulo.findMany({ select: { id: true, titulo: true } })
    const moduloMap = new Map(modulos.map(m => [m.titulo, m.id]))
    let created = 0
    let skipped = 0
    for (const obj of objects) {
      const moduloTitulo = obj.modulo_titulo?.trim()
      const titulo = obj.titulo?.trim()
      if (!moduloTitulo || !titulo) { skipped++; continue }
      const moduloId = moduloMap.get(moduloTitulo)
      if (!moduloId) { skipped++; continue }
      const existingAula = await prisma.aula.findFirst({ where: { moduloId, titulo } })
      if (existingAula) { skipped++; continue }
      const maxOrdem = (await prisma.aula.aggregate({ where: { moduloId }, _max: { ordem: true } }))._max.ordem || 0
      await prisma.aula.create({
        data: {
          moduloId,
          titulo,
          descricao: obj.descricao || '',
          ordem: maxOrdem + 1,
          tipo: (obj.tipo as any) || 'VIDEO',
          videoUrl: obj.videoUrl || null,
          pdfUrl: obj.pdfUrl || null,
          obrigatorio: obj.obrigatorio === 'true' || obj.obrigatorio === '1',
          duracaoMin: obj.duracaoMin ? parseInt(obj.duracaoMin) : null,
          videoInicio: obj.videoInicio ? parseInt(obj.videoInicio) : null,
          videoFim: obj.videoFim ? parseInt(obj.videoFim) : null,
        },
      })
      created++
    }
    await logActivity(req.userId!, 'Importar Aulas', `Criadas: ${created}, Ignoradas: ${skipped}`)
    res.json({ created, skipped, total: objects.length })
  } catch (error) {
    console.error('[IMPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao importar aulas' })
  }
})

router.post('/import/licoes', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { csv: csvText } = req.body
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ error: 'Dados CSV inválidos' })
    }
    const { headers, rows } = parseCsv(csvText)
    if (headers.length === 0 || rows.length === 0) {
      return res.status(400).json({ error: 'CSV vazio ou sem cabeçalhos' })
    }
    const objects = rowsToObjects(headers, rows)
    const modulos = await prisma.modulo.findMany({ select: { id: true, titulo: true } })
    const moduloMap = new Map(modulos.map(m => [m.titulo, m.id]))
    const aulas = await prisma.aula.findMany({ select: { id: true, titulo: true, moduloId: true } })
    const aulaMap = new Map(aulas.map(a => [`${a.moduloId}:${a.titulo}`, a.id]))
    let created = 0
    let skipped = 0
    for (const obj of objects) {
      const moduloTitulo = obj.modulo_titulo?.trim()
      const aulaTitulo = obj.aula_titulo?.trim()
      const titulo = obj.titulo?.trim()
      if (!moduloTitulo || !aulaTitulo || !titulo) { skipped++; continue }
      const moduloId = moduloMap.get(moduloTitulo)
      if (!moduloId) { skipped++; continue }
      const aulaId = aulaMap.get(`${moduloId}:${aulaTitulo}`)
      if (!aulaId) { skipped++; continue }
      const existing = await prisma.licao.findFirst({ where: { aulaId, titulo } })
      if (existing) { skipped++; continue }
      const maxOrdem = (await prisma.licao.aggregate({ where: { aulaId }, _max: { ordem: true } }))._max.ordem || 0
      await prisma.licao.create({
        data: {
          aulaId,
          titulo,
          tipo: (obj.tipo as any) || 'TEXTO',
          conteudo: obj.conteudo || null,
          duracaoMin: obj.duracaoMin ? parseInt(obj.duracaoMin) : null,
          inicioSeg: obj.inicioSeg ? parseInt(obj.inicioSeg) : null,
          fimSeg: obj.fimSeg ? parseInt(obj.fimSeg) : null,
          ordem: maxOrdem + 1,
        },
      })
      created++
    }
    await logActivity(req.userId!, 'Importar Licoes', `Criadas: ${created}, Ignoradas: ${skipped}`)
    res.json({ created, skipped, total: objects.length })
  } catch (error) {
    console.error('[IMPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao importar lições' })
  }
})

router.post('/import/quiz', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { csv: csvText } = req.body
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ error: 'Dados CSV inválidos' })
    }
    const { headers, rows } = parseCsv(csvText)
    if (headers.length === 0 || rows.length === 0) {
      return res.status(400).json({ error: 'CSV vazio ou sem cabeçalhos' })
    }
    const objects = rowsToObjects(headers, rows)
    const modulos = await prisma.modulo.findMany({ select: { id: true, titulo: true } })
    const moduloMap = new Map(modulos.map(m => [m.titulo, m.id]))
    const aulas = await prisma.aula.findMany({ select: { id: true, titulo: true, moduloId: true } })
    const aulaMap = new Map(aulas.map(a => [`${a.moduloId}:${a.titulo}`, a.id]))
    let created = 0
    let skipped = 0
    const quizGroups = new Map<string, Record<string, string>[]>()

    for (const obj of objects) {
      const moduloTitulo = obj.modulo_titulo?.trim()
      const aulaTitulo = obj.aula_titulo?.trim()
      if (!moduloTitulo || !aulaTitulo) { skipped++; continue }
      const moduloId = moduloMap.get(moduloTitulo)
      if (!moduloId) { skipped++; continue }
      const aulaId = aulaMap.get(`${moduloId}:${aulaTitulo}`)
      if (!aulaId) { skipped++; continue }
      const key = aulaId
      if (!quizGroups.has(key)) quizGroups.set(key, [])
      quizGroups.get(key)!.push(obj)
    }

    for (const [aulaId, group] of quizGroups) {
      const first = group[0]
      const quizTitulo = first.quiz_titulo?.trim() || `Quiz`
      const notaMinima = first.notaMinima ? parseInt(first.notaMinima) : 7
      const autoGerar = first.autoGerarCertificado === 'true' || first.autoGerarCertificado === '1'

      let quiz = await prisma.quiz.findUnique({ where: { aulaId } })
      if (!quiz) {
        quiz = await prisma.quiz.create({
          data: { aulaId, titulo: quizTitulo, notaMinima, autoGerarCertificado: autoGerar },
        })
        created++
      }

      const existingPerguntas = await prisma.quizPergunta.findMany({ where: { quizId: quiz.id } })
      const existingPerguntaTexts = new Set(existingPerguntas.map(p => p.pergunta))

      const perguntasToAdd = group.filter(r => r.pergunta?.trim() && !existingPerguntaTexts.has(r.pergunta.trim()))
      if (perguntasToAdd.length === 0) { skipped += group.length; continue }

      const maxOrdem = (await prisma.quizPergunta.aggregate({ where: { quizId: quiz.id }, _max: { ordem: true } }))._max.ordem || 0
      for (let i = 0; i < perguntasToAdd.length; i++) {
        const p = perguntasToAdd[i]
        await prisma.quizPergunta.create({
          data: {
            quizId: quiz.id,
            pergunta: p.pergunta.trim(),
            opcaoA: p.opcaoA || '',
            opcaoB: p.opcaoB || '',
            opcaoC: p.opcaoC || null,
            opcaoD: p.opcaoD || null,
            correta: p.correta || 'A',
            ordem: maxOrdem + i + 1,
          },
        })
        created++
      }
    }

    await logActivity(req.userId!, 'Importar Quiz', `Criados: ${created}, Ignorados: ${skipped}`)
    res.json({ created, skipped, total: objects.length })
  } catch (error) {
    console.error('[IMPORT ERROR]', error)
    res.status(500).json({ error: 'Erro ao importar quiz' })
  }
})

export default router
