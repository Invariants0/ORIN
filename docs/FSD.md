# ORIN — Functional & System Design Document (FSD)

---

# 1. Introduction

## 1.1 Product Overview
ORIN (Context Operating System) is an AI-powered system that transforms Notion into a structured, actionable memory layer and enables users to interact with it through a command-driven interface.

It centralizes scattered work and enables intelligent execution using stored context.

---

## 1.2 Objectives
- Centralize knowledge into Notion
- Enable AI-driven workflows
- Replace fragmented tools with a unified interface
- Provide command-based execution instead of passive chat

---

# 2. Tech Stack

## Frontend
- Next.js (App Router)
- Tailwind CSS
- shadcn/ui

## Backend
- Node.js
- Express.js

## AI Layer
- Google Gemini API

## Database
- NeonDB (PostgreSQL)

## Authentication
- Auth0 (Google OAuth)

## Memory Layer
- Notion API (Core system brain)

## Deployment
- Frontend: Vercel
- Backend: Render / Railway

---

# 3. High-Level Architecture

```
Frontend (Next.js)
        ↓
Auth Layer (Auth0)
        ↓
Backend (Node.js + Express)
        ↓
---------------------------------
| Command + Pipeline Engine     |
---------------------------------
        ↓
---------------------------------
| Gemini API (AI Processing)    |
| Notion API (Memory Layer)     |
| Neon DB (Metadata Storage)    |
---------------------------------
```

---

# 4. System Design

## 4.1 Core Concept
ORIN is built as a **pipeline-driven system**, not a chatbot.

Each user command triggers a deterministic execution pipeline.

---

## 4.2 Command System

| Command | Function |
|--------|--------|
| /store | Save structured memory |
| /analyze | Retrieve and analyze context |
| /build | Generate structured documents |
| /continue | Resume previous work |

---

## 4.3 Pipeline Architecture

### Store Pipeline
1. Parse input
2. Classify via AI
3. Structure data
4. Save to Notion

### Retrieve Pipeline
1. Query Notion
2. Fetch relevant data
3. Generate contextual answer

### Generate Pipeline
1. Generate structured content
2. Convert to Notion blocks
3. Store document

### Continue Pipeline
1. Fetch session
2. Analyze progress
3. Suggest next steps

---

# 5. Detailed Project Structure

## Root Structure

```
orin/
├── frontend/
├── backend/
├── shared/
├── docs/
└── README.md
```

---

## Frontend Structure (Next.js)

```
frontend/
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── InputBox.tsx
│   │   ├── MessageBubble.tsx
│   │
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── SessionList.tsx
│
├── lib/
│   ├── api.ts
│   ├── commands.ts
│
├── hooks/
│   ├── useChat.ts
│
├── utils/
└── styles/
```

---

## Backend Structure (Node.js)

```
backend/
├── src/
│   ├── routes/
│   │   ├── chat.routes.js
│   │   ├── store.routes.js
│   │   ├── retrieve.routes.js
│   │   ├── generate.routes.js
│   │   ├── session.routes.js
│
│   ├── controllers/
│   │   ├── chat.controller.js
│   │   ├── store.controller.js
│   │   ├── retrieve.controller.js
│   │   ├── generate.controller.js
│
│   ├── services/
│   │   ├── notion.service.js
│   │   ├── gemini.service.js
│   │   ├── pipeline.service.js
│
│   ├── pipelines/
│   │   ├── store.pipeline.js
│   │   ├── retrieve.pipeline.js
│   │   ├── generate.pipeline.js
│   │   ├── continue.pipeline.js
│
│   ├── middleware/
│   │   ├── auth.middleware.js
│
│   ├── config/
│   │   ├── db.js
│   │   ├── auth.js
│
│   └── server.js
```

---

# 6. Data Design

## NeonDB Tables

### Users
- id
- email
- auth0_id
- notion_token
- gemini_key
- created_at

### Sessions
- id
- user_id
- title
- messages (JSON)
- created_at

---

## Notion Databases

### Inbox
- Title
- Type
- Tags
- Content
- Source
- Created At

### Documents
- Title
- Content
- Related Items

---

# 7. API Design

| Endpoint | Method | Description |
|--------|--------|------------|
| /store | POST | Save input |
| /retrieve | POST | Fetch context |
| /generate-doc | POST | Create doc |
| /sessions | GET | Get sessions |

---

# 8. Request Flow

```
User Input
   ↓
Command Detection
   ↓
Pipeline Selection
   ↓
AI Processing
   ↓
Notion Interaction
   ↓
Response
```

---

# 9. Non-Functional Requirements

- Fast response time (2–5 seconds)
- Scalable modular architecture
- Secure authentication
- Clean UI/UX

---

# 10. Gemini Prompt Layer (Core Intelligence)

## 10.1 Overview
The Gemini Prompt Layer is responsible for converting raw user input into structured, deterministic outputs. All AI interactions must follow strict prompt engineering patterns to ensure reliability.

---

## 10.2 Prompt Design Principles
- Always use system + user prompt separation
- Enforce structured JSON outputs
- Avoid open-ended responses
- Include context explicitly

---

## 10.3 Core Prompt Types

### 1. Classification Prompt
Purpose: Convert raw input into structured memory

Structure:
- Identify type (idea, task, note, research, code)
- Generate title
- Extract tags
- Summarize content

Output Format (JSON):
```
{
  "title": "",
  "type": "",
  "tags": [],
  "summary": "",
  "content": ""
}
```

---

### 2. Retrieval + Answer Prompt
Purpose: Answer queries using stored context

Input:
- User query
- Retrieved Notion data

Output:
- Summary
- Bullet insights
- References

---

### 3. Document Generation Prompt
Purpose: Generate structured documents

Output Structure:
- Title
- Sections
- Headings
- Bullet points
- Optional tables

Format:
- Markdown-like structure for easy parsing

---

### 4. Continue Work Prompt
Purpose: Resume previous work

Input:
- Last session
- Related Notion data

Output:
- Summary of work
- Current status
- Next steps

---

# 11. Notion Block Mapping Logic (Visual Output Engine)

## 11.1 Overview
This layer converts AI-generated structured content into Notion-compatible block objects.

---

## 11.2 Mapping Strategy

| AI Output | Notion Block |
|----------|-------------|
| Title | heading_1 |
| Section | heading_2 |
| Subsection | heading_3 |
| Paragraph | paragraph |
| Bullet List | bulleted_list_item |
| Numbered List | numbered_list_item |
| Table | table (or fallback text) |

---

## 11.3 Transformation Flow

1. AI generates markdown-like structure
2. Parse content line-by-line
3. Identify block type
4. Convert into Notion block JSON
5. Send to Notion API

---

## 11.4 Example

Input (AI Output):
```
# Business Plan
## Market Analysis
- Target users
- Competitors
```

Converted Blocks:
- heading_1: Business Plan
- heading_2: Market Analysis
- bulleted_list_item: Target users
- bulleted_list_item: Competitors

---

## 11.5 Key Implementation Rules
- Maintain hierarchy (H1 > H2 > H3)
- Chunk content into blocks
- Limit block size per request
- Preserve formatting consistency

---

# 12. Demo Enhancement Impact

## With Prompt Layer + Block Mapping:

- AI outputs become structured and reliable
- Notion pages look professional and readable
- Demo becomes visually impressive

---

# 13. Conclusion

ORIN evolves from a simple AI interface into a structured execution system by combining:
- Deterministic prompt engineering
- Structured pipelines
- Visual block rendering in Notion

This creates a system that is not only intelligent but also actionable and visually compelling.

