const express = require('express');
const router = express.Router();
const {
  getStats,
  getActivity,
  getStatusDistribution,
  getClientActivity,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getStats);
router.get('/activity', protect, getActivity);
router.get('/status-distribution', protect, getStatusDistribution);
router.get('/client-activity', protect, getClientActivity);

module.exports = router;
