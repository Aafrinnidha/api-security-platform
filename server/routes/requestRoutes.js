const express = require('express');
const router = express.Router();
const {
  validateRequest,
  getRequests,
  getRequestById,
  handleDemoLogin,
  handleDemoProfile,
  handleDemoData,
  handleDemoUpdateData,
  handleDemoLogout,
} = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');
const { monitorApiRequest } = require('../middleware/requestMonitor');

// Interactive Request Testing / Validation Engine
router.post('/validate', validateRequest);

// Request Logs Retrieval
router.get('/', protect, getRequests);
router.get('/:id', protect, getRequestById);

// Live Demonstration Endpoints Monitored by the Security Engine
router.post('/demo/login', monitorApiRequest, handleDemoLogin);
router.get('/demo/profile', monitorApiRequest, handleDemoProfile);
router.get('/demo/data', monitorApiRequest, handleDemoData);
router.put('/demo/data', monitorApiRequest, handleDemoUpdateData);
router.post('/demo/logout', monitorApiRequest, handleDemoLogout);

module.exports = router;
