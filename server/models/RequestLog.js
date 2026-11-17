const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  clientId: {
    type: String,
    required: true,
    index: true,
  },
  method: {
    type: String,
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  regexStatus: {
    type: String,
    enum: ['VALID', 'INVALID'],
    required: true,
  },
  regexErrors: {
    type: Array,
    default: [],
  },
  previousState: {
    type: String,
    default: 'q0',
  },
  currentState: {
    type: String,
    default: 'q0',
  },
  nextState: {
    type: String,
    default: 'q0',
  },
  dfaStatus: {
    type: String,
    enum: ['VALID', 'INVALID'],
    required: true,
  },
  httpStatus: {
    type: Number,
    required: true,
    index: true,
  },
  responseTime: {
    type: Number,
    default: 0,
  },
  overallStatus: {
    type: String,
    enum: ['VALID', 'INVALID', 'SUSPICIOUS'],
    required: true,
    index: true,
  },
  headers: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  params: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  body: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  validationExplanation: {
    type: String,
    default: '',
  },
  alertGenerated: {
    type: Boolean,
    default: false,
  },
  alertId: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model('RequestLog', requestLogSchema);
