import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, Sparkles, RotateCcw } from 'lucide-react';
import { requestService, automataService } from '../services/api';

const QUICK_TESTS = [
  {
    label: '1. Valid Login (q0 → q1)',
    clientId: 'client-01',
    method: 'POST',
    endpoint: '/api/login',
    params: '',
    body: '{\n  "email": "student@university.edu",\n  "password": "Password123"\n}',
  },
  {
    label: '2. Valid Profile (q1 → q2)',
    clientId: 'client-01',
    method: 'GET',
    endpoint: '/api/profile',
    params: '',
    body: '',
  },
  {
    label: '3. Valid Data (q2 → q3)',
    clientId: 'client-01',
    method: 'GET',
    endpoint: '/api/data',
    params: '{\n  "page": 1,\n  "limit": 10\n}',
    body: '',
  },
  {
    label: '4. Valid Logout (q3 → q5)',
    clientId: 'client-01',
    method: 'POST',
    endpoint: '/api/logout',
    params: '',
    body: '{\n  "clientId": "client-01"\n}',
  },
  {
    label: '5. Invalid Sequence (Skip Profile)',
    clientId: 'client-test-skip',
    method: 'GET',
    endpoint: '/api/data',
    params: '',
    body: '',
  },
  {
    label: '6. Malformed Method',
    clientId: 'client-01',
    method: 'INVALID_VERB',
    endpoint: '/api/login',
    params: '',
    body: '',
  },
];

export default function RequestTesterPage() {
  const [clientId, setClientId] = useState('client-01');
  const [method, setMethod] = useState('POST');
  const [endpoint, setEndpoint] = useState('/api/login');
  const [params, setParams] = useState('');
  const [body, setBody] = useState('{\n  "email": "student@university.edu",\n  "password": "Password123"\n}');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [resetMessage, setResetMessage] = useState('');

  const loadPreset = (preset) => {
    setClientId(preset.clientId);
    setMethod(preset.method);
    setEndpoint(preset.endpoint);
    setParams(preset.params);
    setBody(preset.body);
    setResult(null);
  };

  const handleReset = async () => {
    try {
      await automataService.resetClient(clientId);
      setResetMessage(`Client "${clientId}" state reset to q0.`);
      setTimeout(() => setResetMessage(''), 3000);
    } catch (err) {
      setResetMessage('Reset failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setResetMessage('');

    try {
      let parsedParams = {};
      let parsedBody = null;

      if (params.trim()) {
        try {
          parsedParams = JSON.parse(params);
        } catch {
          parsedParams = { raw: params };
        }
      }

      if (body.trim()) {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          parsedBody = body; // Send as string to test regex validation of malformed JSON
        }
      }

      const res = await requestService.validate({
        clientId,
        method,
        endpoint,
        params: parsedParams,
        body: parsedBody,
      });

      setResult(res.data);
    } catch (err) {
      if (err.response?.data) {
        setResult(err.response.data);
      } else {
        setResult({
          overallStatus: 'INVALID',
          httpStatus: 500,
          validationExplanation: err.message,
          regexResult: { isValid: false },
          dfaResult: { isValid: false },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
          API Request Tester
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
          Test HTTP requests against backend Regex and DFA sequence validation engines.
        </p>
      </div>

      {/* Quick Test Presets */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <Sparkles size={15} color="#2563eb" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
            Quick Test Scenarios
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {QUICK_TESTS.map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadPreset(t)}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Form & Result Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Simple Request Form */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Request Parameters
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Reset client session state back to q0"
            >
              <RotateCcw size={12} />
              <span>Reset State</span>
            </button>
          </div>

          {resetMessage && (
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.75rem', color: '#1d4ed8', marginBottom: '1rem' }}>
              {resetMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Client ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Client ID
              </label>
              <input
                type="text"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="client-01"
                className="form-input font-mono"
              />
            </div>

            {/* HTTP Method Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                HTTP Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="form-input form-select font-mono"
                style={{ fontWeight: 600 }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="INVALID_VERB">INVALID_VERB (Malformed Test)</option>
              </select>
            </div>

            {/* API Endpoint */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                API Endpoint
              </label>
              <input
                type="text"
                required
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/login"
                className="form-input font-mono"
              />
            </div>

            {/* Request Parameters */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Request Parameters (Optional)
              </label>
              <textarea
                rows={2}
                value={params}
                onChange={(e) => setParams(e.target.value)}
                placeholder='{"page": 1, "limit": 10}'
                className="form-input font-mono"
                style={{ fontSize: '0.78rem' }}
              />
            </div>

            {/* Request Body */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Request Body (Optional)
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"email": "student@university.edu", "password": "Password123"}'
                className="form-input font-mono"
                style={{ fontSize: '0.78rem' }}
              />
            </div>

            {/* Clear Blue Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem' }}
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Validating...' : 'Validate Request'}</span>
            </button>
          </form>
        </div>

        {/* Simple Result Card */}
        <div className="card" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            Validation Result
          </h3>

          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Overall Status Banner */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: result.overallStatus === 'VALID' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${result.overallStatus === 'VALID' ? '#bbf7d0' : '#fecaca'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                {result.overallStatus === 'VALID' ? (
                  <CheckCircle size={28} color="#16a34a" />
                ) : (
                  <XCircle size={28} color="#dc2626" />
                )}
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: result.overallStatus === 'VALID' ? '#16a34a' : '#dc2626' }}>
                    {result.overallStatus === 'VALID' ? 'VALID' : 'INVALID'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    HTTP Status: <strong>{result.httpStatus}</strong>
                  </div>
                </div>
              </div>

              {/* Status Items Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {/* Regex Validation */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    Regex Validation
                  </span>
                  <span
                    className={`badge ${result.regexResult?.isValid !== false ? 'badge-green' : 'badge-red'}`}
                  >
                    {result.regexResult?.isValid !== false ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                {/* DFA Validation */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    DFA Validation
                  </span>
                  <span
                    className={`badge ${result.dfaResult?.isValid !== false ? 'badge-green' : 'badge-red'}`}
                  >
                    {result.dfaResult?.isValid !== false ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                {/* Overall Status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    Overall Status
                  </span>
                  <span
                    className={`badge ${result.overallStatus === 'VALID' ? 'badge-green' : 'badge-red'}`}
                  >
                    {result.overallStatus}
                  </span>
                </div>

                {/* HTTP Status Code */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    HTTP Status Code
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', fontWeight: 700, color: result.httpStatus >= 400 ? '#dc2626' : '#16a34a' }}>
                    {result.httpStatus}
                  </span>
                </div>
              </div>

              {/* Validation Message */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Validation Message
                </div>
                <div style={{ fontSize: '0.8rem', color: '#0f172a', lineHeight: 1.4 }}>
                  {result.validationExplanation || result.message || 'No additional details provided.'}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                textAlign: 'center',
                padding: '2rem',
                gap: '0.5rem',
              }}
            >
              <Send size={24} color="#94a3b8" />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                No request submitted yet
              </div>
              <p style={{ fontSize: '0.78rem', maxWidth: '240px' }}>
                Fill out the request form and click "Validate Request" to inspect the result.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
