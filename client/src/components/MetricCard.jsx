import React from 'react';

export default function MetricCard({ title, value, subtext, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: { iconColor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    green: { iconColor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    red: { iconColor: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    orange: { iconColor: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              backgroundColor: scheme.bg,
              border: `1px solid ${scheme.border}`,
              color: scheme.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
        {typeof value === 'number' ? value.toLocaleString() : value ?? '0'}
      </div>

      {subtext && (
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
