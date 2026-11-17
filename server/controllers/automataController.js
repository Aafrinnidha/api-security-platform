const {
  DFA_STATES,
  DFA_ALPHABET,
  TRANSITION_TABLE,
  getClientState,
  resetClientState,
  getAutomataDefinition,
} = require('../services/dfaEngine');
const ClientSession = require('../models/ClientSession');

/**
 * @desc    Get All DFA States Definition
 * @route   GET /api/automata/states
 * @access  Public / Protected
 */
const getStates = (req, res) => {
  res.status(200).json({
    success: true,
    data: Object.values(DFA_STATES),
  });
};

/**
 * @desc    Get DFA Transition Rules Table
 * @route   GET /api/automata/transitions
 * @access  Public / Protected
 */
const getTransitions = (req, res) => {
  const definition = getAutomataDefinition();
  res.status(200).json({
    success: true,
    data: {
      alphabet: definition.alphabet,
      transitions: definition.transitions,
      initialState: definition.initialState,
      acceptingStates: definition.acceptingStates,
      errorState: definition.errorState,
    },
  });
};

/**
 * @desc    Get Specific Client DFA State and Sequence History
 * @route   GET /api/automata/client/:clientId
 * @access  Public / Protected
 */
const getClientDFAState = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const currentState = await getClientState(clientId);
    const session = await ClientSession.findOne({ clientId });

    // Permitted next transitions from current state
    const permittedNextTransitions = TRANSITION_TABLE.filter(
      (t) => t.fromState === currentState
    );

    res.status(200).json({
      success: true,
      data: {
        clientId,
        currentState,
        stateInfo: DFA_STATES[currentState],
        sessionStatus: session?.sessionStatus || 'ACTIVE',
        permittedNextTransitions,
        history: session?.sequenceHistory || [],
        isAccepting: DFA_STATES[currentState]?.isAccepting || false,
        isInvalid: DFA_STATES[currentState]?.isInvalid || false,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get All Active Clients and Their Current DFA States
 * @route   GET /api/automata/clients
 * @access  Public / Protected
 */
const getAllClients = async (req, res, next) => {
  try {
    const sessions = await ClientSession.find().sort({ updatedAt: -1 });

    const formatted = sessions.map((s) => ({
      clientId: s.clientId,
      currentState: s.currentDFAState,
      stateInfo: DFA_STATES[s.currentDFAState],
      sessionStatus: s.sessionStatus,
      totalTransitions: s.sequenceHistory.length,
      lastUpdated: s.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reset Client Session back to q0 (Initial State)
 * @route   POST /api/automata/reset/:clientId
 * @access  Public / Protected
 */
const resetClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const result = await resetClientState(clientId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStates,
  getTransitions,
  getClientDFAState,
  getAllClients,
  resetClient,
};
