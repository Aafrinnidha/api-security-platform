import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldAlert, Check, Search, Eye } from 'lucide-react';
import { alertService } from '../services/api';
import RequestDetailModal from '../components/RequestDetailModal';

export default function SecurityAlertsPage() {
  const { refreshTrigger } = useOutletContext() || {};
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchClientId, setSearchClientId] = useState('');
  const [inspectRequest, setInspectRequest] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 25,
        ...(severityFilter ? { severity: severityFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchClientId ? { clientId: searchClientId.trim() } : {}),
      };

      const res = await alertService.getAll(params);
      setAlerts(res.data.data);
    } catch (err) {
      console.error('Failed to load security alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter, refreshTrigger]);

  const handleReview = async (alertId) => {
    try {
      await alertService.review(alertId, 'REVIEWED', 'Reviewed by security team.');
      fetchAlerts();
    } catch (err) {
      console.error('Failed to review alert:', err);
    }
  };

  const handleInspect = async (alert) => {
    try {
      const res = await alertService.getById(alert.alertId);
      if (res.data.associatedRequest) {
        setInspectRequest(res.data.associatedRequest);
      }
    } catch (e) {
      console.error('Could not fetch associated request:', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
          Security Alerts
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
          Alerts automatically generated on malformed syntax or unexpected DFA interaction sequences.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Client */}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Client ID..."
              value={searchClientId}
              onChange={(e) => setSearchClientId(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="form-input form-select"
            style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem' }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">High / Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input form-select"
            style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="REVIEWED">REVIEWED</option>
          </select>

          <button onClick={fetchAlerts} className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1rem' }}>
            Filter
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Client ID</th>
                <th>Alert Type</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Date and Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                // Color coding: Red for High/Critical, Orange for Medium, Blue for Low
                const isHigh = alert.severity === 'HIGH' || alert.severity === 'CRITICAL';
                const isMedium = alert.severity === 'MEDIUM';

                return (
                  <tr key={alert._id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                      {alert.alertId}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                      {alert.clientId}
                    </td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                      {alert.alertType}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          isHigh ? 'badge-red' : isMedium ? 'badge-orange' : 'badge-blue'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '320px', lineHeight: 1.3 }}>
                      {alert.description}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(alert.timestamp).toLocaleDateString()} {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span
                        className={`badge ${alert.status === 'OPEN' ? 'badge-red' : 'badge-green'}`}
                        style={{ fontSize: '0.68rem' }}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {alert.status === 'OPEN' ? (
                          <button
                            onClick={() => handleReview(alert.alertId)}
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', color: '#16a34a', borderColor: '#bbf7d0' }}
                            title="Mark as reviewed"
                          >
                            <Check size={12} />
                            <span>Mark Reviewed</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                            Reviewed
                          </span>
                        )}
                        <button
                          onClick={() => handleInspect(alert)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.45rem' }}
                          title="View triggering request"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No security alerts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Triggering Request Inspector Modal */}
      {inspectRequest && (
        <RequestDetailModal
          request={inspectRequest}
          onClose={() => setInspectRequest(null)}
        />
      )}
    </div>
  );
}
