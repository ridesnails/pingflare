# API

All authenticated endpoints require an `Authorization: Bearer <token>` header
Obtain a token by calling `POST /api/auth/login`

---

## Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Returns a JWT token valid for 30 days |
| POST | `/api/auth/refresh` | Exchanges a valid token for a new one with a fresh 30-day expiry |

---

## Monitors

| Method | Path | Description |
|---|---|---|
| GET | `/api/monitors` | List all monitors |
| POST | `/api/monitors` | Create a monitor |
| GET | `/api/monitors/:id` | Get a monitor |
| PUT | `/api/monitors/:id` | Update a monitor |
| DELETE | `/api/monitors/:id` | Delete a monitor |
| GET | `/api/monitors/:id/logs` | Status logs, supports `?hours=24&limit=500` |
| GET | `/api/monitors/:id/incidents` | Downtime incidents |
| GET | `/api/monitors/:id/uptime` | Uptime percentage, supports `?days=90` |
| GET | `/api/monitors/:id/daily` | Per-day uptime breakdown, supports `?days=90` |
| GET | `/api/monitors/:id/heartbeat-token` | Get heartbeat token |
| POST | `/api/monitors/:id/heartbeat-token/regenerate` | Rotate heartbeat token |
| GET | `/api/monitors/:id/channels` | Notification channel IDs linked to the monitor |

---

## Heartbeat

| Method | Path | Description |
|---|---|---|
| GET or POST | `/h/:token` | Register a heartbeat ping |

---

## Notifications

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | List channels |
| POST | `/api/notifications` | Create a channel |
| PUT | `/api/notifications/:id` | Update a channel |
| DELETE | `/api/notifications/:id` | Delete a channel |
| POST | `/api/notifications/:id/test` | Send a test notification |

---

## Status Pages

| Method | Path | Description |
|---|---|---|
| GET | `/api/status-pages` | List status pages |
| POST | `/api/status-pages` | Create a status page |
| PUT | `/api/status-pages/:id` | Update a status page |
| DELETE | `/api/status-pages/:id` | Delete a status page |
| GET | `/api/public/status/:slug` | Public data for a status page |

---

## Incidents

| Method | Path | Description |
|---|---|---|
| GET | `/api/incidents` | List incident reports |
| POST | `/api/incidents` | Create an incident report |
| PUT | `/api/incidents/:id` | Update an incident report |
| POST | `/api/incidents/:id/updates` | Add an update to an incident |
| DELETE | `/api/incidents/:id` | Delete an incident report |

---

## Events (SSE)

`GET /api/events` opens a Server-Sent Events stream that pushes monitor status in real time.

```
Authorization: Bearer <token>
# or
GET /api/events?token=<token>
```

### Events emitted

| Event | Payload | Frequency |
|---|---|---|
| `snapshot` | `Monitor[]` — full list of monitors with current status | On connect, then every 60 s |
| `heartbeat` | `{ ts: number }` — Unix timestamp (ms) | Every 30 s |

> **Note:** Cloudflare Workers free tier may close long-lived connections after ~30 s. The client should reconnect automatically, `EventSource` does this natively, and each reconnect immediately receives a fresh `snapshot`.

---

## Settings

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings |

Available settings keys: `retention_days` (default `90`), `site_title`.

---

## Notification Channel Configuration

Each channel stores its config as a JSON object.
Required fields per type:

| Type | Required fields |
|---|---|
| `discord` | `webhookUrl` |
| `slack` | `webhookUrl` |
| `telegram` | `botToken`, `chatId` |
| `email` | `host`, `port` (default `587`), `user`, `password`, `from`, `to` (comma-separated for multiple recipients) |
| `ntfy` | `url`, `topic` - optional: `token` |
| `pushover` | `token`, `user` |
| `webhook` | `url` - optional: `secret` (sent as `X-Pingflare-Secret` header) |
| `apprise` | `url` (Apprise API base URL), `urls` (notification service URLs) - optional: `token` |

---

## Monitor

### Fields

| Field | Default | Description |
|---|---|---|
| `name` | - | Display name |
| `type` | - | `http` or `heartbeat` |
| `interval` | `60` | Check interval in seconds |
| `active` | `true` | Whether the monitor is enabled |
| `toleranceFailures` | `1` | Consecutive failures before alerting |
| `reminderIntervalHours` | null | Hours between reminder alerts while down |
| `callbacksEnabled` | `false` | Send a notification on every check result |
| `surgeProtectionLimit` | null | Max alerts before pausing for 1 hour |

### HTTP-specific

| Field | Default | Description |
|---|---|---|
| `url` | - | Target URL |
| `method` | `GET` | HTTP method |
| `expectedStatus` | `200` | Expected HTTP status code |
| `timeout` | `30` | Request timeout in seconds |
| `followRedirects` | `true` | Follow HTTP redirects |
| `authType` | `none` | `none`, `basic`, `digest`, or `bearer` |
| `headers` | `{}` | Custom request headers as JSON object |
| `body` | null | Request body for POST/PUT/PATCH |

### Heartbeat-specific

| Field | Default | Description |
|---|---|---|
| `heartbeatInterval` | - | Expected interval between pings in seconds |
| `heartbeatGrace` | `30` | Grace period after deadline before marking down |
| `toleranceMissed` | `1` | Consecutive missed heartbeats before alerting |
