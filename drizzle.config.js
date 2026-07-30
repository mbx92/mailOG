import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema/index.js',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://mailog:mailog@localhost:5433/mailog',
  },
})
