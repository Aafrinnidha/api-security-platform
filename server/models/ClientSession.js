const mongoose = require('mongoose');

const sequenceTransitionSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true },
    method: { type: String, required: true },
    endpoint: { type: String, required: true },
    fromState: { type: String, required: true },
    toState: { type: String, required: true },
    inputSymbol: { type: String, required: true },
    status: { type: String, enum: ['VALID', 'INVALID'], required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const clientSessionSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    currentDFAState: {
      type: String,
      required: true,
      default: 'q0',
      enum: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'qE'],
    },
    sequenceHistory: [sequenceTransitionSchema],
    sessionStatus: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'INVALID', 'BLOCKED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientSession', clientSessionSchema);
