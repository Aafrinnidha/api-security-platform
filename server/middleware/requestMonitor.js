/**
 * Intelligent API Security Platform - Request Monitoring & Security Middleware
 * Inspects all requests targeting /api/demo/* endpoints or simulated API runs,
 * executes regex & DFA validation, records telemetry in MongoDB, and generates alerts.
 */

const { v4: uuidv4 } = require('uuid');
const RequestLog = require('../models/RequestLog');
const { validateApiRequest } = require('../services/regexValidator');
const { evaluateTransition } = require('../services/dfaEngine');
const { analyzeAndAlert } = require('../services/alertService');

/**
 * Filter and sanitize safe headers (strip passwords, tokens, auth cookies)
 */
function sanitizeHeaders(headers = {}) {
  const safe = {};
  const allowed = [
    'host',
    'user-agent',
    'accept',
    'content-type',
    'content-length',
    'x-client-id',
    'x-forwarded-for',
    'origin',
    'referer',
  ];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (allowed.includes(lowerKey)) {
      safe[key] = value;
    } else if (lowerKey === 'authorization') {
      safe[key] = value.startsWith('Bearer') ? 'Bearer [REDACTED_TOKEN]' : '[REDACTED_SECRET]';
    }
  }
  return safe;
}

/**
 * Sanitize request body to strip credentials or sensitive fields
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const clone = Array.isArray(body) ? [...body] : { ...body };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'creditCard'];

  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      clone[key] = '***REDACTED***';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = sanitizeBody(clone[key]);
    }
  }
  return clone;
}

/**
 * Express Middleware for live demonstration endpoints (/api/demo/*)
 */
const monitorApiRequest = async (req, res, next) => {
  const startTime = Date.now();
  const requestId = `REQ-${uuidv4().substring(0, 8).toUpperCase()}`;
  const clientId = req.headers['x-client-id'] || req.query.clientId || req.body?.clientId || 'client-default';
  const method = req.method;
  const endpoint = req.originalUrl.split('?')[0];

  req.securityContext = {
    requestId,
    clientId,
    startTime,
  };

  // 1. Run Regex Validation
  const regexResult = validateApiRequest({
    method,
    endpoint,
    clientId,
    headers: req.headers,
    params: req.query,
    body: req.body,
  });

  // 2. Run DFA Sequence Validation
  const dfaResult = await evaluateTransition(clientId, method, endpoint, requestId);

  // 3. Determine Overall Validation Status
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

  // 4. Trigger Alerts if Invalid
  let generatedAlerts = [];
  if (overallStatus !== 'VALID') {
    generatedAlerts = await analyzeAndAlert({
      requestId,
      clientId,
      regexResult,
      dfaResult,
      method,
      endpoint,
      headers: sanitizeHeaders(req.headers),
      body: sanitizeBody(req.body),
    });
  }

  const responseTime = Date.now() - startTime;
  const alertId = generatedAlerts.length > 0 ? generatedAlerts[0].alertId : null;

  // 5. Store in RequestLogs
  try {
    await RequestLog.create({
      requestId,
      clientId,
      method,
      endpoint,
      timestamp: new Date(),
      regexStatus: regexResult.regexStatus,
      regexErrors: regexResult.errors,
      previousState: dfaResult.previousState,
      currentState: dfaResult.currentState,
      nextState: dfaResult.nextState,
      dfaStatus: dfaResult.dfaStatus,
      httpStatus,
      responseTime,
      overallStatus,
      headers: sanitizeHeaders(req.headers),
      params: req.query,
      body: sanitizeBody(req.body),
      validationExplanation: `${regexResult.explanation} | ${dfaResult.explanation}`,
      alertGenerated: generatedAlerts.length > 0,
      alertId,
    });
  } catch (err) {
    console.error('[RequestMonitor] Error saving RequestLog:', err.message);
  }

  // If validation failed, reject and send security response
  if (overallStatus !== 'VALID') {
    return res.status(httpStatus).json({
      success: false,
      requestId,
      clientId,
      method,
      endpoint,
      overallStatus,
      httpStatus,
      responseTime,
      regexValidation: regexResult,
      dfaValidation: dfaResult,
      securityAlert: generatedAlerts[0] || null,
      message: 'Request rejected by API Security and Request Validation Engine.',
      reasons: [
        ...regexResult.errors.map((e) => e.message),
        ...(dfaResult.isValid ? [] : [dfaResult.explanation]),
      ],
    });
  }

  // If valid, attach info to req and proceed to handler
  req.validationData = {
    requestId,
    clientId,
    regexResult,
    dfaResult,
    responseTime,
    overallStatus,
  };

  next();
};

module.exports = {
  monitorApiRequest,
  sanitizeHeaders,
  sanitizeBody,
};
