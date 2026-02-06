# Build stage
FROM node:22-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (using npm to ensure native modules are built correctly)
# We skip the lockfile to ensure platform-specific optional dependencies (like libsql-musl) are installed
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

# Install dumb-init for proper PID 1 handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package file for production install
COPY package.json ./

# Install only production dependencies to ensure native modules (like libsql) are present
RUN npm install --omit=dev

# Copy built application (no chown needed for root)
COPY --from=builder /app/.output ./.output
# Copy migrations
COPY --from=builder /app/drizzle ./drizzle

# Create data directory for SQLite
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV HOST=127.0.0.1
ENV PORT=3500
ENV DATABASE_URL=file:/data/timeflow.db

# Expose port (can be overridden)
EXPOSE ${PORT}

# Start the application as root
CMD ["dumb-init", "node", ".output/server/index.mjs"]
