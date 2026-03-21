# ORIN - Context Operating System

ORIN is an AI-powered system that transforms Notion into a structured, actionable memory layer and enables users to interact with it through a command-driven interface.

## 🚀 Features

- **Super Memory**: Store any input into structured Notion pages
- **Context Retrieval**: Answer queries using stored memory and connected sources
- **Document Generation**: Convert chat or knowledge into structured Notion docs
- **Resume Work**: Restore prior work state and continue seamlessly
- **Command-Driven Interface**: Powerful commands like `/store`, `/analyze`, `/build`, `/continue`
- **Dual Mode**: Explore (read-only) and Build (write-enabled) modes

## 📁 Project Structure

```
orin/
├── backend/          # Express.js + TypeScript API
│   ├── src/
│   │   ├── config/   # Configuration (database, env, logger)
│   │   ├── controllers/  # Business logic
│   │   ├── handlers/     # Async wrappers and error handlers
│   │   ├── middlewares/  # Cross-cutting concerns
│   │   ├── routes/       # Route definitions
│   │   ├── services/     # External service integrations
│   │   └── utils/        # Utilities and helpers
│   └── prisma/       # Database schema
├── frontend/         # Next.js + TypeScript UI
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   └── lib/          # Utilities and API client
└── docs/            # Documentation
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with Bun
- **Framework**: Express.js 5.x
- **Language**: TypeScript (strict mode, ES2022 target)
- **Database**: PostgreSQL via Prisma ORM 6.x
- **AI Layer**: Google Gemini API
- **Memory**: Notion API
- **Logging**: Winston
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix primitives)
- **Icons**: lucide-react

## 📦 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- Node.js 20+
- Notion account with API access
- Google Gemini API key
- PostgreSQL database (NeonDB recommended)

### 1. Clone and Setup

```bash
cd ORIN
```

### 2. Backend Setup

```bash
cd backend
bun install
bunx prisma generate
```

Create `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=8000
DATABASE_URL="postgresql://user:password@host:5432/orin"

# Authentication (optional for now)
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# AI Services
GEMINI_API_KEY=your-gemini-api-key

# Notion Integration
NOTION_API_KEY=your-notion-api-key
NOTION_DATABASE_ID=your-notion-database-id

# Security
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# CORS
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup

```bash
cd ../frontend
bun install
```

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_AUTH_ENABLED=false
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
bun run dev
```

Backend will run on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
bun run dev
```

Frontend will run on `http://localhost:3000`

## 🎯 Usage

### Commands

Once the application is running, use these commands in the chat interface:

- **`/store <content>`** - Save structured memory to Notion
- **`/analyze <query>`** - Retrieve and analyze context from Notion
- **`/build <topic>`** - Generate structured documents
- **`/continue`** - Resume previous work

### Modes

- **Explore Mode** (Default): Read-only intelligence, answers questions using context
- **Build Mode**: Active system operator, creates pages and structures in Notion

## 📚 Notion Setup

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Copy your API key
3. Create a database in Notion with these properties:
   - Title (Title)
   - Type (Select)
   - Tags (Multi-select)
   - Content (Rich text)
   - Source (URL)
4. Share the database with your integration
5. Copy the database ID from the URL

## 🔧 Development

### Backend Scripts

```bash
# Development mode
bun run dev

# Production build
bun run build

# Database migrations
bun run db:migrate

# Seed database
bun run seed
```

### Frontend Scripts

```bash
# Development mode
bun run dev

# Build for production
bun run build

# Start production server
bun run start
```

## 🏗️ Architecture

### Backend Patterns

- **Layered Architecture**: Routes → Controllers → Services → Database
- **Async Wrapper Pattern**: All controllers wrapped in `catchAsync`
- **Custom Error Handling**: `APIError` class for standardized errors
- **Environment Validation**: Zod schema validation at startup
- **Module Aliases**: Use `@/` for src imports

### Frontend Patterns

- **Component-Driven**: Modular, reusable components
- **Client-Side State**: LocalStorage for session persistence
- **Command Parsing**: Client-side command detection
- **Optimistic UI**: Instant feedback with async operations

## 📖 API Endpoints

### Health Check
```
GET /api/health
```

### Store Content
```
POST /api/v1/store
Body: { "input": "content to store" }
```

### Retrieve Context
```
POST /api/v1/retrieve
Body: { "query": "what did I save today?" }
```

### Generate Document
```
POST /api/v1/generate-doc
Body: { "topic": "business plan", "context": "optional context" }
```

## 🚧 Roadmap

- [ ] Auth0/Google OAuth integration
- [ ] Real-time collaboration
- [ ] Advanced document generation with Notion blocks
- [ ] Email and Slack integration mocks
- [ ] Session management with database persistence
- [ ] Enhanced prompt engineering
- [ ] Multi-database support in Notion

## 📝 License

ISC

## 🙏 Acknowledgments

Built following the backend design patterns from the Waitflow project and Vercel React best practices.

---

**ORIN** - Turn Notion into your second brain 🧠
