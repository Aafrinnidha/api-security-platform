import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RotateCcw, ArrowRight, CheckCircle, AlertTriangle, User } from 'lucide-react';
import DfaDiagram from '../components/DfaDiagram';
import { automataService } from '../services/api';

export default function AutomataPage() {
  const { refreshTrigger } = useOutletContext() || {};
  const [definition, setDefinition] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('client-01');
  const [clientData, setClientData] = useState(null);
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAutomataData = async () => {
    try {
      setLoading(true);
      const [transRes, clientsRes] = await Promise.all([
        automataService.getTransitions(),
        automataService.getAllClients(),
      ]);

      setDefinition(transRes.data.data);
      setClients(clientsRes.data.data);

      if (clientsRes.data.data.length > 0 && !selectedClientId) {
        setSelectedClientId(clientsRes.data.data[0].clientId);
      }
    } catch (err) {
      console.error('Failed to load automata data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (cId) => {
    if (!cId) return;
    try {
      const res = await automataService.getClientState(cId);
      setClientData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch client state:', err);
    }
  };

  useEffect(() => {
    fetchAutomataData();
  }, [refreshTrigger]);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientDetails(selectedClientId);
    }
  }, [selectedClientId, refreshTrigger]);

  const handleReset = async () => {
    if (!selectedClientId) return;
    try {
      await automataService.resetClient(selectedClientId);
      setResetMessage(`Client "${selectedClientId}" reset to initial state q0.`);
      setTimeout(() => setResetMessage(''), 3000);
      fetchClientDetails(selectedClientId);
      fetchAutomataData();
    } catch (err) {
      setResetMessage('Reset failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Extract latest transition details if history exists
  const lastHistory = clientData?.history && clientData.history.length > 0
    ? clientData.history[clientData.history.length - 1]
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px' }}>
      {/* Title & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            DFA Visualization
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
            Deterministic Finite Automaton verifying sequential API request workflows.
          </p>
        </div>

        {/* Client Switcher & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <User size={15} color="#2563eb" />
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Client:</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="form-input form-select font-mono"
              style={{ border: 'none', padding: '0.2rem 0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}
            >
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.clientId} ({c.currentState})
                </option>
              ))}
              <option value="client-01">client-01</option>
              <option value="client-tester">client-tester</option>
              <option value="client-test-skip">client-test-skip</option>
            </select>
          </div>

          <button
            onClick={handleReset}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            title="Reset client session state back to q0"
          >
            <RotateCcw size={14} />
            <span>Reset to q0</span>
          </button>
        </div>
      </div>

      {resetMessage && (
        <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.8rem', color: '#1d4ed8' }}>
          {resetMessage}
        </div>
      )}

      {/* 3. CURRENT CLIENT STATE METRICS CARD (Items 3-7 from prompt) */}
      <div className="card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Client State Inspector: <span style={{ color: '#2563eb' }}>{clientData?.clientId || selectedClientId}</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {/* Current Client State */}
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Current State
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.25rem', fontWeight: 800, color: clientData?.currentState === 'qE' ? '#dc2626' : clientData?.currentState === 'q5' ? '#16a34a' : '#2563eb', marginTop: '0.2rem' }}>
              {clientData?.currentState || 'q0'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.15rem' }}>
              {clientData?.stateInfo?.name || 'Initial State'}
            </div>
          </div>

          {/* Previous State */}
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Previous State
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
              {lastHistory?.fromState || 'None (q0)'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
              Prior position
            </div>
          </div>

          {/* Current Input */}
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Input Symbol
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastHistory?.inputSymbol || 'No interaction yet'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
              Evaluated HTTP request
            </div>
          </div>

          {/* Next State */}
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Next Transition State
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.25rem', fontWeight: 800, color: clientData?.currentState === 'qE' ? '#dc2626' : clientData?.currentState === 'q5' ? '#16a34a' : '#2563eb', marginTop: '0.2rem' }}>
              {clientData?.currentState || 'q0'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
              Target state
            </div>
          </div>

          {/* Validation Result */}
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Validation Result
            </div>
            <div style={{ marginTop: '0.3rem' }}>
              <span
                className={`badge ${
                  clientData?.currentState === 'qE'
                    ? 'badge-red'
                    : 'badge-green'
                }`}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
              >
                {clientData?.currentState === 'qE' ? 'VIOLATION' : 'VALID'}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
              {clientData?.currentState === 'qE' ? 'Sequence rejected' : 'Sequence conforming'}
            </div>
          </div>
        </div>
      </div>

      {/* 1. STATE TRANSITION DIAGRAM */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              1. State Transition Diagram
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Visual deterministic automaton. Current client state is highlighted in blue.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span> Active State
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span> Accepting (q5)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#dc2626', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }}></span> Invalid Sink (qE)
            </span>
          </div>
        </div>

        <DfaDiagram activeState={clientData?.currentState || 'q0'} />
      </div>

      {/* 2. STATE TRANSITION TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            2. State Transition Table: δ(Current State, Input Symbol) → Next State
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Formal state transition rules defining valid and invalid interaction paths.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Current State</th>
                <th>Input Symbol</th>
                <th>Next State</th>
                <th>Description</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {definition?.transitions?.map((rule, idx) => {
                const isCurrent = clientData?.currentState === rule.fromState;

                return (
                  <tr key={idx} style={{ backgroundColor: isCurrent ? '#eff6ff' : '#ffffff' }}>
                    <td>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontWeight: 700,
                          color: isCurrent ? '#2563eb' : '#0f172a',
                        }}
                      >
                        {rule.fromState}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>
                        {rule.inputSymbol}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontWeight: 700,
                          color: rule.toState === 'q5' ? '#16a34a' : rule.toState === 'qE' ? '#dc2626' : '#0f172a',
                        }}
                      >
                        {rule.toState} {rule.toState === 'q5' ? '(Accepting)' : rule.toState === 'qE' ? '(Invalid)' : ''}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {rule.description}
                    </td>
                    <td>
                      <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                        {rule.type}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Fallback Violation Rule */}
              <tr style={{ backgroundColor: clientData?.currentState === 'qE' ? '#fef2f2' : '#ffffff' }}>
                <td>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#dc2626' }}>
                    ANY
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#dc2626' }}>
                    Any Unexpected Input Symbol
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#dc2626' }}>
                    qE (Sink State)
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                  Unpermitted sequence jump rejected and routed to invalid state.
                </td>
                <td>
                  <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>
                    VIOLATION
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
