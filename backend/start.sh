#!/usr/bin/env sh

# Ensure Prisma client is up to date with the DB
echo "🚀 Pre-deployment: Generating Prisma client..."
bun run db:generate

# Push schema changes (Best for MongoDB Atlas or Rapid Prototyping)
# For strict PostgreSQL prod, you might use 'bun run db:migrate' instead.
echo "🔄 Pre-deployment: Pushing database schema updates..."
bun run db:push # Danger! Remove --accept-data-loss if you want strict safety

# Start the application
echo "✨ Starting ORIN Backend Server..."
bun run src/server.ts
