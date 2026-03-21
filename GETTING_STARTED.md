# ORIN - Getting Started Guide

This guide will walk you through setting up and running ORIN on your local machine.

## Prerequisites

Before you begin, make sure you have:

1. **Bun** installed (v1.0+)
   - Windows: `winget install Oven.Bun`
   - Mac/Linux: `curl -fsSL https://bun.sh/install | bash`
   
2. **Notion Account** with API access
3. **Google Gemini API Key**
4. **PostgreSQL Database** (NeonDB recommended)

## Step-by-Step Setup

### 1. Get Your API Keys

#### Notion Integration
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "ORIN" and select your workspace
4. Copy the **Internal Integration Token** (this is your `NOTION_API_KEY`)
5. Create a database in Notion with these properties:
   - Title (Title type)
   - Type (Select type)
   - Tags (Multi-select type)
   - Content (Rich text type)
   - Source (URL type)
6. Share the database with your integration
7. Copy the database ID from the URL (this is your `NOTION_DATABASE_ID`)

#### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (this is your `GEMINI_API_KEY`)

#### PostgreSQL Database (NeonDB)
1. Go to [neon.tech](https://neon.tech)
2. Sign up for free
3. Create a new project
4. Copy the connection string (this is your `DATABASE_URL`)

### 2. Clone or Navigate to Project

If you haven't already:
```bash
cd e:\Codebase\Hackathon\ORIN
```

### 3. Run the Setup Script

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

### 4. Configure Environment Variables

Edit `backend/.env` and add your keys:

```env
NODE_ENV=development
PORT=8000

# Your NeonDB connection string
DATABASE_URL="postgresql://user:password@host.region.aws.neon.tech/orin?sslmode=require"

# Your Google Gemini API key
GEMINI_API_KEY=your-actual-gemini-api-key-here

# Your Notion integration details
NOTION_API_KEY=secret_your-notion-api-key-here
NOTION_DATABASE_ID=your-database-id-from-notion-url

# Generate random secrets (use: openssl rand -hex 32)
SESSION_SECRET=generate-a-random-secret-here
JWT_SECRET=generate-another-random-secret-here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Tips for generating secrets:**
- Use `openssl rand -hex 32` 
- Or use any random string generator
- Make them at least 32 characters long

### 5. Start the Backend

Open a new terminal:

```bash
cd backend
bun run dev
```

You should see:
```
🚀 ORIN Server running on port 8000
📍 Environment: development
🌐 Health check: http://localhost:8000/api/health
```

### 6. Start the Frontend

Open another terminal:

```bash
cd frontend
bun run dev
```

You should see:
```
✓ Ready in 2s
○ Local: http://localhost:3000
```

### 7. Open the Application

Navigate to **http://localhost:3000** in your browser.

You'll be automatically redirected to the dashboard.

## Testing the Application

### Test 1: Store Content

In the chat input, type:
```
/store I'm building an AI-powered productivity tool that helps teams organize their research notes and automatically generate structured documents.
```

Expected response:
```
✅ Content stored successfully!

Title: AI-powered productivity tool
Type: idea
Tags: ai, productivity, research
```

### Test 2: Retrieve Context

Type:
```
What did I just save?
```

Expected response:
```
You saved an idea about an AI-powered productivity tool...

Insights:
- Teams can organize research notes
- Automatic document generation
- Productivity focused
```

### Test 3: Try Different Commands

```
/analyze What are the main themes in my saved content?
```

```
/build Create a product requirements document for the AI productivity tool
```

```
/continue Help me continue working on this
```

## Troubleshooting

### Backend won't start

**Error: Missing environment variables**
- Check that all required variables are in `backend/.env`
- Make sure there are no quotes around values unless they contain spaces
- Verify DATABASE_URL format is correct

**Error: Cannot connect to database**
- Check your NeonDB connection string
- Ensure SSL mode is enabled (`?sslmode=require`)
- Verify your database is accessible

**Error: Invalid Notion API key**
- Double-check your Notion integration token
- Make sure the database is shared with your integration
- Verify the database ID is correct

### Frontend won't start

**Error: Module not found**
- Run `bun install` in the frontend directory
- Clear `.next` folder: `rm -rf .next`

**API calls failing**
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Ensure backend is running on port 8000
- Check CORS settings in backend

### Chat not working

**No response from AI**
- Verify GEMINI_API_KEY is correct
- Check backend logs for errors
- Test API directly: `curl http://localhost:8000/api/health`

**Content not appearing in Notion**
- Verify NOTION_DATABASE_ID matches your database
- Check that integration has access to the database
- Look at backend logs for Notion API errors

## Next Steps

Once everything is working:

1. **Customize the UI**: Edit `frontend/app/dashboard/page.tsx`
2. **Add more commands**: Extend the command parser in the dashboard
3. **Enhance prompts**: Improve Gemini prompts in `gemini.service.ts`
4. **Add authentication**: Implement Auth0 or NextAuth
5. **Deploy**: Push to Vercel (frontend) and Render/Railway (backend)

## Additional Resources

- [Backend Design Patterns](../backend-design-patterns/README.md)
- [Vercel React Best Practices](../vercel-react-best-practices/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Notion API Reference](https://developers.notion.com/reference)
- [Google Gemini API](https://ai.google.dev/docs)

## Getting Help

If you run into issues:

1. Check the backend logs in the terminal
2. Check browser console for frontend errors
3. Review the error messages carefully
4. Verify all environment variables are correct

---

**Happy coding with ORIN!** 🚀
