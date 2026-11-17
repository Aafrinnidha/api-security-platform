/**
 * Intelligent API Security Platform - Deterministic Finite Automaton (DFA) Engine
 * Validates sequential API interaction workflows per client session.
 */

const ClientSession = require('../models/ClientSession');

// Formal DFA Definition: M = (Q, Σ, δ, q0, F)
const DFA_STATES = {
  q0: { id: 'q0', name: 'Initial State', description: 'Client unauthenticated / starting session', isInitial: true, isAccepting: false, isInvalid: false },
  q1: { id: 'q1', name: 'Login Successful', description: 'User authenticated via login endpoint', isInitial: false, isAccepting: false, isInvalid: false },
  q2: { id: 'q2', name: 'Profile Accessed', description: 'User fetched account profile identity', isInitial: false, isAccepting: false, isInvalid: false },
  q3: { id: 'q3', name: 'Data Accessed', description: 'User retrieved enterprise dataset', isInitial: false, isAccepting: false, isInvalid: false },
  q4: { id: 'q4', name: 'Data Updated', description: 'User modified dataset records (optional)', isInitial: false, isAccepting: false, isInvalid: false },
  q5: { id: 'q5', name: 'Logout Completed', description: 'Session cleanly terminated (Accepting state)', isInitial: false, isAccepting: true, isInvalid: false },
  qE: { id: 'qE', name: 'Invalid State', description: 'Sequence anomaly / unexpected transition violation', isInitial: false, isAccepting: false, isInvalid: true },
};

// Recognized Alphabet (Σ): Canonical HTTP Interaction Symbols
const DFA_ALPHABET = [
  'POST /api/login',
  'GET /api/profile',
  'GET /api/data',
  'PUT /api/data',
  'POST /api/logout',
];

// Transition Function δ: State × Alphabet → State
const TRANSITION_TABLE = [
  { fromState: 'q0', inputSymbol: 'POST /api/login', toState: 'q1', description: 'Client initiates authentication', type: 'VALID' },
  { fromState: 'q1', inputSymbol: 'GET /api/profile', toState: 'q2', description: 'Client verifies profile after login', type: 'VALID' },
  { fromState: 'q2', inputSymbol: 'GET /api/data', toState: 'q3', description: 'Client accesses authorized data', type: 'VALID' },
  { fromState: 'q3', inputSymbol: 'PUT /api/data', toState: 'q4', description: 'Client updates data record (optional)', type: 'VALID' },
  { fromState: 'q3', inputSymbol: 'POST /api/logout', toState: 'q5', description: 'Client logs out directly after data read', type: 'VALID' },
  { fromState: 'q4', inputSymbol: 'POST /api/logout', toState: 'q5', description: 'Client logs out after data update', type: 'VALID' },
  // Optional re-login capability from accepting state
  { fromState: 'q5', inputSymbol: 'POST /api/login', toState: 'q1', description: 'Client begins new authenticated session', type: 'VALID' },
];

/**
 * Normalize method + endpoint into a canonical DFA input symbol
 */
function normalizeInputSymbol(method, endpoint) {
  if (!method || !endpoint) return 'UNKNOWN';

  const cleanMethod = method.trim().toUpperCase();
  let cleanEndpoint = endpoint.trim().split('?')[0].toLowerCase();

  // Strip query string and remove trailing slashes
  cleanEndpoint = cleanEndpoint.replace(/\/+$/, '');

  // Extract canonical target action regardless of route prefixes (/api/demo/login, /api/requests/demo/login, /login, etc.)
  if (cleanEndpoint.endsWith('/login') || cleanEndpoint.includes('/login')) {
    cleanEndpoint = '/api/login';
  } else if (cleanEndpoint.endsWith('/profile') || cleanEndpoint.includes('/profile')) {
    cleanEndpoint = '/api/profile';
  } else if (cleanEndpoint.endsWith('/data') || cleanEndpoint.includes('/data')) {
    cleanEndpoint = '/api/data';
  } else if (cleanEndpoint.endsWith('/logout') || cleanEndpoint.includes('/logout')) {
    cleanEndpoint = '/api/logout';
  } else if (!cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = '/api/' + cleanEndpoint.replace(/^\/+/, '');
  }

  return `${cleanMethod} ${cleanEndpoint}`;
}

/**
 * In-memory state cache for rapid access, backed by MongoDB persistence
 */
const clientStateCache = new Map();

/**
 * Retrieve current DFA state for a given client ID
 */
async function getClientState(clientId) {
  if (!clientId) return 'q0';

  // Check cache first
  if (clientStateCache.has(clientId)) {
    return clientStateCache.get(clientId);
  }

  try {
    const session = await ClientSession.findOne({ clientId });
    if (session) {
      clientStateCache.set(clientId, session.currentDFAState);
      return session.currentDFAState;
    }

    // Initialize new session in DB
    const newSession = await ClientSession.create({
      clientId,
      currentDFAState: 'q0',
      sequenceHistory: [],
      sessionStatus: 'ACTIVE',
    });
    clientStateCache.set(clientId, 'q0');
    return 'q0';
  } catch (err) {
    console.error(`[DFA Engine] Error retrieving state for ${clientId}:`, err.message);
    return 'q0';
  }
}

/**
 * Transition the DFA for a specific client given an input symbol
 */
async function evaluateTransition(clientId, method, endpoint, requestId) {
  const currentDFAState = await getClientState(clientId);
  const inputSymbol = normalizeInputSymbol(method, endpoint);

  // Look up transition in the transition table
  const matchedRule = TRANSITION_TABLE.find(
    (t) => t.fromState === currentDFAState && t.inputSymbol === inputSymbol
  );

  let nextState = 'qE';
  let isValid = false;
  let explanation = '';
  let reason = '';

  if (matchedRule) {
    nextState = matchedRule.toState;
    isValid = true;
    explanation = `Valid transition: Client transitioned from ${currentDFAState} (${DFA_STATES[currentDFAState].name}) to ${nextState} (${DFA_STATES[nextState].name}) via [${inputSymbol}].`;
    reason = matchedRule.description;
  } else {
    nextState = 'qE';
    isValid = false;
    explanation = `Invalid sequence anomaly: Received [${inputSymbol}] while client is in state ${currentDFAState} (${DFA_STATES[currentDFAState].name}). Expected next action according to protocol was not met. Transitioned to invalid sink state qE.`;
    
    // Provide diagnostic hint of what was expected
    const expected = TRANSITION_TABLE.filter((t) => t.fromState === currentDFAState).map((t) => t.inputSymbol);
    if (expected.length > 0) {
      reason = `Protocol violation: Current state ${currentDFAState} only permits [${expected.join(' OR ')}], but client attempted [${inputSymbol}].`;
    } else if (currentDFAState === 'qE') {
      reason = 'Client is currently locked in Invalid State qE. Please reset client session to restart sequence.';
    } else if (currentDFAState === 'q5') {
      reason = 'Session already completed (Logout q5). Must re-authenticate with POST /api/login to start a new sequence.';
    } else {
      reason = 'Unexpected interaction sequence.';
    }
  }

  // Update in-memory cache
  clientStateCache.set(clientId, nextState);

  // Update persistent MongoDB session
  try {
    const sessionStatus = nextState === 'q5' ? 'COMPLETED' : nextState === 'qE' ? 'INVALID' : 'ACTIVE';
    
    await ClientSession.findOneAndUpdate(
      { clientId },
      {
        $set: {
          currentDFAState: nextState,
          sessionStatus,
        },
        $push: {
          sequenceHistory: {
            requestId: requestId || `REQ-${Date.now()}`,
            method,
            endpoint,
            fromState: currentDFAState,
            toState: nextState,
            inputSymbol,
            status: isValid ? 'VALID' : 'INVALID',
            timestamp: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error(`[DFA Engine] Failed to persist transition for ${clientId}:`, err.message);
  }

  return {
    clientId,
    previousState: currentDFAState,
    currentState: currentDFAState,
    inputSymbol,
    nextState,
    dfaStatus: isValid ? 'VALID' : 'INVALID',
    isValid,
    explanation,
    reason,
    isAccepting: DFA_STATES[nextState]?.isAccepting || false,
    isInvalid: DFA_STATES[nextState]?.isInvalid || false,
  };
}

/**
 * Reset client session back to initial state q0
 */
async function resetClientState(clientId) {
  clientStateCache.set(clientId, 'q0');

  try {
    const session = await ClientSession.findOneAndUpdate(
      { clientId },
      {
        $set: {
          currentDFAState: 'q0',
          sessionStatus: 'ACTIVE',
        },
        $push: {
          sequenceHistory: {
            requestId: `RESET-${Date.now()}`,
            method: 'SYSTEM',
            endpoint: '/api/automata/reset',
            fromState: 'ANY',
            toState: 'q0',
            inputSymbol: 'MANUAL_RESET',
            status: 'VALID',
            timestamp: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );
    return {
      success: true,
      clientId,
      currentState: 'q0',
      message: `Client ${clientId} session successfully reset to initial state q0.`,
      session,
    };
  } catch (err) {
    console.error(`[DFA Engine] Reset failed for ${clientId}:`, err.message);
    throw err;
  }
}

/**
 * Retrieve all states and full transition table for visual rendering
 */
function getAutomataDefinition() {
  return {
    states: Object.values(DFA_STATES),
    alphabet: DFA_ALPHABET,
    transitions: TRANSITION_TABLE,
    initialState: 'q0',
    acceptingStates: ['q5'],
    errorState: 'qE',
  };
}

module.exports = {
  DFA_STATES,
  DFA_ALPHABET,
  TRANSITION_TABLE,
  normalizeInputSymbol,
  getClientState,
  evaluateTransition,
  resetClientState,
  getAutomataDefinition,
};
