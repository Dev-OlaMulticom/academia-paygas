import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

const dbPath = path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')
  const defaultPassword = await bcrypt.hash('123456', 10)

  const admin = await prisma.user.upsert({ where: { email: 'admin@paygas.com.br' }, update: {}, create: { email: 'admin@paygas.com.br', nome: 'Administrador PayGas', senha: defaultPassword, role: 'ADMIN' } })
  const gestor = await prisma.user.upsert({ where: { email: 'gestor@paygas.com.br' }, update: {}, create: { email: 'gestor@paygas.com.br', nome: 'Carlos Mendes', senha: defaultPassword, role: 'GESTOR' } })
  const atendente1 = await prisma.user.upsert({ where: { email: 'atendente@paygas.com.br' }, update: {}, create: { email: 'atendente@paygas.com.br', nome: 'Ana Paula Costa', senha: defaultPassword, role: 'ATENDENTE', gestorId: gestor.id } })
  await prisma.user.upsert({ where: { email: 'joao@paygas.com.br' }, update: {}, create: { email: 'joao@paygas.com.br', nome: 'João Silva', senha: defaultPassword, role: 'ATENDENTE', gestorId: gestor.id } })
  await prisma.user.upsert({ where: { email: 'maria@paygas.com.br' }, update: {}, create: { email: 'maria@paygas.com.br', nome: 'Maria Santos', senha: defaultPassword, role: 'ATENDENTE', gestorId: gestor.id } })
  console.log('✅ Users created')

  const trilhasData = [
    { titulo: 'Excelência no Atendimento', descricao: 'Técnicas de atendimento', icon: '👤', color: '#DCFCE7', obrigatorio: true },
    { titulo: 'Sistema de Cashback PayGas', descricao: 'Cashback', icon: '💰', color: '#FEF3C7', obrigatorio: true },
    { titulo: 'Gestão e KPIs do Posto', descricao: 'Gestão', icon: '📊', color: '#E6EEF9', obrigatorio: false },
    { titulo: 'Operação do Terminal', descricao: 'Terminal', icon: '📱', color: '#F3E8FF', obrigatorio: true },
    { titulo: 'Integração via API', descricao: 'API', icon: '💻', color: '#F1F5F9', obrigatorio: true },
    { titulo: 'LGPD e Segurança de Dados', descricao: 'LGPD', icon: '🔒', color: '#F0FDF4', obrigatorio: true },
    { titulo: 'Liderança e Desenvolvimento de Equipe', descricao: 'Liderança', icon: '🚀', color: '#EDE9FE', obrigatorio: false },
    { titulo: 'Gestão Financeira do Posto', descricao: 'Financeiro', icon: '💼', color: '#FEF9C3', obrigatorio: false },
  ]
  const trilhaRecords: any[] = []
  for (const t of trilhasData) {
    const existing = await prisma.trilha.findFirst({ where: { titulo: t.titulo } })
    trilhaRecords.push(existing || await prisma.trilha.create({ data: t }))
  }
  console.log('✅ Trilhas created')

  const trilhaAt = trilhaRecords[0]
  const modulosData = [
    { titulo: 'Fundamentos do Atendimento', descricao: 'Básicos', ordem: 1, aulas: [
      { titulo: 'Atendimento de excelência', descricao: 'Intro', duracaoMin: 8, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoInicio: 0, videoFim: 480 },
      { titulo: 'Comunicação eficaz', descricao: 'Técnicas', duracaoMin: 10, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoInicio: 480, videoFim: 1080 },
      { titulo: 'Resolução de conflitos', descricao: 'Conflitos', duracaoMin: 12 },
    ]},
    { titulo: 'Cashback na Prática', descricao: 'Cashback', ordem: 2, aulas: [
      { titulo: 'Explicar o Cashback', descricao: 'Guia', duracaoMin: 7, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoInicio: 1080, videoFim: 1500 },
      { titulo: 'Quiz Cashback', descricao: 'Quiz', duracaoMin: 10 },
    ]},
  ]
  for (const m of modulosData) {
    const existing = await prisma.modulo.findFirst({ where: { titulo: m.titulo, trilhaId: trilhaAt.id } })
    if (!existing) {
      const modulo = await prisma.modulo.create({ data: { trilhaId: trilhaAt.id, titulo: m.titulo, descricao: m.descricao, ordem: m.ordem } })
      for (let i = 0; i < m.aulas.length; i++) {
        const a = m.aulas[i]
        await prisma.aula.create({ data: { moduloId: modulo.id, titulo: a.titulo, descricao: a.descricao, ordem: i + 1, duracaoMin: a.duracaoMin, videoUrl: a.videoUrl || null, videoInicio: a.videoInicio || null, videoFim: a.videoFim || null } })
      }
    }
  }
  console.log('✅ Modulos created')

  const existsA = await prisma.trilhaAtendente.findFirst({ where: { trilhaId: trilhaAt.id, userId: atendente1.id } })
  if (!existsA) await prisma.trilhaAtendente.create({ data: { trilhaId: trilhaAt.id, userId: atendente1.id } })

  const firstMod = await prisma.modulo.findFirst({ where: { trilhaId: trilhaAt.id }, include: { aulas: true } })
  if (firstMod?.aulas[0]) {
    const existsP = await prisma.progresso.findFirst({ where: { moduloId: firstMod.id, aulaId: firstMod.aulas[0].id, userId: atendente1.id } })
    if (!existsP) await prisma.progresso.create({ data: { moduloId: firstMod.id, aulaId: firstMod.aulas[0].id, userId: atendente1.id, concluido: true } })
  }

  const existsN = await prisma.notification.findFirst({ where: { fromId: admin.id, toId: atendente1.id } })
  if (!existsN) await prisma.notification.create({ data: { fromId: admin.id, toId: atendente1.id, titulo: 'Bem-vindo!', mensagem: 'Conta criada!' } })

  await prisma.activityLog.create({ data: { userId: atendente1.id, acao: 'Login', detalhes: 'Primeiro acesso' } })
  console.log('🎉 Seed completed!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
