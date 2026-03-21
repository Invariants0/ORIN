#!/bin/bash

echo "🚀 ORIN Setup Script"
echo "===================="
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun found: $(bun --version)"
echo ""

# Backend Setup
echo "📦 Setting up Backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env and add your API keys"
else
    echo "✅ .env already exists"
fi

echo "Installing backend dependencies..."
bun install

echo "Generating Prisma client..."
bunx prisma generate

cd ..

echo ""

# Frontend Setup
echo "📦 Setting up Frontend..."
cd frontend

if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cp .env.local.example .env.local 2>/dev/null || echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
else
    echo "✅ .env.local already exists"
fi

echo "Installing frontend dependencies..."
bun install

cd ..

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Edit backend/.env and add your API keys:"
echo "      - GEMINI_API_KEY"
echo "      - NOTION_API_KEY"
echo "      - NOTION_DATABASE_ID"
echo "      - DATABASE_URL"
echo ""
echo "   2. Start the backend:"
echo "      cd backend"
echo "      bun run dev"
echo ""
echo "   3. Start the frontend (in a new terminal):"
echo "      cd frontend"
echo "      bun run dev"
echo ""
echo "   4. Open http://localhost:3000"
echo ""
echo "🎉 Happy building with ORIN!"
