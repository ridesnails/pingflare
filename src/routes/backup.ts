import { Hono } from 'hono'
import {
  getDb,
  monitors,
  notificationChannels,
  statusPages,
  statusPageMonitors,
  monitorNotifications,
  settings,
  heartbeatTokens,
  alertState,
} from '../db'
import { requireAuth } from '../middleware/auth'
import type { Env } from '../index'

const router = new Hono<{ Bindings: Env }>()
router.use('*', requireAuth)

router.get('/', async (c) => {
  const db = getDb(c.env.DB)

  const settingsRows = await db.select().from(settings)
  const settingsMap: Record<string, string> = {}
  for (const row of settingsRows) settingsMap[row.key] = row.value

  const monitorsRows = await db.select().from(monitors)
  const notifRows = await db.select().from(notificationChannels)
  const statusPagesRows = await db.select().from(statusPages)
  const monitorNotifRows = await db.select().from(monitorNotifications)
  const spmRows = await db.select().from(statusPageMonitors)

  const monitorsWithChannels = monitorsRows.map(m => ({
    ...m,
    channelIds: monitorNotifRows.filter(mn => mn.monitorId === m.id).map(mn => mn.channelId),
  }))

  const pagesWithMonitors = statusPagesRows.map(p => ({
    ...p,
    monitorIds: spmRows
      .filter(spm => spm.pageId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(spm => spm.monitorId),
  }))

  return c.json({
    version: 1,
    exportedAt: Math.floor(Date.now() / 1000),
    settings: settingsMap,
    monitors: monitorsWithChannels,
    notifications: notifRows,
    statusPages: pagesWithMonitors,
  })
})

router.post('/restore', async (c) => {
  const body = await c.req.json()

  if (body.version !== 1) return c.json({ error: 'Unsupported backup version' }, 400)

  const db = getDb(c.env.DB)
  const now = Math.floor(Date.now() / 1000)

  // Delete all existing data (cascade handles junction tables)
  await db.delete(monitors)
  await db.delete(notificationChannels)
  await db.delete(statusPages)
  await db.delete(settings)

  // Restore settings
  if (body.settings && typeof body.settings === 'object') {
    for (const [key, value] of Object.entries(body.settings)) {
      await db.insert(settings).values({ key, value: String(value) })
    }
  }

  // Restore notification channels
  if (Array.isArray(body.notifications)) {
    for (const ch of body.notifications) {
      await db.insert(notificationChannels).values({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        config: ch.config ?? '{}',
        active: ch.active ?? true,
        isDefault: ch.isDefault ?? false,
        createdAt: ch.createdAt ?? now,
      })
    }
  }

  // Restore monitors with their channel links
  if (Array.isArray(body.monitors)) {
    for (const m of body.monitors) {
      await db.insert(monitors).values({
        id: m.id,
        name: m.name,
        type: m.type,
        tags: m.tags ?? '[]',
        interval: m.interval ?? 60,
        active: m.active ?? true,
        lastCheckedAt: null,
        lastStatus: 'pending',
        reminderIntervalHours: m.reminderIntervalHours ?? null,
        toleranceFailures: m.toleranceFailures ?? 1,
        url: m.url ?? null,
        method: m.method ?? 'GET',
        body: m.body ?? null,
        headers: m.headers ?? '{}',
        expectedStatus: m.expectedStatus ?? 200,
        followRedirects: m.followRedirects ?? true,
        timeout: m.timeout ?? 30,
        ipVersion: m.ipVersion ?? 'auto',
        authType: m.authType ?? 'none',
        authUsername: m.authUsername ?? null,
        authPassword: m.authPassword ?? null,
        authToken: m.authToken ?? null,
        heartbeatInterval: m.heartbeatInterval ?? null,
        heartbeatGrace: m.heartbeatGrace ?? 30,
        toleranceMissed: m.toleranceMissed ?? 1,
        surgeProtectionLimit: m.surgeProtectionLimit ?? null,
        sslCheckEnabled: m.sslCheckEnabled ?? false,
        sslStatus: 'unknown',
        cacheBooster: m.cacheBooster ?? false,
        createdAt: m.createdAt ?? now,
        updatedAt: now,
      })

      await db.insert(alertState).values({ monitorId: m.id })

      if (m.type === 'heartbeat') {
        await db.insert(heartbeatTokens).values({ monitorId: m.id, token: crypto.randomUUID() })
      }

      if (Array.isArray(m.channelIds)) {
        for (const channelId of m.channelIds) {
          await db.insert(monitorNotifications).values({ monitorId: m.id, channelId })
        }
      }
    }
  }

  // Restore status pages with their monitor links
  if (Array.isArray(body.statusPages)) {
    for (const p of body.statusPages) {
      await db.insert(statusPages).values({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description ?? null,
        passwordHash: p.passwordHash ?? null,
        showAllMonitors: p.showAllMonitors ?? false,
        createdAt: p.createdAt ?? now,
      })

      if (Array.isArray(p.monitorIds)) {
        for (let i = 0; i < p.monitorIds.length; i++) {
          await db.insert(statusPageMonitors).values({ pageId: p.id, monitorId: p.monitorIds[i], sortOrder: i })
        }
      }
    }
  }

  return c.json({ ok: true })
})

export default router
