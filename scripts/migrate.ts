import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../src/lib/env'

async function main() {
  const client = postgres(env.DATABASE_URL, { max: 1 })
  try {
    await migrate(drizzle(client), { migrationsFolder: './migrations' })
    console.info('Migrations applied.')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
