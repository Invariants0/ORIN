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

# Make startup script executable
RUN chmod +x ./start.sh

# Start the application using our script
CMD ["./start.sh"]
