/**
 * Intelligent API Security Platform - Security Alert Generation Service
 */

const SecurityAlert = require('../models/SecurityAlert');

/**
 * Determine severity based on alert type and context
 */
function calculateSeverity(alertType, details = {}) {
  switch (alertType) {
    case 'Invalid Request Sequence':
      // Sequence skipping (e.g. attempting to jump straight to data or update without login)
      return details.fromState === 'q0' ? 'HIGH' : 'MEDIUM';
    case 'Unauthorized API Interaction':
      return 'CRITICAL';
    case 'Malformed API Request':
      return details.hasInjection ? 'CRITICAL' : 'HIGH';
    case 'Invalid Endpoint Format':
      return details.hasInjection ? 'CRITICAL' : 'MEDIUM';
    case 'Invalid HTTP Method':
      return 'LOW';
    case 'Missing Required Parameters':
      return 'LOW';
    case 'Unexpected Client Activity':
      return 'HIGH';
    default:
      return 'MEDIUM';
  }
}

/**
 * Generate and persist security alert
 */
async function generateAlert({ requestId, clientId, alertType, description, metadata = {}, severityOverride }) {
  try {
    const alertId = `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const severity = severityOverride || calculateSeverity(alertType, metadata);

    const alert = await SecurityAlert.create({
      alertId,
      requestId,
      clientId: clientId || 'ANONYMOUS',
      alertType,
      severity,
      description,
      status: 'OPEN',
      metadata,
      timestamp: new Date(),
    });

    console.log(`[AlertService] Generated Alert [${alertId}] [${severity}] ${alertType}: ${description}`);
    return alert;
  } catch (err) {
    console.error('[AlertService] Failed to persist security alert:', err.message);
    return null;
  }
}

/**
 * Automatically analyze validation results and generate appropriate alerts if needed
 */
async function analyzeAndAlert({ requestId, clientId, regexResult, dfaResult, method, endpoint, headers, body }) {
  const alerts = [];

  // 1. Analyze Regex Failures
  if (regexResult && !regexResult.isValid) {
    for (const error of regexResult.errors) {
      let alertType = 'Malformed API Request';
      let desc = error.message;

      if (error.rule === 'HTTP_METHOD_RULE') {
        alertType = 'Invalid HTTP Method';
      } else if (error.rule === 'ENDPOINT_FORMAT_RULE' || error.rule === 'ENDPOINT_SECURITY_RULE') {
        alertType = 'Invalid Endpoint Format';
      } else if (error.rule.startsWith('BODY_FIELD_') || error.rule.startsWith('NUMERIC_PARAM_')) {
        alertType = 'Missing Required Parameters';
      } else if (error.rule === 'BODY_INJECTION_RULE' || error.rule === 'PARAM_SECURITY_RULE') {
        alertType = 'Malformed API Request';
        desc = `Potential injection payload detected: ${error.message}`;
      }

      const alert = await generateAlert({
        requestId,
        clientId,
        alertType,
        description: desc,
        metadata: {
          rule: error.rule,
          reason: error.reason,
          method,
          endpoint,
          hasInjection: error.rule.includes('INJECTION') || error.rule.includes('SECURITY'),
        },
      });

      if (alert) alerts.push(alert);
    }
  }

  // 2. Analyze DFA Sequence Failures
  if (dfaResult && !dfaResult.isValid) {
    const desc = `Sequence violation detected for client "${clientId}". Transition [${dfaResult.inputSymbol}] was rejected in state ${dfaResult.previousState}. Client forced to invalid state qE.`;
    const alert = await generateAlert({
      requestId,
      clientId,
      alertType: 'Invalid Request Sequence',
      description: desc,
      metadata: {
        fromState: dfaResult.previousState,
        inputSymbol: dfaResult.inputSymbol,
        nextState: dfaResult.nextState,
        reason: dfaResult.reason,
      },
      severityOverride: dfaResult.previousState === 'q0' ? 'HIGH' : 'MEDIUM',
    });

    if (alert) alerts.push(alert);
  }

  return alerts;
}

module.exports = {
  generateAlert,
  analyzeAndAlert,
  calculateSeverity,
};
