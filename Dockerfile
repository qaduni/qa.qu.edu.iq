# syntax=docker/dockerfile:1.7

# Stage 1: Build the Hugo site and generate Pagefind indexes
FROM node:22-alpine AS builder

ARG TARGETARCH
ARG HUGO_VERSION=0.161.1

# 1. Install system tools (apk cache mounted across builds)
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-cache git libc6-compat libstdc++

# 2. Download and install official Hugo Extended binary
#    Stream the tarball straight into tar — no intermediate file, no extra cleanup step.
RUN wget -qO- "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz" \
    | tar -xzC /usr/local/bin hugo

WORKDIR /app

# 3. Install NPM dependencies (npm cache mounted; prefer ci when a lockfile exists)
#    Copy ONLY package files first so this layer caches unless these specific files change.
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    if [ -f package-lock.json ]; then \
        npm ci --prefer-offline --no-audit --no-fund || npm install --no-audit --no-fund; \
    else \
        npm install --no-audit --no-fund; \
    fi

# 4. Copy the rest of the repository code
COPY . .

# 5. Initialize Git submodules
# This must run after 'COPY . .' because it requires the .git and .gitmodules files.
RUN git submodule update --init --recursive || true

# 6. Build and index
# News and announcements are indexed into SEPARATE Pagefind bundles so each
# list page can show a search box scoped to only its own content.
# Announcements may legitimately have no articles yet; pagefind exits non-zero
# on an empty index, so tolerate that one case without failing the build.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    hugo --minify \
 && npx --yes pagefind --site public --glob "**/media/news/**/*.html"          --output-subdir pagefind-news \
 && ( npx --yes pagefind --site public --glob "**/media/announcements/**/*.html" --output-subdir pagefind-announcements \
      || echo "No announcements to index yet — skipping the announcements search bundle." )

# Stage 2: Serve the built site with nginx behind Dokploy/Traefik
FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/public /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
