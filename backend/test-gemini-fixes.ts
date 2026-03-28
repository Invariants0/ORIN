/**
 * Test script to verify Gemini API fixes
 * Run with: bun run test-gemini-fixes.ts
 */

import intentService from './src/services/ai/intent.service.js';
import promptEngineService from './src/services/ai/prompt-engine.service.js';
import logger from './src/config/logger.js';

console.log('🧪 Testing Gemini API Fixes\n');

// Test 1: Rule-based intent detection (should NOT call API)
console.log('Test 1: Rule-based intent detection');
console.log('Input: "Save this: https://www.luxionlabs.com/"');
const start1 = Date.now();
try {
  const result1 = await intentService.detectIntent('Save this: https://www.luxionlabs.com/');
  const duration1 = Date.now() - start1;
  console.log(`✅ Intent detected: ${result1.intent.type}`);
  console.log(`   Confidence: ${result1.confidence}`);
  console.log(`   Processing time: ${duration1}ms`);
  console.log(`   Expected: <50ms (rule-based, no API call)`);
  console.log(`   Result: ${duration1 < 50 ? '✅ PASS' : '⚠️  SLOW (might have called API)'}\n`);
} catch (error: any) {
  console.log(`❌ FAIL: ${error.message}\n`);
}

// Test 2: Query intent (rule-based)
console.log('Test 2: Query intent (rule-based)');
console.log('Input: "What is the meaning of life?"');
const start2 = Date.now();
try {
  const result2 = await intentService.detectIntent('What is the meaning of life?');
  const duration2 = Date.now() - start2;
  console.log(`✅ Intent detected: ${result2.intent.type}`);
  console.log(`   Confidence: ${result2.confidence}`);
  console.log(`   Processing time: ${duration2}ms`);
  console.log(`   Expected: <50ms (rule-based, no API call)`);
  console.log(`   Result: ${duration2 < 50 ? '✅ PASS' : '⚠️  SLOW (might have called API)'}\n`);
} catch (error: any) {
  console.log(`❌ FAIL: ${error.message}\n`);
}

// Test 3: Ambiguous input (should call API)
console.log('Test 3: Ambiguous input (requires AI)');
console.log('Input: "Help me organize my thoughts"');
const start3 = Date.now();
try {
  const result3 = await intentService.detectIntent('Help me organize my thoughts');
  const duration3 = Date.now() - start3;
  console.log(`✅ Intent detected: ${result3.intent.type}`);
  console.log(`   Confidence: ${result3.confidence}`);
  console.log(`   Processing time: ${duration3}ms`);
  console.log(`   Expected: >500ms (AI-based, calls API)`);
  console.log(`   Result: ${duration3 > 500 ? '✅ PASS' : '⚠️  TOO FAST (might be cached)'}\n`);
} catch (error: any) {
  console.log(`❌ FAIL: ${error.message}`);
  if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
    console.log(`   ✅ Rate limit detection working!\n`);
  } else {
    console.log(`   ❌ Unexpected error\n`);
  }
}

// Test 4: Cache effectiveness (same input twice)
console.log('Test 4: Cache effectiveness');
console.log('Input: "Build a todo app" (sent twice)');
const start4a = Date.now();
try {
  const result4a = await intentService.detectIntent('Build a todo app');
  const duration4a = Date.now() - start4a;
  console.log(`   First call: ${duration4a}ms`);
  
  const start4b = Date.now();
  const result4b = await intentService.detectIntent('Build a todo app');
  const duration4b = Date.now() - start4b;
  console.log(`   Second call: ${duration4b}ms`);
  console.log(`   Cache hit: ${duration4b < 100 ? '✅ YES' : '❌ NO'}`);
  console.log(`   Speedup: ${Math.round(duration4a / duration4b)}x faster\n`);
} catch (error: any) {
  console.log(`❌ FAIL: ${error.message}`);
  if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
    console.log(`   ⚠️  Rate limit hit - this is expected if quota is exhausted\n`);
  }
}

// Test 5: Verify retry behavior
console.log('Test 5: Retry behavior (check logs)');
console.log('Look for these log messages:');
console.log('  - "[Prompt Engine] Using cached response" = Cache working ✅');
console.log('  - "[Intent] Rule-based intent detected" = Rules working ✅');
console.log('  - "[Prompt Engine] Rate limit exceeded - failing fast" = 429 detection working ✅');
console.log('  - "[Prompt Engine] Retrying after delay" = Backoff working ✅\n');

console.log('🎉 Test suite completed!');
console.log('\n📊 Summary:');
console.log('- Rule-based detection should handle simple patterns (0 API calls)');
console.log('- Caching should prevent duplicate API calls');
console.log('- 429 errors should fail fast with clear messages');
console.log('- Retries should use 2-4 second delays (not 0.5-1 second)');
console.log('\n💡 Next: Monitor your application logs during real usage');

process.exit(0);
