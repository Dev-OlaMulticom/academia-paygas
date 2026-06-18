import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma/schema.prisma'),
  migrate: {
    adapter: async (env) => {
      const connectionString = env.DATABASE_URL
      if (!connectionString) throw new Error('DATABASE_URL is required')
      return new PrismaPg({ connectionString })
    },
  },
})
