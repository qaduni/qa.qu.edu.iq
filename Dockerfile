# Stage 1: Build the Hugo site and generate Pagefind index
FROM node:alpine AS builder

# 1. Install system tools 
RUN apk add --no-cache git libc6-compat libstdc++ wget

# 2. Download and install official Hugo Extended binary
ARG TARGETARCH
ENV HUGO_VERSION=0.161.1
RUN wget -O /tmp/hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz" && \
    tar -xf /tmp/hugo.tar.gz -C /usr/local/bin hugo && \
    rm /tmp/hugo.tar.gz

WORKDIR /app

# 3. Cache NPM Dependencies (Crucial Optimization)
# Copy ONLY package files first so Docker caches the 'npm install' step unless these specific files change.
COPY package.json package-lock.json* ./
RUN npm install || true

# 4. Copy the rest of the repository code
COPY . .

# 5. Initialize Git submodules
# This must run after 'COPY . .' because it requires the .git and .gitmodules files.
RUN git submodule update --init --recursive || true

# 6. Build and index
RUN hugo --minify
RUN npx --yes pagefind --site public

# Stage 2: Serve the site using Nginx
FROM nginx:alpine
COPY --from=builder /app/public /usr/share/nginx/html
EXPOSE 80