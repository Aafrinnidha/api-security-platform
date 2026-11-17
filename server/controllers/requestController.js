const { v4: uuidv4 } = require('uuid');
const RequestLog = require('../models/RequestLog');
const { validateApiRequest } = require('../services/regexValidator');
const { evaluateTransition } = require('../services/dfaEngine');
const { analyzeAndAlert } = require('../services/alertService');
const { sanitizeHeaders, sanitizeBody } = require('../middleware/requestMonitor');

/**
 * @desc    Validate API Request (Direct validation engine runner)
 * @route   POST /api/requests/validate
 * @access  Public / Protected
 */
const validateRequest = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const {
      clientId = 'client-01',
      method = 'GET',
      endpoint = '/api/profile',
      headers = {},
      params = {},
      body = null,
    } = req.body;

    const requestId = `REQ-${uuidv4().substring(0, 8).toUpperCase()}`;

    // 1. Run Regex Validation Engine
    const regexResult = validateApiRequest({
      method,
      endpoint,
      clientId,
      headers,
      params,
      body,
    });

    // 2. Run DFA Sequence Validation Engine
    const dfaResult = await evaluateTransition(clientId, method, endpoint, requestId);

    // 3. Determine Overall Validation Status and HTTP response code
    let overallStatus = 'VALID';
    let httpStatus = 200;

    if (!regexResult.isValid && !dfaResult.isValid) {
      overallStatus = 'INVALID';
      httpStatus = 400; // Malformed and sequence violation
    } else if (!regexResult.isValid) {
      overallStatus = 'INVALID';
      httpStatus = 422; // Malformed / Unprocessable Entity
    } else if (!dfaResult.isValid) {
      overallStatus = 'INVALID';
      httpStatus = 403; // Forbidden sequence violation
    }

    // 4. Generate Security Alert if Invalid
    let generatedAlerts = [];
    if (overallStatus !== 'VALID') {
      generatedAlerts = await analyzeAndAlert({
        requestId,
        clientId,
        regexResult,
        dfaResult,
        method,
        endpoint,
        headers: sanitizeHeaders(headers),
        body: sanitizeBody(body),
      });
    }

    const responseTime = Date.now() - startTime;
    const alertId = generatedAlerts.length > 0 ? generatedAlerts[0].alertId : null;

    // Build synthesized explanation
    let validationExplanation = '';
    if (overallStatus === 'VALID') {
      validationExplanation = `Request successfully verified. ${regexResult.explanation} DFA transition confirmed: state moved to ${dfaResult.nextState}.`;
    } else {
      const parts = [];
      if (!regexResult.isValid) parts.push(`Regex Validation Failed: ${regexResult.errors.map((e) => e.message).join('; ')}`);
      if (!dfaResult.isValid) parts.push(`Sequence Violation: ${dfaResult.explanation}`);
      validationExplanation = parts.join(' | ');
    }

    // 5. Store in RequestLogs
    const logEntry = await RequestLog.create({
      requestId,
      clientId,
      method: (method || 'GET').toUpperCase(),
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
      headers: sanitizeHeaders(headers),
      params,
      body: sanitizeBody(body),
      validationExplanation,
      alertGenerated: generatedAlerts.length > 0,
      alertId,
    });

    res.status(200).json({
      success: true,
      requestId,
      clientId,
      method: (method || 'GET').toUpperCase(),
      endpoint,
      regexResult,
      dfaResult,
      overallStatus,
      httpStatus,
      responseTime,
      validationExplanation,
      securityAlert: generatedAlerts[0] || null,
      colorCode: overallStatus === 'VALID' ? 'green' : 'red',
      log: logEntry,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get API Request Logs (with search, filter, pagination)
 * @route   GET /api/requests
 * @access  Private
 */
const getRequests = async (req, res, next) => {
  try {
    const {
      clientId,
      method,
      overallStatus,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (clientId) {
      query.clientId = new RegExp(clientId.trim(), 'i');
    }

    if (method) {
      query.method = method.trim().toUpperCase();
    }

    if (overallStatus) {
      query.overallStatus = overallStatus.trim().toUpperCase();
    }

    if (search) {
      query.$or = [
        { clientId: new RegExp(search.trim(), 'i') },
        { requestId: new RegExp(search.trim(), 'i') },
        { endpoint: new RegExp(search.trim(), 'i') },
      ];
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await RequestLog.countDocuments(query);
    const requests = await RequestLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: requests,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Single Request Log by ID
 * @route   GET /api/requests/:id
 * @access  Private
 */
const getRequestById = async (req, res, next) => {
  try {
    const request = await RequestLog.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { requestId: req.params.id }],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request log entry not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
};

// Demo Simulated Endpoints (executed after passing monitorApiRequest middleware)
const handleDemoLogin = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Demo login successful! Client session authenticated.',
    token: 'simulated_demo_jwt_token_' + Date.now(),
    user: { id: 'usr-100', email: req.body?.email || 'demo@client.io', role: 'client_user' },
    nextPermittedAction: 'GET /api/profile',
  });
};

const handleDemoProfile = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile data retrieved successfully.',
    profile: {
      clientId: req.validationData?.clientId || 'client-default',
      name: 'Simulated User Profile',
      securityClearance: 'Level-2 Authenticated',
      joinedAt: '2026-01-15',
    },
    nextPermittedAction: 'GET /api/data',
  });
};

const handleDemoData = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Enterprise business dataset accessed successfully.',
    data: [
      { id: 101, metric: 'Transactions', count: 4820, status: 'STABLE' },
      { id: 102, metric: 'Latency', count: 24, unit: 'ms', status: 'OPTIMAL' },
      { id: 103, metric: 'Bandwidth', count: 1250, unit: 'Mbps', status: 'NOMINAL' },
    ],
    nextPermittedActions: ['PUT /api/data (Optional Update)', 'POST /api/logout'],
  });
};

const handleDemoUpdateData = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Enterprise dataset modified successfully.',
    updatedRecord: req.body?.data || req.body?.payload || { updated: true, timestamp: new Date() },
    nextPermittedAction: 'POST /api/logout',
  });
};

const handleDemoLogout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Session cleanly terminated. DFA reached accepting state q5.',
    nextPermittedAction: 'POST /api/login (Start New Sequence)',
  });
};

module.exports = {
  validateRequest,
  getRequests,
  getRequestById,
  handleDemoLogin,
  handleDemoProfile,
  handleDemoData,
  handleDemoUpdateData,
  handleDemoLogout,
};
