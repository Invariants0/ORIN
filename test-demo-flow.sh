#!/bin/bash

# Orin Production Demo Test Script
# Tests the complete demo flow with real APIs

BASE_URL="http://localhost:8000"
SESSION_ID=""

echo "🚀 Starting Orin Production Demo Test"
echo "======================================"
echo ""

# Test 1: Store Data
echo "📝 Step 1: Store Data"
echo "Input: 'Store this: Revolutionary AI-powered context management system'"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/message" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Store this: Revolutionary AI-powered context management system that turns Notion into an intelligent memory layer. It uses Gemini AI for understanding and Notion as the persistent storage backend."
  }')

echo "Response:"
echo "$RESPONSE" | jq '.'
SESSION_ID=$(echo "$RESPONSE" | jq -r '.data.sessionId')
echo ""
echo "Session ID: $SESSION_ID"
echo ""
sleep 2

# Test 2: Query Context
echo "🔍 Step 2: Query Context"
echo "Input: 'What did I receive today?'"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/message" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"What did I receive today?\",
    \"sessionId\": \"$SESSION_ID\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""
sleep 2

# Test 3: Generate Business Plan
echo "📄 Step 3: Generate Business Plan"
echo "Input: 'Turn this into a business plan'"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/message" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Turn this into a business plan\",
    \"sessionId\": \"$SESSION_ID\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""
sleep 2

# Test 4: Analyze Everything
echo "🧠 Step 4: Intelligence Analysis"
echo "Input: 'Analyze everything and create a comprehensive doc'"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/message" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Analyze everything and create a comprehensive doc\",
    \"sessionId\": \"$SESSION_ID\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""
sleep 2

# Test 5: Continue Work
echo "🔄 Step 5: Continue Work"
echo "Input: 'Continue my work'"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/message" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Continue my work\",
    \"sessionId\": \"$SESSION_ID\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

echo "======================================"
echo "✅ Demo Test Complete!"
echo "Session ID: $SESSION_ID"
