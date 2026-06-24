import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ADMIN_EMAIL = 'admin@paygas.com.br'
const ADMIN_PASSWORD = '123456'

async function main() {
  console.log('🔍 Diagnosticando usuario admin...')
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'definida (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'NO DEFINIDA'}`)
  console.log('')

  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, email: true, nome: true, role: true, senha: true, emailVerificado: true, createdAt: true, lastLogin: true },
  })

  if (!user) {
    console.log(`❌ Usuario ${ADMIN_EMAIL} NO EXISTE en la base de datos`)
    console.log('   Creando usuario admin...')
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
    const created = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        nome: 'Administrador PayGas',
        senha: hashedPassword,
        role: 'ADMIN',
        emailVerificado: true,
      },
    })
    console.log(`✅ Admin creado: ${created.email} (id: ${created.id})`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    return
  }

  console.log(`✅ Usuario encontrado: ${user.email}`)
  console.log(`   ID:              ${user.id}`)
  console.log(`   Nome:            ${user.nome}`)
  console.log(`   Role:            ${user.role}`)
  console.log(`   Email verificado: ${user.emailVerificado}`)
  console.log(`   Criado em:       ${user.createdAt}`)
  console.log(`   Ultimo login:    ${user.lastLogin || 'NUNCA'}`)
  console.log(`   Senha hash:      ${user.senha.substring(0, 20)}...`)
  console.log(`   Hash length:     ${user.senha.length}`)
  console.log('')

  const passwordMatch = await bcrypt.compare(ADMIN_PASSWORD, user.senha)
  console.log(`🔐 Verificacao da senha '${ADMIN_PASSWORD}':`)
  console.log(`   bcrypt.compare resultado: ${passwordMatch ? '✅ CORRETA' : '❌ INCORRETA'}`)

  if (!passwordMatch) {
    console.log('')
    console.log('⚠️  A senha no banco NAO corresponde a "123456"')
    console.log('   Resetando senha para "123456"...')
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { senha: hashedPassword },
    })
    console.log('✅ Senha resetada com sucesso')
    console.log('   Agora faca login com: admin@paygas.com.br / 123456')
  }
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
