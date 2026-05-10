import { Hono } from 'hono'
import { getDb } from '../db'
import { settings } from '../db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

app.use('*', requireAuth)

app.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const rows = await db.select().from(settings)
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return c.json(result)
})

app.put('/', async (c) => {
  const body = await c.req.json<Record<string, string>>()
  const db = getDb(c.env.DB)
  for (const [key, value] of Object.entries(body)) {
    await db.insert(settings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } })
  }
  const rows = await db.select().from(settings)
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return c.json(result)
})

export default app
