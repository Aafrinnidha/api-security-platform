import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import RequestDetailModal from '../components/RequestDetailModal';
import { dashboardService, requestService, alertService } from '../services/api';

export default function DashboardPage() {
  const { refreshTrigger } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, reqsRes, alertsRes] = await Promise.all([
        dashboardService.getStats(),
        requestService.getAll({ page: 1, limit: 6 }),
        alertService.getAll({ page: 1, limit: 3 }),
      ]);

      setStats(statsRes.data.data);
      setRecentRequests(reqsRes.data.data);
      setRecentAlerts(alertsRes.data.data.slice(0, 3));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Periodic automatic refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      {/* Dashboard Heading & Subtitle */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
          API Security Dashboard
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
          Monitor, validate, and secure your API requests.
        </p>
      </div>

      {/* 4 SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <MetricCard
          title="Total Requests"
          value={stats?.totalRequests || 0}
          icon={Activity}
          color="blue"
          subtext="Total processed interactions"
        />
        <MetricCard
          title="Valid Requests"
          value={stats?.validRequests || 0}
          icon={CheckCircle}
          color="green"
          subtext={`${stats?.totalRequests ? Math.round(((stats.validRequests || 0) / stats.totalRequests) * 100) : 100}% compliance`}
        />
        <MetricCard
          title="Invalid Requests"
          value={stats?.invalidRequests || 0}
          icon={XCircle}
          color="red"
          subtext="Blocked by Regex / DFA"
        />
        <MetricCard
          title="Security Alerts"
          value={stats?.totalAlerts || 0}
          icon={ShieldAlert}
          color="orange"
          subtext={`${stats?.openAlerts || 0} pending review`}
        />
      </div>

      {/* TWO SECTIONS: Recent API Requests & Recent Security Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem' }}>
        {/* Recent API Requests Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Recent API Requests
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Incoming HTTP requests verified by Regex and DFA
              </p>
            </div>
            <Link
              to="/monitoring"
              style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>HTTP</th>
                  <th>Time</th>
                  <th style={{ textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req) => (
                  <tr key={req._id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                      {req.clientId}
                    </td>
                    <td>
                      <span className={`method-badge method-${req.method?.toLowerCase()}`}>
                        {req.method}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#334155' }}>
                      {req.endpoint}
                    </td>
                    <td>
                      <span
                        className={`badge ${req.overallStatus === 'VALID' ? 'badge-green' : 'badge-red'}`}
                        style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}
                      >
                        {req.overallStatus}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', fontWeight: 700, color: req.httpStatus >= 400 ? '#dc2626' : '#16a34a' }}>
                        {req.httpStatus}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedRequest(req)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '0.2rem' }}
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {recentRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
                      No recent requests recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Security Alerts (Latest 3) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Recent Security Alerts
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Latest 3 automatically generated alerts
              </p>
            </div>
            <Link
              to="/alerts"
              style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              All Alerts <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {recentAlerts.map((alert) => (
              <div
                key={alert._id}
                style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderLeft: `3px solid ${
                    alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                      ? '#dc2626'
                      : alert.severity === 'MEDIUM'
                      ? '#d97706'
                      : '#2563eb'
                  }`,
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    {alert.alertType}
                  </span>
                  <span
                    className={`badge ${
                      alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                        ? 'badge-red'
                        : alert.severity === 'MEDIUM'
                        ? 'badge-orange'
                        : 'badge-blue'
                    }`}
                    style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}
                  >
                    {alert.severity}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                  {alert.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                  <span>Client: <strong>{alert.clientId}</strong></span>
                  <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
            {recentAlerts.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '1.5rem', textAlign: 'center' }}>
                No security alerts generated yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspector Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
