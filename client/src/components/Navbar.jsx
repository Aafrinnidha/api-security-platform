import React, { useState } from 'react';
import { RefreshCw, Database, Sparkles } from 'lucide-react';
import { demoService } from '../services/api';

export default function Navbar({ onRefresh, isRefreshing, pageTitle = 'Dashboard' }) {
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await demoService.seedTraffic();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Seed traffic failed:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          {pageTitle}
        </h1>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Seed Demo Traffic Button */}
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          title="Generate sample requests and alerts"
        >
          <Sparkles size={14} color="#2563eb" />
          <span>{seeding ? 'Generating...' : seedSuccess ? 'Traffic Seeded!' : 'Seed Demo Data'}</span>
        </button>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            title="Refresh data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}

        {/* Database Live indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.65rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#475569',
          }}
        >
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }}></div>
          <span>Connected</span>
        </div>
      </div>
    </header>
  );
}
