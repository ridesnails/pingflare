import { Hono } from 'hono'
import { eq, desc, and, gte, inArray } from 'drizzle-orm'
import { getDb, statusPages, statusPageMonitors, monitors, statusLogs, incidents, incidentReports, incidentUpdates, incidentMonitors } from '../db'
import { verifyPassword } from '../utils'
import type { Env } from '../index'

const router = new Hono<{ Bindings: Env }>()

router.get('/:slug', async (c) => {
  const db = getDb(c.env.DB)
  const slug = c.req.param('slug')

  const page = await db.query.statusPages.findFirst({ where: eq(statusPages.slug, slug) })
  if (!page) return c.json({ error: 'Not found' }, 404)

  if (page.passwordHash) {
    const provided = c.req.header('x-status-password') ?? c.req.query('password')
    const pageInfo = { name: page.name, description: page.description }
    if (!provided) return c.json({ error: 'password_required', protected: true, page: pageInfo }, 401)
    if (!(await verifyPassword(provided, page.passwordHash))) return c.json({ error: 'wrong_password', protected: true, page: pageInfo }, 401)
  }

  let monitorIds: string[]
  let monitorRows: typeof monitors.$inferSelect[]

  if (page.showAllMonitors) {
    monitorRows = await db.select().from(monitors).where(eq(monitors.active, true))
    monitorRows.sort((a, b) => a.name.localeCompare(b.name))
    monitorIds = monitorRows.map(r => r.id)
  } else {
    const pageMonitorRows = await db.select().from(statusPageMonitors)
      .where(eq(statusPageMonitors.pageId, page.id))
    pageMonitorRows.sort((a, b) => a.sortOrder - b.sortOrder)
    monitorIds = pageMonitorRows.map(r => r.monitorId)

    if (monitorIds.length === 0) {
      return c.json({
        page: { name: page.name, description: page.description, protected: !!page.passwordHash },
        monitors: [],
        incidents: [],
      })
    }

    monitorRows = await db.select().from(monitors).where(inArray(monitors.id, monitorIds))
  }

  if (monitorIds.length === 0) {
    return c.json({
      page: { name: page.name, description: page.description, protected: !!page.passwordHash },
      monitors: [],
      incidents: [],
    })
  }

  const now = Math.floor(Date.now() / 1000)
  const since90d = now - 90 * 86400
  const allLogs = await db.select().from(statusLogs).where(
    and(inArray(statusLogs.monitorId, monitorIds), gte(statusLogs.checkedAt, since90d))
  )

  const monitorData = monitorRows.map(m => {
    const logs = allLogs.filter(l => l.monitorId === m.id)
    const upLogs = logs.filter(l => l.status === 'up')
    const uptime90d = logs.length > 0 ? Math.round((upLogs.length / logs.length) * 10000) / 100 : null

    const dayMap: Record<string, { total: number; ups: number }> = {}
    for (const log of logs) {
      const day = new Date(log.checkedAt * 1000).toISOString().slice(0, 10)
      if (!dayMap[day]) dayMap[day] = { total: 0, ups: 0 }
      dayMap[day].total++
      if (log.status === 'up') dayMap[day].ups++
    }

    const daily = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date((now - i * 86400) * 1000).toISOString().slice(0, 10)
      const e = dayMap[d]
      daily.push({ date: d, uptime: e ? Math.round((e.ups / e.total) * 1000) / 10 : null })
    }

    return { id: m.id, name: m.name, status: m.lastStatus, uptime90d, daily }
  })

  monitorData.sort((a, b) => monitorIds.indexOf(a.id) - monitorIds.indexOf(b.id))

  const incMonitorRows = await db.select().from(incidentMonitors)
    .where(inArray(incidentMonitors.monitorId, monitorIds))
  const incidentIds = [...new Set(incMonitorRows.map(r => r.incidentId))]

  let incidentData: object[] = []
  if (incidentIds.length > 0) {
    const since14d = now - 14 * 86400
    const incRows = await db.select().from(incidentReports)
      .where(inArray(incidentReports.id, incidentIds))
      .orderBy(desc(incidentReports.startedAt))
      .limit(20)

    for (const inc of incRows) {
      if (inc.resolvedAt && inc.resolvedAt < since14d) continue
      const updates = await db.select().from(incidentUpdates)
        .where(eq(incidentUpdates.incidentId, inc.id))
        .orderBy(desc(incidentUpdates.createdAt))
      const affectedMonitorIds = incMonitorRows
        .filter(r => r.incidentId === inc.id)
        .map(r => r.monitorId)
      incidentData.push({ ...inc, updates, monitorIds: affectedMonitorIds })
    }
  }

  return c.json({
    page: { name: page.name, description: page.description, protected: !!page.passwordHash },
    monitors: monitorData,
    incidents: incidentData,
  })
})

router.get('/:slug/monitors/:monitorId', async (c) => {
  const db = getDb(c.env.DB)
  const slug = c.req.param('slug')
  const monitorId = c.req.param('monitorId')

  const page = await db.query.statusPages.findFirst({ where: eq(statusPages.slug, slug) })
  if (!page) return c.json({ error: 'Not found' }, 404)

  if (page.passwordHash) {
    const provided = c.req.header('x-status-password') ?? c.req.query('password')
    if (!provided) return c.json({ error: 'password_required', protected: true }, 401)
    if (!(await verifyPassword(provided, page.passwordHash))) return c.json({ error: 'wrong_password', protected: true }, 401)
  }

  let monitor: typeof monitors.$inferSelect | undefined
  if (page.showAllMonitors) {
    monitor = await db.query.monitors.findFirst({
      where: and(eq(monitors.id, monitorId), eq(monitors.active, true)),
    })
  } else {
    const rows = await db.select().from(statusPageMonitors)
      .where(and(eq(statusPageMonitors.pageId, page.id), eq(statusPageMonitors.monitorId, monitorId)))
    if (rows.length > 0) {
      monitor = await db.query.monitors.findFirst({ where: eq(monitors.id, monitorId) })
    }
  }
  if (!monitor) return c.json({ error: 'Not found' }, 404)

  const now = Math.floor(Date.now() / 1000)
  const since90d = now - 90 * 86400

  const allLogs = await db.select().from(statusLogs)
    .where(and(eq(statusLogs.monitorId, monitorId), gte(statusLogs.checkedAt, since90d)))
    .orderBy(desc(statusLogs.checkedAt))

  const dayMap: Record<string, { total: number; ups: number }> = {}
  for (const log of allLogs) {
    const day = new Date(log.checkedAt * 1000).toISOString().slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { total: 0, ups: 0 }
    dayMap[day].total++
    if (log.status === 'up') dayMap[day].ups++
  }
  const daily = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date((now - i * 86400) * 1000).toISOString().slice(0, 10)
    const e = dayMap[d]
    daily.push({ date: d, uptime: e ? Math.round((e.ups / e.total) * 1000) / 10 : null })
  }

  function uptimeFor(sinceSecs: number): number | null {
    const rows = allLogs.filter(l => l.checkedAt >= sinceSecs)
    if (!rows.length) return null
    return Math.round((rows.filter(l => l.status === 'up').length / rows.length) * 10000) / 100
  }

  const logs24h = allLogs.filter(l => l.checkedAt >= now - 86400)
  const withTime = logs24h.filter(l => l.responseTimeMs !== null)
  const avgResponseMs = withTime.length > 0
    ? Math.round(withTime.reduce((s, l) => s + l.responseTimeMs!, 0) / withTime.length)
    : null

  const monitorIncidents = await db.select().from(incidents)
    .where(eq(incidents.monitorId, monitorId))
    .orderBy(desc(incidents.startedAt))
    .limit(20)

  return c.json({
    name: monitor.name,
    type: monitor.type,
    url: monitor.url,
    tags: monitor.tags,
    lastStatus: monitor.lastStatus,
    lastCheckedAt: monitor.lastCheckedAt,
    uptime1: uptimeFor(now - 86400),
    uptime7: uptimeFor(now - 7 * 86400),
    uptime30: uptimeFor(now - 30 * 86400),
    uptime90: uptimeFor(since90d),
    avgResponseMs,
    daily,
    logs: allLogs.slice(0, 200).map(l => ({
      checkedAt: l.checkedAt,
      status: l.status,
      responseTimeMs: l.responseTimeMs,
      message: l.message,
    })),
    incidents: monitorIncidents.map(i => ({
      startedAt: i.startedAt,
      resolvedAt: i.resolvedAt,
      durationSeconds: i.durationSeconds,
    })),
  })
})

export default router
