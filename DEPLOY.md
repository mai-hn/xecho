# Docker + GHCR Deployment

This project is deployed as one container image:

- Next.js standalone server listens on `0.0.0.0:3000`.
- FastAPI listens only inside the container on `127.0.0.1:8000`.
- Next.js rewrites `/site/*`, `/project/model-test/*`, and `/health` to the internal FastAPI server.
- SQLite is persisted in a Docker volume mounted at `/data`.

The server only maps the web port. The API port is not exposed to the host.

## 1. Publish the GHCR Image

The workflow at `.github/workflows/publish-ghcr.yml` builds and pushes:

```text
ghcr.io/<owner>/xecho
```

It publishes these tags:

- `latest` on the default branch
- branch names, such as `main`
- git tags, such as `v1.0.0`
- commit SHA tags, such as `sha-abc1234`

Push to `main`, or run the workflow manually from GitHub Actions.

If the package is private, create a GitHub Personal Access Token with `read:packages` permission for the server.

## 2. Prepare the Server

Install Docker and the Docker Compose plugin, then create an app directory:

```bash
sudo mkdir -p /opt/xecho
sudo chown -R "$USER":"$USER" /opt/xecho
cd /opt/xecho
```

Copy the contents of `deploy/` into `/opt/xecho`, so the server directory contains:

```text
docker-compose.yml
.env.example
```

Then create the server env file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
IMAGE=ghcr.io/OWNER/xecho
IMAGE_TAG=latest
WEB_PORT=3000
CORS_ALLOW_ORIGINS=http://localhost:3000
DATABASE_URL=sqlite:////data/model_test.db
```

Replace `OWNER`. Change `WEB_PORT` if the host should expose a different port.

## 3. Login to GHCR

For private images:

```bash
echo "<github-token>" | docker login ghcr.io -u <github-username> --password-stdin
```

Public images do not require login.

## 4. Start

From the directory containing `docker-compose.yml`, run:

```bash
docker compose pull
docker compose up -d
```

Check status:

```bash
docker compose ps
docker compose logs -f xecho
```

Health check:

```bash
curl http://127.0.0.1:3000/health
```

If `WEB_PORT` is changed, use that port in the health check.

## 5. Update

After a new image is published:

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

To deploy an exact commit, set `IMAGE_TAG` to the workflow's `sha-...` tag and run the same commands.

## Notes

- Open only the selected `WEB_PORT` on the server firewall.
- SQLite data is stored in the `xecho-data` Docker volume.
- The API is private to the container. Browser requests go through the Next.js rewrite.
- API keys entered in the model tester are persisted in SQLite. Do not expose this tool publicly without authentication.
