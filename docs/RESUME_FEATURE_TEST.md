# Resume Feature - Testing Guide

## 🧪 How to Test the Resume Work Engine

### Prerequisites
1. Backend server running
2. Database connected
3. Gemini API key configured

---

## Test Flow

### Step 1: Create a Session with Some Work

**Request 1: Save an Idea**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "Remember: I need to build a resume feature that helps users continue their work"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "STORE",
    "output": "Successfully stored: \"Build resume feature\"...",
    "sessionId": "clx123abc",
    "isNewSession": true
  }
}
```

**Save the sessionId for next requests!**

---

### Step 2: Do More Work in the Same Session

**Request 2: Generate a Document**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "Create a technical specification for the resume feature",
  "sessionId": "clx123abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "GENERATE_DOC",
    "output": "Document \"Resume Feature Technical Specification\" has been generated...",
    "sessionId": "clx123abc"
  }
}
```

---

### Step 3: Ask a Query

**Request 3: Query Information**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "What are the best practices for session management?",
  "sessionId": "clx123abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "QUERY",
    "output": "Based on your notes...",
    "sessionId": "clx123abc"
  }
}
```

---

### Step 4: Resume Your Work! 🎯

**Request 4: Resume Work**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "continue my work",
  "sessionId": "clx123abc"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "intent": "RESUME",
    "output": "You were working on building a resume feature for the application. You saved an initial idea, generated a technical specification document, and researched session management best practices.\n\n**Current State:** You have a technical specification document created and have gathered information about session management.\n\n**Next Steps:**\n1. Review the technical specification for completeness\n2. Break down the feature into implementation tasks\n3. Start implementing the resume service\n4. Integrate session management best practices\n5. Test the resume functionality with real user scenarios\n\n**Context:**\n- Topics: resume, feature, session, management, specification\n- Documents created: 1\n- Queries asked: 1\n- Last activity: 2024-03-21T20:43:00.000Z",
    "references": [],
    "actions": [{
      "type": "resume_work",
      "status": "completed",
      "details": {
        "sessionId": "clx123abc",
        "messageCount": 6,
        "lastIntent": "QUERY",
        "topicsDiscussed": ["resume", "feature", "session", "management", "specification"]
      }
    }],
    "metadata": {
      "processingTimeMs": 1234,
      "confidence": 1.0,
      "servicesUsed": ["resume", "session", "gemini"]
    },
    "sessionId": "clx123abc"
  }
}
```

---

## Alternative Resume Phrases

Try any of these:
- "continue"
- "resume"
- "what was I doing?"
- "where was I?"
- "what were we doing?"
- "pick up where we left off"
- "carry on"
- "keep going"
- "what next?"

---

## Test Without Session ID

**Request: Resume Most Recent Session**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "continue my work"
}
```

This will automatically find and resume your most recent session!

---

## Error Cases

### No Session Found
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "resume",
  "sessionId": "invalid-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "RESUME",
    "output": "I couldn't find any recent work to resume. Try starting a new conversation or provide more context.",
    "actions": [{
      "type": "resume_work",
      "status": "failed",
      "details": { "error": "No session found to resume" }
    }]
  }
}
```

---

## Verify in Database

Check the session and messages:

```sql
-- Get session
SELECT * FROM sessions WHERE id = 'clx123abc';

-- Get messages
SELECT id, role, content, intent, created_at 
FROM messages 
WHERE session_id = 'clx123abc' 
ORDER BY created_at ASC;
```

---

## Expected Database State

After the test flow, you should see:

**Session:**
- id: clx123abc
- userId: anonymous
- title: "Remember: I need to build a resume feature..."
- mode: explore
- createdAt: [timestamp]
- updatedAt: [timestamp]

**Messages (8 total):**
1. USER: "Remember: I need to build a resume feature..."
2. ASSISTANT: "Successfully stored..." (intent: STORE)
3. USER: "Create a technical specification..."
4. ASSISTANT: "Document generated..." (intent: GENERATE_DOC)
5. USER: "What are the best practices..."
6. ASSISTANT: "Based on your notes..." (intent: QUERY)
7. USER: "continue my work"
8. ASSISTANT: "You were working on..." (intent: RESUME)

---

## Logs to Watch

Enable debug logging to see the resume engine in action:

```
[Orchestrator] Resume request detected
[Resume] Starting resume work { userId: 'anonymous', sessionId: 'clx123abc' }
[Resume] Session retrieved { sessionId: 'clx123abc', messageCount: 6 }
[Resume] Messages analyzed { topics: 5, intents: 3, documents: 1, queries: 1 }
[Prompt Engine] Starting structured generation
[Prompt Engine] Structured response generated successfully
[Resume] Resume summary generated
[Resume] Resume work completed successfully
```

---

## Performance Benchmarks

Expected timings:
- Session retrieval: ~50ms
- Message analysis: ~10ms
- Gemini summary generation: ~1000-1500ms
- Total processing: ~1200-1600ms

---

## Success Criteria

✅ Resume request is detected automatically
✅ Session data is retrieved from database
✅ Messages are analyzed correctly
✅ Topics and intents are extracted
✅ Summary is generated via Prompt Engine
✅ Next steps are actionable and relevant
✅ Context metadata is accurate
✅ Response is formatted with markdown
✅ No errors in logs
✅ Processing time < 2 seconds

---

## Troubleshooting

### Issue: "No session found"
- Check if sessionId is valid
- Verify session exists in database
- Ensure userId matches

### Issue: "Session has no messages"
- Verify messages were stored
- Check database connection
- Review message creation logs

### Issue: Slow response
- Check Gemini API latency
- Verify database query performance
- Review message count (should analyze last 10)

### Issue: Poor summary quality
- Check if enough messages exist (need at least 2-3)
- Verify message content is meaningful
- Review prompt template in prompt-engine.service.ts

---

## Next Steps After Testing

1. ✅ Verify all test cases pass
2. ✅ Check logs for errors
3. ✅ Review database state
4. ✅ Test with different resume phrases
5. ✅ Test with multiple sessions
6. ✅ Test error cases
7. ✅ Measure performance
8. ✅ Document any issues

---

## Integration with Frontend

The frontend can call the resume feature like any other chat message:

```typescript
// Frontend code
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'continue my work',
    sessionId: currentSessionId
  })
});

const data = await response.json();

if (data.data.intent === 'RESUME') {
  // Display resume summary with special formatting
  displayResumeSummary(data.data.output);
}
```

---

## Summary

The Resume Work Engine is fully implemented and ready for testing. It:

✅ Uses real session data (no mocking)
✅ Integrates with Prompt Engine
✅ Analyzes conversation history
✅ Generates intelligent summaries
✅ Suggests actionable next steps
✅ Handles errors gracefully
✅ Performs efficiently

**Test it now and continue your work seamlessly!** 🚀
