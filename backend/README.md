# ORIN Backend README

## Quick Start

```bash
# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env and add your API keys

# Run development server
bun run dev
```

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_URL`: PostgreSQL connection string (NeonDB recommended)
- `GEMINI_API_KEY`: Google Gemini API key
- `NOTION_API_KEY`: Notion integration token
- `NOTION_DATABASE_ID`: Notion database ID
- `JWT_SECRET`: Random secret for JWT
- `SESSION_SECRET`: Random secret for sessions

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── envVars.ts      # Environment validation with Zod
│   │   ├── database.ts     # Prisma client singleton
│   │   └── logger.ts       # Winston logger
│   ├── controllers/
│   │   └── chat.controller.ts  # Chat business logic
│   ├── handlers/
│   │   └── async.handler.ts    # Async wrapper pattern
│   ├── routes/
│   │   ├── chat.routes.ts     # Chat endpoints
│   │   └── health.routes.ts   # Health check
│   ├── services/
│   │   ├── gemini.service.ts  # Google Gemini AI
│   │   └── notion.service.ts  # Notion API integration
│   ├── utils/
│   │   └── errors.ts          # APIError class
│   └── server.ts              # Express app setup
└── prisma/
    └── schema.prisma          # Database schema
```

## Available Scripts

```bash
# Development (with hot reload)
bun run dev

# Production
bun run start

# Build TypeScript
bun run build

# Database commands
bun run db:generate   # Generate Prisma client
bun run db:push       # Push schema to database
bun run db:migrate    # Run migrations
bun run seed          # Seed database
```

## API Endpoints

### POST /api/v1/store
Store content in Notion
```json
{
  "input": "Your content here"
}
```

### POST /api/v1/retrieve
Query and analyze context
```json
{
  "query": "What did I save today?"
}
```

### POST /api/v1/generate-doc
Generate structured document
```json
{
  "topic": "Business Plan",
  "context": "Optional context"
}
```

## Code Patterns

### Controller Pattern
```typescript
import catchAsync from "@/handlers/async.handler.js";

export const store = catchAsync(async (req, res) => {
  const { input } = req.body;
  const result = await someService.process(input);
  res.json({ status: "success", data: result });
});
```

### Error Handling
```typescript
throw APIError.badRequest("Input is required");
throw APIError.unauthorized("Invalid token");
throw APIError.notFound("Resource not found");
```

### Service Layer
```typescript
export class SomeService {
  async process(data: string) {
    // Business logic here
    return result;
  }
}
```

## Testing

Test the API with curl:

```bash
# Health check
curl http://localhost:8000/api/health

# Store content
curl -X POST http://localhost:8000/api/v1/store \
  -H "Content-Type: application/json" \
  -d '{"input":"Test content"}'

# Retrieve context
curl -X POST http://localhost:8000/api/v1/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query":"What did I save?"}'
```
