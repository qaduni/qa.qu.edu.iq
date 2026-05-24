# Stage 1: Build the Hugo site and generate Pagefind index
FROM alpine:latest AS builder

RUN apk add --no-cache hugo git nodejs npm

WORKDIR /app
COPY . .

# FIX 1: Ensure Git submodules (like your theme) are downloaded
RUN git submodule update --init --recursive || true

# FIX 2: Install any required Node dependencies for your theme
RUN npm install || true

# 1. Build the static site. 
# Added --printI18nWarnings and --logLevel info to force Hugo to print 
# exactly what went wrong if it crashes.
RUN hugo --minify --logLevel info

# 2. Run Pagefind to index the generated static files
RUN npx --yes pagefind --site public

# Stage 2: Serve the site using Nginx
FROM nginx:alpine

COPY --from=builder /app/public /usr/share/nginx/html

EXPOSE 80