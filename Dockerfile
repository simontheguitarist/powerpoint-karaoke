# syntax=docker/dockerfile:1.7

# =============================================================================
# Stage 1 · deps + build
# =============================================================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Native-module toolchain + bun for fast installs. Stage is discarded.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
      pkg-config \
      ca-certificates \
      curl \
      unzip \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://bun.sh/install | bash \
  && ln -sf /root/.bun/bin/bun /usr/local/bin/bun

# Lockfile first for cache friendliness
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Then the rest
COPY tsconfig.json next.config.ts postcss.config.mjs drizzle.config.ts ./
COPY src ./src
COPY public ./public
COPY skills ./skills
COPY drizzle ./drizzle
COPY scripts ./scripts

ENV NEXT_TELEMETRY_DISABLED=1
# Run the build under Node (not bun) so better-sqlite3 native bindings load.
RUN ./node_modules/.bin/next build

# =============================================================================
# Stage 2 · runtime
# =============================================================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# System binaries used by the upload pipeline:
#   - libreoffice-impress: PPTX → PDF (headless via `soffice`)
#   - poppler-utils:       PDF → PNG  (via `pdftoppm`)
#   - chromium:            HTML slide → PNG thumbnails (via Playwright)
#   - fonts:               so libreoffice / sharp / chromium render decent text
#   - tini:                proper signal handling for our background jobs
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-impress \
      libreoffice-core \
      poppler-utils \
      chromium \
      fonts-dejavu-core \
      fonts-noto-color-emoji \
      fonts-liberation \
      ca-certificates \
      tini \
      curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=/data/pk.db \
    STORAGE_DIR=/data/storage \
    SOFFICE_PATH=/usr/bin/soffice \
    PDFTOPPM_PATH=/usr/bin/pdftoppm \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Non-root user
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --home /app nextjs

# Next standalone output is self-contained: server.js + minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Skill bundle (served at /api/skill/pk-deck and /api/skill/pk-deck/md)
COPY --from=builder --chown=nextjs:nodejs /app/skills ./skills

# Drizzle migrations + migrate runner (run at container startup)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.js ./scripts/migrate.js

# Persistent volume for SQLite + uploaded storage
RUN mkdir -p /data/storage && chown -R nextjs:nodejs /data
VOLUME ["/data"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/ >/dev/null || exit 1

# tini reaps zombies from `soffice` / `pdftoppm` subprocesses cleanly.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "node scripts/migrate.js && exec node server.js"]
