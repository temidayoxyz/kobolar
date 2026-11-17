import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/lib/env'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> }

export const client =
  globalForDb.client ??
  postgres(env.DATABASE_URL, {
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.client = client

export const db = drizzle(client, { schema })
export type Database = typeof db
