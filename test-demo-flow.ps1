# Orin Production Demo Test Script
# Tests the complete demo flow with real APIs

$BaseUrl = "http://localhost:8000/api/v1"
$SessionId = ""

Write-Host "🚀 Starting Orin Production Demo Test" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Test 1: Store Data
Write-Host "📝 Step 1: Store Data" -ForegroundColor Cyan
Write-Host "Input: 'Store this: Revolutionary AI-powered context management system'"

$body1 = @{
    message = "Store this: Revolutionary AI-powered context management system that turns Notion into an intelligent memory layer. It uses Gemini AI for understanding and Notion as the persistent storage backend."
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$BaseUrl/message" -Method Post -Body $body1 -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Yellow
    $response1 | ConvertTo-Json -Depth 10
    $SessionId = $response1.data.sessionId
    Write-Host ""
    Write-Host "Session ID: $SessionId" -ForegroundColor Green
    Write-Host ""
    Start-Sleep -Seconds 2
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 2: Query Context
Write-Host "🔍 Step 2: Query Context" -ForegroundColor Cyan
Write-Host "Input: 'What did I receive today?'"

$body2 = @{
    message = "What did I receive today?"
    sessionId = $SessionId
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$BaseUrl/message" -Method Post -Body $body2 -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Yellow
    $response2 | ConvertTo-Json -Depth 10
    Write-Host ""
    Start-Sleep -Seconds 2
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 3: Generate Business Plan
Write-Host "📄 Step 3: Generate Business Plan" -ForegroundColor Cyan
Write-Host "Input: 'Turn this into a business plan'"

$body3 = @{
    message = "Turn this into a business plan"
    sessionId = $SessionId
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$BaseUrl/message" -Method Post -Body $body3 -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Yellow
    $response3 | ConvertTo-Json -Depth 10
    Write-Host ""
    Start-Sleep -Seconds 2
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 4: Analyze Everything
Write-Host "🧠 Step 4: Intelligence Analysis" -ForegroundColor Cyan
Write-Host "Input: 'Analyze everything and create a comprehensive doc'"

$body4 = @{
    message = "Analyze everything and create a comprehensive doc"
    sessionId = $SessionId
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "$BaseUrl/message" -Method Post -Body $body4 -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Yellow
    $response4 | ConvertTo-Json -Depth 10
    Write-Host ""
    Start-Sleep -Seconds 2
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 5: Continue Work
Write-Host "🔄 Step 5: Continue Work" -ForegroundColor Cyan
Write-Host "Input: 'Continue my work'"

$body5 = @{
    message = "Continue my work"
    sessionId = $SessionId
} | ConvertTo-Json

try {
    $response5 = Invoke-RestMethod -Uri "$BaseUrl/message" -Method Post -Body $body5 -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Yellow
    $response5 | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "✅ Demo Test Complete!" -ForegroundColor Green
Write-Host "Session ID: $SessionId" -ForegroundColor Green
