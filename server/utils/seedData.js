const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RequestLog = require('../models/RequestLog');
const SecurityAlert = require('../models/SecurityAlert');
const ClientSession = require('../models/ClientSession');
const { validateApiRequest } = require('../services/regexValidator');
const { evaluateTransition, resetClientState } = require('../services/dfaEngine');
const { analyzeAndAlert } = require('../services/alertService');

const seedAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@apisecurity.io' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@123456', salt);

      const admin = await User.create({
        name: 'SecOps Administrator',
        email: 'admin@apisecurity.io',
        passwordHash,
        role: 'admin',
      });
      console.log(`[Seed] Seeded default administrator user: ${admin.email} / Admin@123456`);
    } else {
      console.log('[Seed] Default administrator user already exists.');
    }
  } catch (err) {
    console.error('[Seed] Error seeding administrator user:', err.message);
  }
};

/**
 * Generate controlled sample traffic to demonstrate dashboard, charts, alerts, and DFA tracking
 */
const seedSampleTraffic = async () => {
  try {
    const count = await RequestLog.countDocuments();
    if (count > 10) {
      console.log(`[Seed] Database already has ${count} request logs. Skipping initial traffic generation.`);
      return;
    }

    console.log('[Seed] Generating initial demonstration traffic dataset...');

    // Reset demonstration clients
    await resetClientState('client-alpha');
    await resetClientState('client-beta');
    await resetClientState('client-gamma');
    await resetClientState('client-delta');

    const sampleInteractions = [
      // 1. client-alpha: Full valid sequence (q0 -> q1 -> q2 -> q3 -> q4 -> q5)
      {
        clientId: 'client-alpha',
        method: 'POST',
        endpoint: '/api/login',
        body: { email: 'alpha.dev@enterprise.io', password: 'SecretPassword123' },
        headers: { 'content-type': 'application/json' },
      },
      {
        clientId: 'client-alpha',
        method: 'GET',
        endpoint: '/api/profile',
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsIn...' },
      },
      {
        clientId: 'client-alpha',
        method: 'GET',
        endpoint: '/api/data',
        params: { page: 1, limit: 25 },
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsIn...' },
      },
      {
        clientId: 'client-alpha',
        method: 'PUT',
        endpoint: '/api/data',
        body: { data: { quota: 5000, tier: 'enterprise' } },
        headers: { 'content-type': 'application/json' },
      },
      {
        clientId: 'client-alpha',
        method: 'POST',
        endpoint: '/api/logout',
        body: { clientId: 'client-alpha' },
        headers: { 'content-type': 'application/json' },
      },

      // 2. client-beta: Invalid sequence (skips Profile, attempts direct data access from q1)
      {
        clientId: 'client-beta',
        method: 'POST',
        endpoint: '/api/login',
        body: { email: 'beta.tester@testlab.org', password: 'Testing12345!' },
        headers: { 'content-type': 'application/json' },
      },
      {
        clientId: 'client-beta',
        method: 'GET',
        endpoint: '/api/data', // SKIPPED /api/profile! Should trigger sequence violation and alert
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsIn...' },
      },

      // 3. client-gamma: Malformed requests (Regex violations)
      {
        clientId: 'client-gamma',
        method: 'FETCH_ALL', // Invalid HTTP method
        endpoint: '/api/login',
        body: { email: 'gamma@badactor.net', password: '123' },
        headers: { 'content-type': 'application/json' },
      },
      {
        clientId: 'client-gamma',
        method: 'POST',
        endpoint: '/api/login/../../../etc/shadow', // Path traversal injection
        body: { email: 'gamma@badactor.net', password: 'Password123' },
        headers: { 'content-type': 'application/json' },
      },
      {
        clientId: 'client-gamma',
        method: 'POST',
        endpoint: '/api/login',
        body: { email: 'not-an-email', password: 'short' }, // Malformed email & short password
        headers: { 'content-type': 'application/json' },
      },

      // 4. client-delta: Valid partial sequence (currently at q2)
      {
        clientId: 'client-delta',
        method: 'POST',
        endpoint: '/api/login',
        body: { email: 'delta.engineer@cloud.internal', password: 'EnginePass987!' },
        headers: { 'content-type': 'application/json' },
      },
      {
        clientId: 'client-delta',
        method: 'GET',
        endpoint: '/api/profile',
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsIn...' },
      },
    ];

    for (let i = 0; i < sampleInteractions.length; i++) {
      const item = sampleInteractions[i];
      const requestId = `REQ-SEED-${1000 + i}`;
      const startTime = Date.now();

      const regexResult = validateApiRequest({
        method: item.method,
        endpoint: item.endpoint,
        clientId: item.clientId,
        headers: item.headers,
        params: item.params,
        body: item.body,
      });

      const dfaResult = await evaluateTransition(item.clientId, item.method, item.endpoint, requestId);

      let overallStatus = 'VALID';
      let httpStatus = 200;

      if (!regexResult.isValid && !dfaResult.isValid) {
        overallStatus = 'INVALID';
        httpStatus = 400;
      } else if (!regexResult.isValid) {
        overallStatus = 'INVALID';
        httpStatus = 422;
      } else if (!dfaResult.isValid) {
        overallStatus = 'INVALID';
        httpStatus = 403;
      }

      let generatedAlerts = [];
      if (overallStatus !== 'VALID') {
        generatedAlerts = await analyzeAndAlert({
          requestId,
          clientId: item.clientId,
          regexResult,
          dfaResult,
          method: item.method,
          endpoint: item.endpoint,
          headers: item.headers,
          body: item.body,
        });
      }

      const responseTime = Math.floor(15 + Math.random() * 45);
      const alertId = generatedAlerts.length > 0 ? generatedAlerts[0].alertId : null;

      await RequestLog.create({
        requestId,
        clientId: item.clientId,
        method: item.method.toUpperCase(),
        endpoint: item.endpoint,
        timestamp: new Date(Date.now() - (sampleInteractions.length - i) * 60000),
        regexStatus: regexResult.regexStatus,
        regexErrors: regexResult.errors,
        previousState: dfaResult.previousState,
        currentState: dfaResult.currentState,
        nextState: dfaResult.nextState,
        dfaStatus: dfaResult.dfaStatus,
        httpStatus,
        responseTime,
        overallStatus,
        headers: item.headers,
        params: item.params || {},
        body: item.body || {},
        validationExplanation: `${regexResult.explanation} | ${dfaResult.explanation}`,
        alertGenerated: generatedAlerts.length > 0,
        alertId,
      });
    }

    console.log(`[Seed] Seeded ${sampleInteractions.length} demonstration requests with realistic metrics and alerts.`);
  } catch (err) {
    console.error('[Seed] Traffic seeding error:', err.message);
  }
};

module.exports = {
  seedAdminUser,
  seedSampleTraffic,
};
