import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { requestService } from '../services/api';
import RequestDetailModal from '../components/RequestDetailModal';

export default function RequestMonitoringPage() {
  const { refreshTrigger } = useOutletContext() || {};
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Essential filters only
  const [searchClientId, setSearchClientId] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(searchClientId ? { clientId: searchClientId.trim() } : {}),
        ...(methodFilter ? { method: methodFilter } : {}),
        ...(statusFilter ? { overallStatus: statusFilter } : {}),
      };

      const res = await requestService.getAll(params);
      setRequests(res.data.data);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load request logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, limit, methodFilter, statusFilter, refreshTrigger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleResetFilters = () => {
    setSearchClientId('');
    setMethodFilter('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
          Request Monitoring
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
          Real-time log of monitored API interactions with Regex and DFA status.
        </p>
      </div>

      {/* Essential Filters Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search by Client ID */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
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

          {/* Filter by HTTP Method */}
          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="form-input form-select"
            style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }}
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* Filter by Validation Status */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-input form-select"
            style={{ width: 'auto', minWidth: '160px', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="VALID">VALID</option>
            <option value="INVALID">INVALID</option>
          </select>

          {/* Search & Reset Buttons */}
          <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1rem' }}>
            Search
          </button>
          <button type="button" onClick={handleResetFilters} className="btn-secondary" style={{ fontSize: '0.85rem', padding: '0.6rem 0.9rem' }}>
            Reset
          </button>
        </form>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Client ID</th>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Regex Status</th>
                <th>DFA Status</th>
                <th>HTTP Status</th>
                <th>Overall Result</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>
                    {req.requestId}
                  </td>
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
                    <span className={`badge ${req.regexStatus === 'VALID' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.68rem' }}>
                      {req.regexStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${req.dfaStatus === 'VALID' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.68rem' }}>
                      {req.dfaStatus}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', fontWeight: 700, color: req.httpStatus >= 400 ? '#dc2626' : '#16a34a' }}>
                      {req.httpStatus}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${req.overallStatus === 'VALID' ? 'badge-green' : 'badge-red'}`}
                    >
                      {req.overallStatus}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      title="View complete request details"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No matching API request logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Simple Pagination */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Page {page} of {totalPages} ({totalCount} total requests)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.6rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.8rem', color: '#0f172a', padding: '0 0.4rem', fontWeight: 600 }}>
              {page}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.6rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
