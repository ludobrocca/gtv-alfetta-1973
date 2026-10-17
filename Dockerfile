# ==============================================================================
# Stage 1: Builder (Node.js 20 Alpine)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source and public assets (including 3D .glb models)
COPY . .

# Build optimized production bundle into /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Production Server (Nginx 1.27 Alpine)
# ==============================================================================
FROM nginx:1.27-alpine AS production

# Copy custom Nginx configuration with GLB MIME types & Gzip compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets and 3D models from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
