const SecurityAlert = require('../models/SecurityAlert');
const RequestLog = require('../models/RequestLog');

/**
 * @desc    Get Security Alerts (with filtering & pagination)
 * @route   GET /api/alerts
 * @access  Private
 */
const getAlerts = async (req, res, next) => {
  try {
    const {
      alertType,
      severity,
      status,
      clientId,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (alertType) {
      query.alertType = alertType;
    }

    if (severity) {
      query.severity = severity.toUpperCase();
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (clientId) {
      query.clientId = new RegExp(clientId.trim(), 'i');
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await SecurityAlert.countDocuments(query);
    const alerts = await SecurityAlert.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    const countsBySeverity = await SecurityAlert.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const countsByStatus = await SecurityAlert.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      count: alerts.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      countsBySeverity: countsBySeverity.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      countsByStatus: countsByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Single Security Alert by ID
 * @route   GET /api/alerts/:id
 * @access  Private
 */
const getAlertById = async (req, res, next) => {
  try {
    const alert = await SecurityAlert.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { alertId: req.params.id },
      ],
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Security alert not found.',
      });
    }

    // Attach triggering request log if available
    const associatedRequest = await RequestLog.findOne({ requestId: alert.requestId });

    res.status(200).json({
      success: true,
      data: alert,
      associatedRequest,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Review or Update Status of a Security Alert
 * @route   PATCH /api/alerts/:id/review
 * @access  Private
 */
const reviewAlert = async (req, res, next) => {
  try {
    const { status = 'REVIEWED', notes } = req.body;

    const alert = await SecurityAlert.findOneAndUpdate(
      {
        $or: [
          { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
          { alertId: req.params.id },
        ],
      },
      {
        $set: {
          status: status.toUpperCase(),
          'metadata.reviewedBy': req.user?.email || 'admin@apisecurity.io',
          'metadata.reviewedAt': new Date(),
          ...(notes ? { 'metadata.reviewNotes': notes } : {}),
        },
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Security alert not found to update.',
      });
    }

    res.status(200).json({
      success: true,
      message: `Alert ${alert.alertId} marked as ${alert.status}.`,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAlerts,
  getAlertById,
  reviewAlert,
};
