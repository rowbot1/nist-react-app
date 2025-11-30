# Production image using pre-built files
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy Prisma schema and generate
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy pre-built server
COPY server/dist ./dist
COPY server/data ./data

# Copy pre-built client
COPY client/build ../client/build

# Create logs and data directories
RUN mkdir -p logs data

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
