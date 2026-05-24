# Stage 1: Build the Hugo site and generate Pagefind index
FROM node:alpine AS builder

# 1. Install system tools 
# git: for themes/submodules
# go: in case your theme uses Hugo Modules (hugo.mod)
# libc6-compat & libstdc++: required runtimes for the Hugo Extended binary on Alpine
RUN apk add --no-cache git go libc6-compat libstdc++ wget

# 2. Download and install official Hugo Extended binary dynamically based on server architecture
ARG TARGETARCH
ENV HUGO_VERSION=0.161.1
RUN wget -O /tmp/hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz" && \
    tar -xf /tmp/hugo.tar.gz -C /usr/local/bin hugo && \
    rm /tmp/hugo.tar.gz

WORKDIR /app
COPY . .

# 3. Handle theme submodules & Node dependencies
RUN git submodule update --init --recursive || true
RUN npm install || true

# 4. Build the site with Hugo Extended
RUN hugo --minify

# 5. Run Pagefind search indexer
RUN npx --yes pagefind --site public

# Stage 2: Serve the site using Nginx
FROM nginx:alpine
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 80