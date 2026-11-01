# Self-hosted sync

After the service is healthy, use the [user guide](CONFIGURATION.md) to connect clients and configure AI and RSS. A server is optional for basic local use.

This guide deploys Tempo's personal sync service on a Linux server. `todo.darker.one` hosts documentation only and is not required by the clients.

## Requirements

- A Linux server with Docker Engine and Docker Compose v2
- A domain name with a valid HTTPS certificate
- Nginx, Caddy, or 1Panel OpenResty as a reverse proxy

## Start the service

```bash
git clone https://github.com/awe0bit/Tempo.git
cd Tempo/services/sync
cp .env.example .env

TOKEN=$(openssl rand -hex 32)
sed -i "s/^SYNC_TOKEN=.*/SYNC_TOKEN=$TOKEN/" .env
chmod 600 .env

sudo install -d -m 700 -o 65532 -g 65532 data
docker compose config --quiet
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
echo "$TOKEN"
```

The health endpoint should return `{"status":"ok"}`. Keep the token in a password manager. It is never printed in QR codes or logs; a device receives it over HTTPS only after confirming a one-time pairing invitation.

The repository also includes [`deploy/tempo-services`](https://github.com/awe0bit/Tempo/tree/main/deploy/tempo-services) for the production server. It registers the sync service as the `tempo-services` Compose project in 1Panel.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `SYNC_TOKEN` | none | Required 64-character hexadecimal sync token |
| `SYNC_LISTEN` | `127.0.0.1:8080` | Host listener; keep it on loopback |
| `SYNC_DATA_DIR` | `./data` | Persistent data directory |
| `SYNC_MAX_BODY_BYTES` | `2097152` | Maximum sync request size |
| `GOMEMLIMIT` | `48MiB` | Go runtime soft memory limit |
| `AI_BASE_URL` | OpenAI-compatible endpoint | Optional server-side AI endpoint |
| `AI_API_KEY` | empty | Leave empty to disable the AI proxy |
| `AI_MODEL` | See `.env.example` | Set to a model your account can access before enabling AI |

## HTTPS reverse proxy

Keep port 8080 private. For Nginx or 1Panel OpenResty, add:

```nginx
location /v1/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 2m;
    proxy_connect_timeout 5s;
    proxy_read_timeout 40s;
}

location = /health {
    proxy_pass http://127.0.0.1:8080/health;
}
```

Verify the public endpoint:

```bash
curl -fsS https://your-domain.example/health
curl -i https://your-domain.example/v1/ping
```

The second command should return `401` without a token. This confirms that HTTPS, proxying, and authentication are active.

## Connect clients

Current iOS uses server-generated QR pairing, without manual URL or token entry. From the directory containing the running sync Compose project, run:

~~~bash
docker compose exec sync /tempo-sync pair --server https://your-sync-domain.example
~~~

On iOS, open **Settings → Self-hosted Sync → Scan to pair**, scan, and confirm the server. Codes expire after 5 minutes and can be redeemed once; generating a new one revokes the previous invitation. See [QR pairing](PAIRING.md) for 1Panel instructions.

## Update

```bash
cd Tempo/services/sync
git pull --ff-only
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
```

## Backup

With this setup, the data file is `services/sync/data/store.json`. Run the following from `services/sync`; use your chosen directory if you changed `SYNC_DATA_DIR`.

```bash
docker compose stop sync
tar -C data -czf "tempo-sync-$(date +%F-%H%M%S).tar.gz" store.json
docker compose start sync
```

Protect `.env`, `store.json`, and backups as sensitive data. The current server is single-user and the data file is not end-to-end encrypted from the host administrator.

## Troubleshooting

```bash
docker compose ps
docker compose logs --tail=100 sync
docker stats --no-stream
curl -i http://127.0.0.1:8080/health
curl -i https://your-domain.example/health
```

- `401`: the client token and server token differ.
- `413`: raise both `SYNC_MAX_BODY_BYTES` and the proxy body limit.
- `502`: check the container, listener, and loopback address.
- Noticeable delay: keep `/v1/changes` uncached and set the proxy read timeout above 25 seconds.
