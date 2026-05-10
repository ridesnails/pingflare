import { Hono } from 'hono'
import { eq, desc, and, gte, count } from 'drizzle-orm'
import { getDb, statusLogs, incidents, monitors } from '../db'
import { requireAuth } from '../middleware/auth'
import type { Env } from '../index'

const router = new Hono<{ Bindings: Env }>()
router.use('*', requireAuth)

router.get('/:id/logs', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const hoursParam = c.req.query('hours')
  const hours = hoursParam !== undefined ? Number(hoursParam) : null
  const limit = Number(c.req.query('limit') ?? 500)
  const since = hours !== null && hours > 0
    ? Math.floor(Date.now() / 1000) - hours * 3600
    : null

  const rows = await db.select()
    .from(statusLogs)
    .where(since !== null
      ? and(eq(statusLogs.monitorId, id), gte(statusLogs.checkedAt, since))
      : eq(statusLogs.monitorId, id))
    .orderBy(desc(statusLogs.checkedAt))
    .limit(limit)

  return c.json(rows)
})

router.get('/:id/check-count', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const [{ total }] = await db.select({ total: count() }).from(statusLogs).where(eq(statusLogs.monitorId, id))
  return c.json({ count: total })
})

router.get('/:id/incidents', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const limit = Number(c.req.query('limit') ?? 50)

  const rows = await db.select()
    .from(incidents)
    .where(eq(incidents.monitorId, id))
    .orderBy(desc(incidents.startedAt))
    .limit(limit)

  return c.json(rows)
})

router.get('/:id/uptime', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const days = Number(c.req.query('days') ?? 90)
  const since = Math.floor(Date.now() / 1000) - days * 86400

  const rows = await db.select()
    .from(statusLogs)
    .where(and(eq(statusLogs.monitorId, id), gte(statusLogs.checkedAt, since)))

  if (rows.length === 0) return c.json({ uptime: null, days })

  const up = rows.filter(r => r.status === 'up').length
  const uptime = (up / rows.length) * 100

  return c.json({ uptime: Math.round(uptime * 100) / 100, days, total: rows.length, up })
})

router.get('/:id/daily', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const days = Number(c.req.query('days') ?? 90)
  const monitor = await db.query.monitors.findFirst({ where: eq(monitors.id, id) })
  if (!monitor) return c.json({ error: 'Not found' }, 404)

  const now = Math.floor(Date.now() / 1000)
  const since = now - days * 86400

  const allRows = await db.select()
    .from(statusLogs)
    .where(and(eq(statusLogs.monitorId, id), gte(statusLogs.checkedAt, since)))

  const dayMap: Record<string, { total: number; ups: number }> = {}
  for (const row of allRows) {
    const day = new Date(row.checkedAt * 1000).toISOString().slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { total: 0, ups: 0 }
    dayMap[day].total++
    if (row.status === 'up') dayMap[day].ups++
  }

  const result: { date: string; uptime: number | null }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date((now - i * 86400) * 1000).toISOString().slice(0, 10)
    const e = dayMap[d]
    result.push({ date: d, uptime: e ? Math.round((e.ups / e.total) * 1000) / 10 : null })
  }

  return c.json(result)
})

export default router
