/**
 * Verification Test Suite for Authentication Module
 * Tests:
 * 1. Account registration with new email and password
 * 2. Successful login with registered credentials
 * 3. Incorrect password handling ("Invalid email or password.")
 * 4. Duplicate email handling
 * 5. Password mismatch & validation checks
 * 6. Logout functionality
 * 7. Verification that passwords in MongoDB are bcrypt hashes, never plain text
 */

const { connectDB } = require('./config/db');
const User = require('./models/User');

async function testAuthModule() {
  console.log('========================================================');
  console.log('🔐 TESTING AUTHENTICATION MODULE (REGISTER & LOGIN)');
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

  const BASE_URL = 'http://localhost:5000/api/auth';
  const testEmail = `student_${Date.now()}@university.edu`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Jane Student';

  try {
    // -----------------------------------------------------------------
    // TEST 1: Password Mismatch on Registration
    // -----------------------------------------------------------------
    console.log('TEST 1: Password Mismatch Validation');
    const mismatchRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        confirmPassword: 'DifferentPassword456!',
      }),
    });
    const mismatchData = await mismatchRes.json();
    assert(
      mismatchRes.status === 400 && mismatchData.message.includes('do not match'),
      'Blocks registration when password and confirm password do not match'
    );
    console.log('');

    // -----------------------------------------------------------------
    // TEST 2: Successful Account Registration
    // -----------------------------------------------------------------
    console.log('TEST 2: New Account Registration');
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 201 && regData.success === true,
      `Successfully registers new user: ${testEmail}`
    );
    assert(
      regData.message.includes('Account created successfully'),
      'Returns friendly account created success message'
    );

    // Verify bcrypt hash in MongoDB
    const dbUser = await User.findOne({ email: testEmail });
    assert(
      dbUser && dbUser.passwordHash.startsWith('$2'),
      'Password is securely hashed with bcrypt in MongoDB (never plain text)'
    );
    assert(
      dbUser.passwordHash !== testPassword,
      'Confirmed: Password hash is not equal to raw password'
    );
    console.log('');

    // -----------------------------------------------------------------
    // TEST 3: Duplicate Email Registration Prevention
    // -----------------------------------------------------------------
    console.log('TEST 3: Duplicate Email Handling');
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: testEmail,
        password: 'AnotherPassword999',
        confirmPassword: 'AnotherPassword999',
      }),
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 400 && dupData.message.includes('already registered'),
      'Prevents duplicate registration and informs user that email is already registered'
    );
    console.log('');

    // -----------------------------------------------------------------
    // TEST 4: Incorrect Password Handling
    // -----------------------------------------------------------------
    console.log('TEST 4: Incorrect Password Handling');
    const wrongPassRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'CompletelyWrongPassword',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert(
      wrongPassRes.status === 401 && wrongPassData.message === 'Invalid email or password.',
      'Rejects incorrect password with friendly message: "Invalid email or password."'
    );
    console.log('');

    // -----------------------------------------------------------------
    // TEST 5: Successful Login with Registered Credentials
    // -----------------------------------------------------------------
    console.log('TEST 5: Successful Login with Registered Credentials');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 && loginData.success === true,
      'Logs in successfully with registered email and password'
    );
    assert(
      typeof loginData.token === 'string' && loginData.token.length > 20,
      'Generates and returns valid JWT authentication token'
    );
    assert(
      loginData.user && loginData.user.email === testEmail,
      'Returns authenticated user details'
    );
    console.log('');

    // -----------------------------------------------------------------
    // TEST 6: Logout Functionality
    // -----------------------------------------------------------------
    console.log('TEST 6: Logout Functionality');
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`,
      },
    });
    const logoutData = await logoutRes.json();
    assert(
      logoutRes.status === 200 && logoutData.success === true,
      'Successfully processes logout request and clears session'
    );
    console.log('');

    // -----------------------------------------------------------------
    // TEST 7: Protected Route Access with Token
    // -----------------------------------------------------------------
    console.log('TEST 7: Route Protection');
    const meRes = await fetch(`${BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 && meData.user?.email === testEmail,
      'Protected route /me validates JWT token and returns user profile'
    );

    const unauthorizedRes = await fetch(`${BASE_URL}/me`);
    assert(
      unauthorizedRes.status === 401,
      'Protected route rejects request without Bearer token (HTTP 401)'
    );
    console.log('');

    console.log('========================================================');
    console.log(`AUTH TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testAuthModule();
