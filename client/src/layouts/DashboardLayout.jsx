import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function DashboardLayout() {
  const location = useLocation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getPageTitle = (path) => {
    switch (path) {
      case '/':
        return 'API Security Dashboard';
      case '/tester':
        return 'API Request Tester';
      case '/monitoring':
        return 'Request Monitoring';
      case '/alerts':
        return 'Security Alerts';
      case '/automata':
        return 'DFA Visualization';
      default:
        return 'API Security Platform';
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          pageTitle={getPageTitle(location.pathname)}
        />
        <main style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
          <Outlet context={{ refreshTrigger, handleRefresh }} />
        </main>
      </div>
    </div>
  );
}
