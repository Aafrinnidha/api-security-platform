/**
 * Automated Verification Test Suite
 * Tests all required scenarios:
 * 1. Valid Sequence (q0 -> q1 -> q2 -> q3 -> q4 -> q5)
 * 2. Invalid Sequence (Skip profile -> qE + Alert)
 * 3. Malformed Requests (Method, endpoint, email, body schema regex failures)
 * 4. Client Isolation (Multi-client separate state machines)
 */

const { connectDB, disconnectDB } = require('./config/db');
const { validateApiRequest } = require('./services/regexValidator');
const { evaluateTransition, resetClientState, getClientState } = require('./services/dfaEngine');
const RequestLog = require('./models/RequestLog');
const SecurityAlert = require('./models/SecurityAlert');

async function runTestSuite() {
  console.log('========================================================');
  console.log('🛡️  RUNNING API SECURITY & DFA VERIFICATION TEST SUITE');
  console.log('========================================================\n');

  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST SUITE 1: VALID SEQUENCE
    // ---------------------------------------------------------
    console.log('TEST 1: Valid Sequential Workflow (q0 -> q5)');
    const client1 = 'test-valid-client';
    await resetClientState(client1);

    // Step 1: Login
    const r1 = await evaluateTransition(client1, 'POST', '/api/login', 'REQ-T1-1');
    assert(r1.isValid && r1.nextState === 'q1', 'Step 1: POST /api/login moves q0 -> q1');

    // Step 2: Profile
    const r2 = await evaluateTransition(client1, 'GET', '/api/profile', 'REQ-T1-2');
    assert(r2.isValid && r2.nextState === 'q2', 'Step 2: GET /api/profile moves q1 -> q2');

    // Step 3: Data Access
    const r3 = await evaluateTransition(client1, 'GET', '/api/data', 'REQ-T1-3');
    assert(r3.isValid && r3.nextState === 'q3', 'Step 3: GET /api/data moves q2 -> q3');

    // Step 4: Data Update
    const r4 = await evaluateTransition(client1, 'PUT', '/api/data', 'REQ-T1-4');
    assert(r4.isValid && r4.nextState === 'q4', 'Step 4: PUT /api/data moves q3 -> q4');

    // Step 5: Logout (Accepting State)
    const r5 = await evaluateTransition(client1, 'POST', '/api/logout', 'REQ-T1-5');
    assert(r5.isValid && r5.nextState === 'q5' && r5.isAccepting, 'Step 5: POST /api/logout reaches accepting state q5');

    console.log('');

    // ---------------------------------------------------------
    // TEST SUITE 2: INVALID SEQUENCE (SKIPPING PROFILE)
    // ---------------------------------------------------------
    console.log('TEST 2: Invalid Sequence Anomaly (Skip Profile)');
    const client2 = 'test-invalid-seq-client';
    await resetClientState(client2);

    // Step 1: Login
    const inv1 = await evaluateTransition(client2, 'POST', '/api/login', 'REQ-T2-1');
    assert(inv1.isValid && inv1.nextState === 'q1', 'Client logs in successfully (q0 -> q1)');

    // Step 2: Try to access /api/data directly (Skipping /api/profile)
    const inv2 = await evaluateTransition(client2, 'GET', '/api/data', 'REQ-T2-2');
    assert(!inv2.isValid && inv2.nextState === 'qE' && inv2.isInvalid, 'Skipping profile correctly rejected into sink state qE');

    console.log('');

    // ---------------------------------------------------------
    // TEST SUITE 3: MALFORMED REQUESTS (REGEX ENGINE)
    // ---------------------------------------------------------
    console.log('TEST 3: Malformed Request Validation');

    // 3a. Invalid HTTP Method
    const m1 = validateApiRequest({
      method: 'FOO_BAR',
      endpoint: '/api/login',
      clientId: 'client-regex',
    });
    assert(!m1.isValid && m1.errors.some((e) => e.rule === 'HTTP_METHOD_RULE'), 'Detects invalid HTTP method "FOO_BAR"');

    // 3b. Invalid Endpoint Path Traversal
    const m2 = validateApiRequest({
      method: 'GET',
      endpoint: '/api/login/../../../etc/passwd',
      clientId: 'client-regex',
    });
    assert(!m2.isValid && m2.errors.some((e) => e.rule.includes('ENDPOINT')), 'Detects path traversal injection in endpoint');

    // 3c. Missing required email in login body
    const m3 = validateApiRequest({
      method: 'POST',
      endpoint: '/api/login',
      clientId: 'client-regex',
      body: { password: 'Password123' }, // missing email
    });
    assert(!m3.isValid && m3.errors.some((e) => e.rule.includes('EMAIL')), 'Detects missing required email in login body');

    // 3d. Malformed Client ID
    const m4 = validateApiRequest({
      method: 'POST',
      endpoint: '/api/login',
      clientId: '$$$$--INVALID--##',
    });
    assert(!m4.isValid && m4.errors.some((e) => e.rule === 'CLIENT_ID_RULE'), 'Detects malformed Client ID characters');

    console.log('');

    // ---------------------------------------------------------
    // TEST SUITE 4: CLIENT ISOLATION
    // ---------------------------------------------------------
    console.log('TEST 4: Client Isolation (Independent DFA State Tracking)');
    const clientA = 'isolated-client-A';
    const clientB = 'isolated-client-B';

    await resetClientState(clientA);
    await resetClientState(clientB);

    // Client A advances to q1 then q2
    await evaluateTransition(clientA, 'POST', '/api/login', 'REQ-A-1');
    await evaluateTransition(clientA, 'GET', '/api/profile', 'REQ-A-2');
    const stateA = await getClientState(clientA);

    // Client B has not taken actions
    const stateB = await getClientState(clientB);

    assert(stateA === 'q2', `Client A is at state q2 (actual: ${stateA})`);
    assert(stateB === 'q0', `Client B remains isolated at initial state q0 (actual: ${stateB})`);

    // Client B now logs in -> q1
    await evaluateTransition(clientB, 'POST', '/api/login', 'REQ-B-1');
    const stateB2 = await getClientState(clientB);
    const stateA2 = await getClientState(clientA);

    assert(stateB2 === 'q1', `Client B transitioned to q1 (actual: ${stateB2})`);
    assert(stateA2 === 'q2', `Client A is completely unaffected and remains at q2 (actual: ${stateA2})`);

    console.log('');
    console.log('========================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test Suite encountered an unexpected error:', err);
    process.exit(1);
  }
}

runTestSuite();
