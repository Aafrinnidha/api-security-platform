const mongoose = require('mongoose');

const securityAlertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  requestId: {
    type: String,
    required: true,
    index: true,
  },
  clientId: {
    type: String,
    required: true,
    index: true,
  },
  alertType: {
    type: String,
    required: true,
    enum: [
      'Malformed API Request',
      'Invalid HTTP Method',
      'Invalid Endpoint Format',
      'Missing Required Parameters',
      'Invalid Request Sequence',
      'Unauthorized API Interaction',
      'Unexpected Client Activity',
    ],
  },
  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  status: {
    type: String,
    enum: ['OPEN', 'REVIEWED', 'RESOLVED'],
    default: 'OPEN',
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);
