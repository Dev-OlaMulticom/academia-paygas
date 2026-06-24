import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ADMIN_EMAIL = 'admin@paygas.com.br'
const ADMIN_PASSWORD = '123456'

async function main() {
  console.log('🔧 Resetting admin password...')

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { senha: hashedPassword, role: 'ADMIN', emailVerificado: true },
    create: {
      email: ADMIN_EMAIL,
      nome: 'Administrador PayGas',
      senha: hashedPassword,
      role: 'ADMIN',
      emailVerificado: true,
    },
  })

  console.log(`✅ Admin user ready: ${admin.email} (id: ${admin.id})`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
