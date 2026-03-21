# ORIN Frontend README

## Quick Start

```bash
# Install dependencies
bun install

# Create .env.local file
cp .env.local.example .env.local

# Run development server
bun run dev
```

The app will be available at `http://localhost:3000`

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_AUTH_ENABLED=false
```

## Project Structure

```
frontend/
├── app/
│   ├── dashboard/
│   │   └── page.tsx        # Main chat interface
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Redirects to dashboard
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx  # Message display
│   │   ├── InputBox.tsx    # Message input
│   │   └── MessageBubble.tsx # Individual message
│   ├── sidebar/
│   │   └── Sidebar.tsx     # Session sidebar
│   ├── ui/                 # shadcn/ui components
│   └── ModeToggle.tsx      # Explore/Build mode toggle
├── lib/
│   ├── api.ts              # API client
│   ├── constants.ts        # Types and constants
│   └── utils.ts            # Utility functions
└── components.json         # shadcn/ui config
```

## Available Scripts

```bash
# Development
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Lint
bun run lint
```

## Features

### Commands

Type these in the chat input:

- `/store <content>` - Save to Notion
- `/analyze <query>` - Query your knowledge base
- `/build <topic>` - Generate documents
- `/continue` - Resume previous work

### Modes

**Explore Mode** (Default)
- Read-only access
- Ask questions about stored content
- No writes to Notion

**Build Mode**
- Active creation mode
- Creates pages in Notion
- Use commands to build structures

## Component Usage

### Adding New Components

Use shadcn/ui CLI:

```bash
bunx shadcn@latest add [component-name]
```

Example:
```bash
bunx shadcn@latest add dialog dropdown-menu
```

### Icons

Icons are from lucide-react:

```tsx
import { Brain, Send } from "lucide-react";

<Brain className="h-5 w-5" />
```

## State Management

Currently uses:
- React useState/useEffect for local state
- LocalStorage for session persistence
- Props for component communication

Future improvements could include:
- Zustand or Jotai for global state
- React Query for server state
- TanStack Router for routing

## Styling

Uses Tailwind CSS v4:

```tsx
<div className="flex items-center gap-2 bg-muted p-4 rounded-md">
  Content
</div>
```

### Dark Mode

Automatically supports dark mode via CSS variables.

## API Integration

API calls are in `lib/api.ts`:

```typescript
import { storeContent, retrieveContext } from "@/lib/api";

const result = await storeContent("My idea");
```

## Best Practices

Following Vercel React best practices:

1. **Server Components by Default**: All components are client components for now
2. **Optimistic Updates**: UI updates immediately, syncs later
3. **Error Boundaries**: Add error boundaries for production
4. **Loading States**: Show loading during async operations
5. **Accessibility**: Use semantic HTML and ARIA labels

## Testing

```bash
# Run tests (when added)
bun run test
```

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

Environment variables needed in Vercel:
- `NEXT_PUBLIC_API_URL`: Your production API URL

## Future Enhancements

- [ ] Authentication UI (Auth0/NextAuth)
- [ ] Real-time updates
- [ ] File upload support
- [ ] Markdown rendering
- [ ] Code syntax highlighting
- [ ] Export functionality
- [ ] Settings page
- [ ] Onboarding flow
