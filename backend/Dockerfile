# Use the official Bun image
FROM oven/bun:latest

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma Client
RUN bun run db:generate

# Copy source code
COPY . .

# Build TypeScript
RUN bun run build

# Expose port (Render sets PORT env)
EXPOSE 10000

# Set environment to production
ENV NODE_ENV=production

# Start the application with inline schema synchronization
CMD ["sh", "-c", "bun run db:push && bun run src/server.ts"]
