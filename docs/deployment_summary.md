# Deployment Summary

## Status

- Deployed on 2026-04-03
- Public URL: `https://fu-ball.194.164.194.141.sslip.io`
- Reverse proxy: Traefik on the external Docker network `traefik`
- TLS: Let's Encrypt via Traefik

## Repo Files

- `frontend/Dockerfile` builds the Vite app and serves it with nginx
- `frontend/nginx.conf` handles SPA routing and cache headers
- `frontend/.dockerignore` keeps the Docker build context small
- `deploy/docker-compose.yml` defines the Traefik-exposed app service

## Server Layout

- Server-side compose path: `/etc/docker/containers/fu-ball-live-table/docker-compose.yml`
- Container name: `fu-ball-live-table`

## Deploy and Redeploy

From the repo root:

```bash
bash scripts/deploy.sh
```

What it does:

- runs `npm run build`
- runs `npm test`
- rebuilds and restarts the Docker service with `sudo docker compose -f /etc/docker/containers/fu-ball-live-table/docker-compose.yml up -d --build`
- verifies the public URL returns `HTTP/2 200`

## Verification

- `npm run build`
- `npm test`
- Container reported healthy after start
- Public HTTPS check returned `HTTP/2 200`

## Notes

- The current public hostname uses `sslip.io` so it works without adding DNS manually.
- If a `*.witossek.com` hostname is preferred later, update the Traefik router rule after DNS is pointed to the server IP.
