# Stage 1: Build stage
FROM node:22-alpine as builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install clean dependencies
RUN npm ci

# Copy application source code
COPY . .

# Accept VITE_API_URL build argument for compile-time environment injection
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build static production files
RUN npm run build

# Stage 2: Production release served via Nginx
FROM nginx:1.25-alpine

# Copy custom Nginx configuration for single page application routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from Stage 1 builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
