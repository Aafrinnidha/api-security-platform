import React from 'react';
import { X, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function RequestDetailModal({ request, onClose }) {
  if (!request) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className={`method-badge method-${request.method?.toLowerCase()}`}>
              {request.method}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
              {request.endpoint}
            </span>
            <span
              className={`badge ${request.overallStatus === 'VALID' ? 'badge-green' : 'badge-red'}`}
            >
              {request.overallStatus}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
              backgroundColor: '#f8fafc',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Request ID</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>{request.requestId}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Client ID</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#0f172a', fontWeight: 600 }}>{request.clientId}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>HTTP Status</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: request.httpStatus >= 400 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                {request.httpStatus}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Response Time</div>
              <div style={{ fontSize: '0.8rem', color: '#334155' }}>{request.responseTime} ms</div>
            </div>
          </div>

          {/* DFA Transition */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              DFA State Transition
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>From State</span>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#2563eb' }}>{request.previousState || 'q0'}</div>
              </div>
              <ArrowRight size={16} color="#94a3b8" />
              <div style={{ flex: 1, textAlign: 'center', padding: '0.2rem 0.5rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#0f172a' }}>
                  {request.method} {request.endpoint}
                </span>
              </div>
              <ArrowRight size={16} color="#94a3b8" />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>To State</span>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: request.nextState === 'qE' ? '#dc2626' : request.nextState === 'q5' ? '#16a34a' : '#2563eb' }}>
                  {request.nextState || 'q0'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: request.dfaStatus === 'VALID' ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {request.dfaStatus === 'VALID' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              <span>{request.validationExplanation || `DFA Sequence: ${request.dfaStatus}`}</span>
            </div>
          </div>

          {/* Regex Validation Results */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Regex Rule Check
            </div>
            {request.regexErrors && request.regexErrors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {request.regexErrors.map((err, idx) => (
                  <div key={idx} style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#dc2626' }}>
                    <div style={{ fontWeight: 600 }}>Rule: {err.rule || 'VALIDATION_FAILED'}</div>
                    <div>{err.message || err}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#16a34a', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={14} />
                <span>All Regular Expression syntax rules passed.</span>
              </div>
            )}
          </div>

          {/* Headers & Body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Request Headers
              </div>
              <pre style={{ backgroundColor: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#334155', maxHeight: '120px', overflowY: 'auto' }}>
                {JSON.stringify(request.headers || {}, null, 2)}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Request Body
              </div>
              <pre style={{ backgroundColor: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#334155', maxHeight: '120px', overflowY: 'auto' }}>
                {JSON.stringify(request.body || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
