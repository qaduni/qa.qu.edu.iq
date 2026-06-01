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
# Fail the build loudly if submodules don't populate — silent failure here is
# what produced "site is stale after push" symptoms previously.
RUN git config --global --add safe.directory '*' \
 && git submodule sync --recursive \
 && git submodule update --init --recursive --depth 1 \
 && test -f themes/qu.theme/theme.toml \
 || (echo "FATAL: theme submodule did not populate; check Dokploy clone settings" \
     && ls -la themes/qu.theme/ \
     && exit 1)

# 6. Build and index
# News and announcements are indexed into SEPARATE Pagefind bundles so each
# list page can show a search box scoped to only its own content.
# Either section may legitimately have no articles yet (e.g. between content
# drops); pagefind exits non-zero on an empty index, so tolerate that for
# both bundles rather than failing the whole image build. The list page's
# search UI just won't find anything until content is added — which is the
# correct behaviour for an empty section.
#
# CACHEBUST forces this layer to re-run every deploy regardless of layer-cache
# state. All tool layers above (apk, hugo binary, npm ci) sit above this ARG
# and keep caching across deploys; everything from here down (submodules → hugo
# → pagefind → output) is forced fresh. Wire `CACHEBUST` in Dokploy's Build
# Time Arguments to the commit SHA or a per-deploy timestamp — a static value
# defeats the purpose.
ARG CACHEBUST=unset
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    echo "Build cachebust token: $CACHEBUST" \
 && hugo --minify \
 && ( npx --yes pagefind --site public --glob "**/media/news/**/*.html"          --output-subdir pagefind-news \
      || echo "No news to index yet — skipping the news search bundle." ) \
 && ( npx --yes pagefind --site public --glob "**/media/announcements/**/*.html" --output-subdir pagefind-announcements \
      || echo "No announcements to index yet — skipping the announcements search bundle." )

# Stage 2: Serve the built site with nginx behind Dokploy/Traefik
FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/public /usr/share/nginx/html

EXPOSE 80

# Use 127.0.0.1 explicitly. On alpine, `localhost` resolves to ::1 first via
# musl/getent ordering, but nginx listens on IPv4 only (see deploy/nginx.conf).
# A `localhost` healthcheck would always fail with "Connection refused", marking
# the container unhealthy in Swarm and causing Traefik to return Bad Gateway —
# even though the site itself serves correctly. See debug session
# .planning/debug/resolved/dokploy-stale-site-and-bad-gateway.md.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
