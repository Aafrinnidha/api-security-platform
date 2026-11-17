const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getAlertById,
  reviewAlert,
} = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);
router.get('/:id', protect, getAlertById);
router.patch('/:id/review', protect, reviewAlert);

module.exports = router;
