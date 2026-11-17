const RequestLog = require('../models/RequestLog');
const SecurityAlert = require('../models/SecurityAlert');
const ClientSession = require('../models/ClientSession');

/**
 * @desc    Get High-level Dashboard Metrics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getStats = async (req, res, next) => {
  try {
    const totalRequests = await RequestLog.countDocuments();
    const validRequests = await RequestLog.countDocuments({ overallStatus: 'VALID' });
    const invalidRequests = await RequestLog.countDocuments({ overallStatus: 'INVALID' });
    const suspiciousRequests = await RequestLog.countDocuments({ overallStatus: 'SUSPICIOUS' });
    const totalAlerts = await SecurityAlert.countDocuments();
    const openAlerts = await SecurityAlert.countDocuments({ status: 'OPEN' });

    const successfulResponses = await RequestLog.countDocuments({
      httpStatus: { $gte: 200, $lt: 300 },
    });
    const failedResponses = await RequestLog.countDocuments({
      httpStatus: { $gte: 400 },
    });

    const uniqueClientsList = await RequestLog.distinct('clientId');
    const totalClients = uniqueClientsList.length;

    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        validRequests,
        invalidRequests,
        suspiciousRequests,
        totalAlerts,
        openAlerts,
        successfulResponses,
        failedResponses,
        totalClients,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Request Activity Timeline Data for Line Chart
 * @route   GET /api/dashboard/activity
 * @access  Private
 */
const getActivity = async (req, res, next) => {
  try {
    // Aggregate requests by hour or recent 15 intervals
    const logs = await RequestLog.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .select('timestamp overallStatus httpStatus');

    // Group into time buckets
    const bucketMap = new Map();

    logs.reverse().forEach((log) => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (!bucketMap.has(timeStr)) {
        bucketMap.set(timeStr, { time: timeStr, valid: 0, invalid: 0, total: 0 });
      }

      const item = bucketMap.get(timeStr);
      item.total += 1;
      if (log.overallStatus === 'VALID') {
        item.valid += 1;
      } else {
        item.invalid += 1;
      }
    });

    const activityData = Array.from(bucketMap.values());

    res.status(200).json({
      success: true,
      data: activityData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Status Distribution for Pie/Bar Charts
 * @route   GET /api/dashboard/status-distribution
 * @access  Private
 */
const getStatusDistribution = async (req, res, next) => {
  try {
    // 1. Valid vs Invalid Breakdown
    const validCount = await RequestLog.countDocuments({ overallStatus: 'VALID' });
    const invalidCount = await RequestLog.countDocuments({ overallStatus: 'INVALID' });
    const suspiciousCount = await RequestLog.countDocuments({ overallStatus: 'SUSPICIOUS' });

    const validationDistribution = [
      { name: 'Valid Requests', value: validCount, color: '#10B981' },
      { name: 'Invalid Requests', value: invalidCount, color: '#EF4444' },
      ...(suspiciousCount > 0 ? [{ name: 'Suspicious', value: suspiciousCount, color: '#F59E0B' }] : []),
    ];

    // 2. HTTP Status Code Breakdown
    const httpStatusAggregation = await RequestLog.aggregate([
      { $group: { _id: '$httpStatus', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const httpStatusDistribution = httpStatusAggregation.map((item) => {
      const code = item._id || 200;
      let color = '#3B82F6';
      if (code >= 200 && code < 300) color = '#10B981';
      else if (code === 400) color = '#F59E0B';
      else if (code === 401 || code === 403) color = '#EF4444';
      else if (code === 422) color = '#EC4899';
      else if (code >= 500) color = '#DC2626';

      return {
        statusCode: `HTTP ${code}`,
        code,
        count: item.count,
        color,
      };
    });

    res.status(200).json({
      success: true,
      validationDistribution,
      httpStatusDistribution,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Client Activity Summary
 * @route   GET /api/dashboard/client-activity
 * @access  Private
 */
const getClientActivity = async (req, res, next) => {
  try {
    // Summarize per-client stats
    const aggregation = await RequestLog.aggregate([
      {
        $group: {
          _id: '$clientId',
          totalRequests: { $sum: 1 },
          validRequests: { $sum: { $cond: [{ $eq: ['$overallStatus', 'VALID'] }, 1, 0] } },
          invalidRequests: { $sum: { $cond: [{ $eq: ['$overallStatus', 'INVALID'] }, 1, 0] } },
          lastActive: { $max: '$timestamp' },
        },
      },
      { $sort: { totalRequests: -1 } },
      { $limit: 10 },
    ]);

    // Enrich with current DFA state
    const clients = await Promise.all(
      aggregation.map(async (c) => {
        const session = await ClientSession.findOne({ clientId: c._id });
        return {
          clientId: c._id,
          totalRequests: c.totalRequests,
          validRequests: c.validRequests,
          invalidRequests: c.invalidRequests,
          lastActive: c.lastActive,
          currentState: session?.currentDFAState || 'q0',
          sessionStatus: session?.sessionStatus || 'ACTIVE',
        };
      })
    );

    res.status(200).json({
      success: true,
      data: clients,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getActivity,
  getStatusDistribution,
  getClientActivity,
};
