/**
 * Test script for Notion integration fixes
 * Run with: bun run test-notion-integration.ts
 */

import { isNotionPermissionError, getNotionErrorMessage, NotionPermissionError } from './src/utils/notion-errors.js';
import { withRetry, withTimeout } from './src/utils/retry.js';

console.log('🧪 Testing Notion Integration Fixes\n');

// Test 1: Error Detection
console.log('Test 1: Permission Error Detection');
const permissionError = { statusCode: 401, message: 'Unauthorized' };
console.log('  401 error detected:', isNotionPermissionError(permissionError) ? '✅' : '❌');

const permissionError2 = new Error('invalid_token');
console.log('  invalid_token detected:', isNotionPermissionError(permissionError2) ? '✅' : '❌');

const notPermissionError = new Error('Network timeout');
console.log('  Network error not detected as permission:', !isNotionPermissionError(notPermissionError) ? '✅' : '❌');

// Test 2: Error Messages
console.log('\nTest 2: User-Friendly Error Messages');
const permError = new NotionPermissionError('test');
const message = getNotionErrorMessage(permError);
console.log('  Permission error message:', message.includes('share a database') ? '✅' : '❌');

// Test 3: Timeout
console.log('\nTest 3: Timeout Functionality');
try {
  await withTimeout(
    new Promise((resolve) => setTimeout(resolve, 2000)),
    100,
    'Test timeout'
  );
  console.log('  Timeout test: ❌ (should have timed out)');
} catch (error: any) {
  console.log('  Timeout test:', error.message.includes('timeout') ? '✅' : '❌');
}

// Test 4: Retry Logic
console.log('\nTest 4: Retry Logic');
let attempts = 0;
try {
  await withRetry(
    async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Temporary failure');
      }
      return 'success';
    },
    { maxAttempts: 3, timeoutMs: 1000, backoffMs: 100 }
  );
  console.log('  Retry succeeded after', attempts, 'attempts:', attempts === 2 ? '✅' : '❌');
} catch (error) {
  console.log('  Retry test: ❌ (should have succeeded)');
}

// Test 5: Token Format Validation
console.log('\nTest 5: Token Format Validation');
const validTokens = ['secret_abc123', 'ntn_xyz789'];
const invalidToken = 'invalid_format';

validTokens.forEach(token => {
  const isValid = token.startsWith('secret_') || token.startsWith('ntn_');
  console.log(`  ${token.substring(0, 10)}... is valid:`, isValid ? '✅' : '❌');
});

const isInvalid = !invalidToken.startsWith('secret_') && !invalidToken.startsWith('ntn_');
console.log(`  ${invalidToken} is invalid:`, isInvalid ? '✅' : '❌');

console.log('\n✨ All tests completed!\n');
console.log('Next steps:');
console.log('1. Start the backend: bun run dev');
console.log('2. Check health: curl http://localhost:8000/api/integrations/notion/instructions');
console.log('3. Test with real Notion token');
