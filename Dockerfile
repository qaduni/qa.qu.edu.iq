# Stage 1: Build the Hugo site and generate Pagefind index
FROM alpine:latest AS builder

# Install Hugo, Git, Node.js, and npm
# Node.js/npm are required to run the Pagefind executable via npx
RUN apk add --no-cache hugo git nodejs npm

WORKDIR /app
COPY . .

# 1. Build the static site into the /app/public directory
RUN hugo --minify

# 2. Run Pagefind to index the generated static files
# The --site flag points to the directory Hugo just built
RUN npx --yes pagefind --site public

# Stage 2: Serve the site using Nginx
FROM nginx:alpine

# Copy the built files (which now include the Pagefind search bundle) 
# from the builder stage to Nginx's serving directory
COPY --from=builder /app/public /usr/share/nginx/html

# Expose port 80 for Dokploy's router
EXPOSE 80