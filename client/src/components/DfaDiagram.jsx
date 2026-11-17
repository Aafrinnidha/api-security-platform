import React from 'react';

export default function DfaDiagram({ activeState = 'q0', onSelectState }) {
  const isActive = (stateId) => activeState === stateId;

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
      }}
    >
      <svg
        viewBox="0 0 880 350"
        style={{ width: '100%', minWidth: '780px', height: 'auto', display: 'block' }}
      >
        <defs>
          {/* Arrow markers */}
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
          </marker>
          <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#16a34a" />
          </marker>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
          </marker>
        </defs>

        {/* Start indicator arrow */}
        <line x1="25" y1="140" x2="52" y2="140" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <text x="25" y="130" fill="#2563eb" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">START</text>

        {/* TRANSITION ARROWS */}

        {/* q0 -> q1: POST /api/login */}
        <line x1="125" y1="140" x2="212" y2="140" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="132" y="120" width="76" height="18" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="170" y="133" fill="#1e293b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          POST /api/login
        </text>

        {/* q1 -> q2: GET /api/profile */}
        <line x1="285" y1="140" x2="372" y2="140" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="292" y="120" width="76" height="18" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="330" y="133" fill="#1e293b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          GET /api/profile
        </text>

        {/* q2 -> q3: GET /api/data */}
        <line x1="445" y1="140" x2="532" y2="140" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="456" y="120" width="68" height="18" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="490" y="133" fill="#1e293b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          GET /api/data
        </text>

        {/* q3 -> q4: PUT /api/data (downward) */}
        <line x1="570" y1="175" x2="570" y2="232" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        <rect x="580" y="196" width="72" height="18" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="616" y="209" fill="#1e293b" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          PUT /api/data
        </text>

        {/* q3 -> q5: POST /api/logout */}
        <line x1="605" y1="140" x2="720" y2="140" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrow-green)" />
        <rect x="625" y="120" width="80" height="18" rx="4" fill="#f0fdf4" stroke="#bbf7d0" />
        <text x="665" y="133" fill="#16a34a" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          POST /api/logout
        </text>

        {/* q4 -> q5: POST /api/logout (diagonal curve) */}
        <path d="M 605 270 Q 695 270 740 180" fill="none" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrow-green)" />
        <rect x="635" y="254" width="80" height="18" rx="4" fill="#f0fdf4" stroke="#bbf7d0" />
        <text x="675" y="267" fill="#16a34a" fontSize="9" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          POST /api/logout
        </text>

        {/* Unexpected transitions to qE (Invalid) */}
        <path d="M 250 175 Q 250 230 295 255" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow-red)" />
        <path d="M 410 175 Q 410 230 365 255" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow-red)" />
        <text x="330" y="330" fill="#dc2626" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="Inter, sans-serif">
          Unexpected transition → qE (Sink State)
        </text>

        {/* STATES NODES */}

        {/* q0: Initial */}
        <g onClick={() => onSelectState && onSelectState('q0')} style={{ cursor: 'pointer' }}>
          <circle
            cx="90"
            cy="140"
            r="35"
            fill={isActive('q0') ? '#eff6ff' : '#ffffff'}
            stroke={isActive('q0') ? '#2563eb' : '#94a3b8'}
            strokeWidth={isActive('q0') ? '3' : '1.5'}
          />
          <text x="90" y="136" fill={isActive('q0') ? '#2563eb' : '#0f172a'} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono">q0</text>
          <text x="90" y="152" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="Inter">Initial</text>
        </g>

        {/* q1: Login Successful */}
        <g onClick={() => onSelectState && onSelectState('q1')} style={{ cursor: 'pointer' }}>
          <circle
            cx="250"
            cy="140"
            r="35"
            fill={isActive('q1') ? '#eff6ff' : '#ffffff'}
            stroke={isActive('q1') ? '#2563eb' : '#94a3b8'}
            strokeWidth={isActive('q1') ? '3' : '1.5'}
          />
          <text x="250" y="136" fill={isActive('q1') ? '#2563eb' : '#0f172a'} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono">q1</text>
          <text x="250" y="152" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="Inter">Login</text>
        </g>

        {/* q2: Profile Accessed */}
        <g onClick={() => onSelectState && onSelectState('q2')} style={{ cursor: 'pointer' }}>
          <circle
            cx="410"
            cy="140"
            r="35"
            fill={isActive('q2') ? '#eff6ff' : '#ffffff'}
            stroke={isActive('q2') ? '#2563eb' : '#94a3b8'}
            strokeWidth={isActive('q2') ? '3' : '1.5'}
          />
          <text x="410" y="136" fill={isActive('q2') ? '#2563eb' : '#0f172a'} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono">q2</text>
          <text x="410" y="152" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="Inter">Profile</text>
        </g>

        {/* q3: Data Accessed */}
        <g onClick={() => onSelectState && onSelectState('q3')} style={{ cursor: 'pointer' }}>
          <circle
            cx="570"
            cy="140"
            r="35"
            fill={isActive('q3') ? '#eff6ff' : '#ffffff'}
            stroke={isActive('q3') ? '#2563eb' : '#94a3b8'}
            strokeWidth={isActive('q3') ? '3' : '1.5'}
          />
          <text x="570" y="136" fill={isActive('q3') ? '#2563eb' : '#0f172a'} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono">q3</text>
          <text x="570" y="152" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="Inter">Data</text>
        </g>

        {/* q4: Data Updated */}
        <g onClick={() => onSelectState && onSelectState('q4')} style={{ cursor: 'pointer' }}>
          <circle
            cx="570"
            cy="270"
            r="35"
            fill={isActive('q4') ? '#eff6ff' : '#ffffff'}
            stroke={isActive('q4') ? '#2563eb' : '#94a3b8'}
            strokeWidth={isActive('q4') ? '3' : '1.5'}
          />
          <text x="570" y="266" fill={isActive('q4') ? '#2563eb' : '#0f172a'} fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono">q4</text>
          <text x="570" y="282" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="Inter">Updated</text>
        </g>

        {/* q5: Accepting State (Double Circle) */}
        <g onClick={() => onSelectState && onSelectState('q5')} style={{ cursor: 'pointer' }}>
          <circle
            cx="760"
            cy="140"
            r="38"
            fill={isActive('q5') ? '#f0fdf4' : '#ffffff'}
            stroke="#16a34a"
            strokeWidth={isActive('q5') ? '3' : '2'}
          />
          <circle
            cx="760"
            cy="140"
            r="31"
            fill="transparent"
            stroke="#16a34a"
            strokeWidth="1.5"
          />
          <text x="760" y="136" fill="#16a34a" fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono">q5</text>
          <text x="760" y="152" fill="#16a34a" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="Inter">ACCEPTING</text>
        </g>

        {/* qE: Invalid State */}
        <g onClick={() => onSelectState && onSelectState('qE')} style={{ cursor: 'pointer' }}>
          <circle
            cx="330"
            cy="270"
            r="35"
            fill={isActive('qE') ? '#fef2f2' : '#ffffff'}
            stroke="#dc2626"
            strokeWidth={isActive('qE') ? '3' : '1.5'}
            strokeDasharray="4 2"
          />
          <text x="330" y="266" fill="#dc2626" fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono">qE</text>
          <text x="330" y="282" fill="#dc2626" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="Inter">INVALID</text>
        </g>
      </svg>
    </div>
  );
}
