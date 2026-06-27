# syntax=docker/dockerfile:1

FROM node:24-alpine AS web-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS web-builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=web-deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public && npm run build

FROM node:24-bookworm-slim AS node-runtime

FROM python:3.13-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV API_HOST=127.0.0.1
ENV API_PORT=8000
ENV DATABASE_URL=sqlite:////data/model_test.db
ENV CORS_ALLOW_ORIGINS=http://127.0.0.1:3000,http://localhost:3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libstdc++6 \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --no-cache-dir uv

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend ./backend
COPY docker/start.py ./start.py
COPY --from=web-builder /app/public ./public
COPY --from=web-builder /app/.next/standalone ./
COPY --from=web-builder /app/.next/static ./.next/static

RUN mkdir -p /data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3000', timeout=5); urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)"

CMD ["python", "/app/start.py"]
