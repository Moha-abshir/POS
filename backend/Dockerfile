# Use Node.js 22 LTS Alpine image for a lightweight footprint
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install clean dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose backend API port
EXPOSE 5000

# Start script executes migrations, then starts server
CMD ["npm", "run", "start"]
