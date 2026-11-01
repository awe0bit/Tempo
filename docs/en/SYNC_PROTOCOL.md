# Tempo sync protocol v1

## QR pairing extension

Sync continues to use the existing Bearer token. New devices can exchange a server-generated, one-time QR invitation for credentials.

- `POST /v1/pairing/create` requires the existing administrator Bearer token and accepts only local loopback connections without proxy forwarding headers. The server CLI calls it; apps cannot generate invitations.
- Creation returns a random 256-bit `code` and `expiresAt`. Invitations last five minutes. Memory retains only the SHA-256 digest of one active invitation. A new invitation revokes the previous one; a server restart also invalidates it.
- `POST /v1/pairing/redeem` accepts only `code` in the request body and requires no preexisting sync token. Matching and consumption happen under the same mutex, allowing only one concurrent request to succeed.
- Successful redemption returns `token` with caching prohibited. Invalid, expired, and reused codes all return `401`, without echoing input. Clients exchange credentials over HTTPS, reject redirects, and save to Keychain only after validation.
- QR content is JSON containing only `type: tempo-sync-pair`, `v: 1`, the HTTPS root address `server`, and temporary `code`. It contains no long-lived token and does not pass credentials in query parameters.

This extension neither changes existing sync documents nor rotates `SYNC_TOKEN`. Paired devices still share that token. Revoking an existing device requires rotating the token and pairing every device again; invitation expiration does not revoke device credentials.

See [QR pairing](PAIRING.md) for instructions.

This document describes the HTTP/JSON protocol implemented by the server and covered by automated tests. Examples use `https://todo.darker.one`; replace it with your own HTTPS domain when self-hosting.

Back to: [Documentation home](index.md) · [Architecture](ARCHITECTURE.md) · [Deployment](DEPLOYMENT.md)

## Conventions

- Use HTTPS in production.
- `/v1/*` requires `Authorization: Bearer <SYNC_TOKEN>`, except one-time pairing-code redemption.
- `SYNC_TOKEN` must contain 64 hexadecimal characters: a random 256-bit value.
- JSON uses UTF-8. API responses include `Cache-Control: no-store`.
- Timestamps use UTC RFC 3339. Clients should generate millisecond or higher precision where possible.
- Older clients should ignore unspecified fields to maintain backward compatibility.

## Endpoint overview

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | None | Check the process and data-directory writability |
| `GET` | `/v1/ping` | Bearer token | Test the address and token without accessing data |
| `POST` | `/v1/sync` | Bearer token | Merge and return tasks, Pomodoro, RSS, and migration-workspace state |
| `GET` | `/v1/changes?since=<revision>` | Bearer token | Wait up to 25 seconds for a revision change |
| `POST` | `/v1/ai` | Bearer token | Optional RSS summary, translation, and task-planning proxy |
| `POST` | `/v1/pairing/create` | Bearer token, local only | Generate a one-time invitation from the server terminal |
| `POST` | `/v1/pairing/redeem` | Temporary pairing code | Exchange for device credentials without modifying sync data |

## Health check

```http
GET /health
```

Success:

```json
{"status":"ok"}
```

This checks not only that the HTTP process exists but that the data directory is writable. Unavailable storage returns `503` and `{"status":"unavailable"}`.

## Connection validation

```http
GET /v1/ping
Authorization: Bearer <SYNC_TOKEN>
```

Success returns only:

```json
{"status":"ok"}
```

This endpoint does not read, modify, or return user data. The client's connection test uses it to validate configuration.

## Bidirectional sync

```http
POST /v1/sync
Authorization: Bearer <SYNC_TOKEN>
Content-Type: application/json
```

Example request:

```json
{
  "deviceId": "iphone",
  "tasks": [
    {
      "id": "task-1",
      "title": "Submit weekly report",
      "notes": "",
      "status": "open",
      "projectId": null,
      "startAt": "2026-08-28T09:00:00.000Z",
      "deadlineAt": null,
      "completedAt": null,
      "order": 0,
      "createdAt": "2026-08-28T08:00:00.000Z",
      "updatedAt": "2026-08-28T08:30:00.000Z",
      "deletedAt": null
    }
  ],
  "pomodoro": {
    "mode": "focus",
    "status": "running",
    "remainingSeconds": 1500,
    "completedFocusSessions": 2,
    "focusMinutes": 25,
    "shortBreakMinutes": 5,
    "longBreakMinutes": 15,
    "endsAt": "2026-08-28T08:55:00.000Z",
    "updatedAt": "2026-08-28T08:30:00.000Z"
  },
  "rss": {
    "subscriptions": [],
    "folders": [],
    "articleStates": [],
    "updatedAt": "2026-08-28T08:30:00.000Z"
  },
  "workspace": {
    "schema": 1,
    "updatedAt": "2026-08-28T08:30:00.000Z",
    "data": {}
  }
}
```

The response contains the complete merged server state:

```json
{
  "tasks": [],
  "pomodoro": {
    "mode": "focus",
    "status": "running",
    "remainingSeconds": 1500,
    "completedFocusSessions": 2,
    "focusMinutes": 25,
    "shortBreakMinutes": 5,
    "longBreakMinutes": 15,
    "endsAt": "2026-08-28T08:55:00.000Z",
    "updatedAt": "2026-08-28T08:30:00.000Z"
  },
  "rss": {
    "subscriptions": [],
    "folders": [],
    "articleStates": [],
    "updatedAt": "2026-08-28T08:30:00.000Z"
  },
  "workspace": {
    "schema": 1,
    "updatedAt": "2026-08-28T08:30:00.000Z",
    "data": {}
  },
  "serverTime": "2026-08-28T08:30:01.123Z",
  "revision": 1787905801123
}
```

`deviceId` is 1–128 characters and is used only for log identification. The server interprets task `id`, `updatedAt`, and `deletedAt`, preserving all other fields as complete JSON. Clients can therefore add ordinary task fields without a server-code migration.

Clients may omit unsupported `pomodoro`, `rss`, or `workspace` fields. The server retains existing documents instead of clearing them when an older client omits a field.

`workspace` is a transitional document used while Android replaces its shared task model. It also uses singleton LWW merging by `updatedAt`; `schema` rejects incompatible snapshots. Before applying a pulled snapshot, clients must fully parse it and back up local data. Any write failure must restore the backup. An empty response must never erase a device. Once Android's shared-task migration is complete, the field may remain for older clients, but its business semantics should not keep expanding.

## Merge rules

### Tasks

1. `id` is the permanent task identity.
2. For the same `id`, compare UTC `updatedAt`; the newer complete task wins.
3. On a timestamp tie, retain the server copy. If an active copy conflicts with a deletion tombstone, the tombstone wins.
4. A non-null `deletedAt` marks soft deletion and must not be later than `updatedAt`.
5. Preserve and return tombstones so old offline devices cannot resurrect deleted tasks.
6. Reject `updatedAt` values more than five minutes ahead of server time.
7. Re-submitting the same snapshot is idempotent.

### Pomodoro

Pomodoro is a singleton LWW document, also compared by `updatedAt`. Running state uses an absolute UTC `endsAt`; paused or idle state treats `remainingSeconds` as authoritative.

- `phaseID`: refreshed on each start, resume, or automatic phase transition so system Live Activities do not reuse the previous phase's countdown view.
- `dailyFocusGoal`: a daily goal of 1–24 Pomodoros, shared by iOS, Android, and desktop clients.
- `focusHistory`: completed or manually ended focus records, used to calculate daily progress and GitHub-style annual heatmaps.

New fields remain backward compatible: if older clients omit them, the server preserves the existing Pomodoro document. Newer clients reading an old document use a default goal of 4 and generate a local phase identifier.

`focusMinutes`, `shortBreakMinutes`, and `longBreakMinutes` store custom phase durations. Clients use response `serverTime` to calculate clock offset so devices show the same remaining time.

### RSS

RSS is a singleton LWW document containing:

- Subscription addresses and source metadata.
- Source folders.
- Each article's stable ID, read status, saved status, and reading progress.

Article titles, summaries, HTML, and bodies are not uploaded to sync. Each device fetches source content independently and applies synced state using stable article IDs.

## Real-time change notifications

```http
GET /v1/changes?since=1787905801123
Authorization: Bearer <SYNC_TOKEN>
```

Return immediately when data changes:

```json
{"revision":1787905801124,"changed":true}
```

If nothing changes within 25 seconds, return the current revision and `changed: false`. This endpoint carries no user data. Clients call `/v1/sync` only when `changed` is true and the revision has advanced.

A foreground device keeps one waiting request. Full sync every five minutes handles network changes and reconnection. Clients persist the last revision and retry failures with jittered backoff of 1, 2, 4, 8, and at most 16 seconds. Reverse-proxy read timeouts must exceed 25 seconds, and this endpoint must not be cached.

`revision` is a persisted monotonic identifier within the current data directory, not a business timestamp. Do not compare it across different data directories. Normal restart does not move it backward; restoring an old backup or changing servers establishes a new baseline through the next full sync.

## AI proxy

This endpoint is available only when the server has `AI_API_KEY` configured:

```http
POST /v1/ai
Authorization: Bearer <SYNC_TOKEN>
Content-Type: application/json
```

### RSS summary

```json
{
  "mode": "rss_summary",
  "title": "Article title",
  "content": "Article body",
  "prompt": "Optional custom summary instructions"
}
```

An empty `prompt` uses the built-in instructions: one concluding sentence, three key points, and one actionable step, within 260 Chinese characters in total.

### RSS translation

```json
{
  "mode": "rss_translation",
  "content": "[\"First paragraph\",\"Second paragraph\"]"
}
```

`content` is a serialized JSON string array with at most 40 paragraphs. The response preserves paragraph count and order so clients replace original text nodes rather than opening a second translation page.

### Task planning

```json
{
  "mode": "task_plan",
  "goal": "Finish the report today and leave time to study",
  "tasks": [
    {"title": "Write the report", "scheduledAt": "2026-08-28T09:00:00Z"}
  ]
}
```

Submit at most 200 tasks. The model is asked for no more than six concise suggestions scheduled within the next 0–14 days.

All successful AI responses use:

```json
{"text":"Model response text"}
```

Unconfigured AI returns `503 ai_not_configured`; an unavailable upstream model returns `502 ai_request_failed`. AI request bodies are limited to 80 KiB, independently of ordinary sync.

## Limits

| Item | Default limit |
| --- | --- |
| Sync request body | 2 MiB; adjustable with `SYNC_MAX_BODY_BYTES` |
| Tasks per request | 10,000 |
| Total server tasks | 20,000, including tombstones |
| Total task JSON | 8 MiB |
| On-disk state file | 10 MiB |
| `deviceId` | 1–128 characters |
| Future clock skew | At most five minutes |
| Change wait | At most 25 seconds |

This service is intended for one person's private deployment: one `SYNC_TOKEN` corresponds to one `store.json`. It provides no multi-account or tenant isolation. Do not use an instance as a shared sync service for strangers. Multiple people need separate instances, tokens, and data volumes.

Only single-instance writing is supported. Multiple processes must not share one `store.json`.

## Error format

```json
{
  "error": {
    "code": "invalid_task",
    "message": "..."
  }
}
```

| HTTP status | Common cause |
| --- | --- |
| `400` | Invalid JSON, timestamp, task, revision, or AI parameters |
| `401` | Missing or incorrect Bearer token |
| `403` | Browser Origin is not allowlisted |
| `405` | Unsupported HTTP method |
| `413` | Request body exceeds its limit |
| `500` | Storage write failure |
| `502` | AI upstream failure |
| `503` | Unavailable data directory or unconfigured AI |
| `507` | Server task-count or data-capacity limit exceeded |

## Protocol evolution

The disk format has an explicit version. v1 clients must ignore unknown ordinary task fields; the server preserves complete task JSON. Future additions such as an incremental operation log, end-to-end encryption, or multi-user authentication require an explicit new version or migration, without silently changing these v1 semantics.
