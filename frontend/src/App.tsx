import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { ToastContainer } from './components/Toast';
import { RouteGuard } from './components/RouteGuard';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { MFASetupPage } from './pages/MFASetup';
import { MFAVerifyPage } from './pages/MFAVerify';
import { DashboardPage } from './pages/Dashboard';
import { CasesPage } from './pages/Cases';
import { CaseDetailPage } from './pages/CaseDetail';
import { DocumentsPage } from './pages/Documents';
import { LedgerPage } from './pages/Ledger';
import { AuditLogPage } from './pages/AuditLog';
import { AdminPage } from './pages/Admin';

const queryClient = new QueryClient();

function App() {
  const { loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/mfa-setup" element={<MFASetupPage />} />
          <Route path="/mfa-verify" element={<MFAVerifyPage />} />

          {/* Protected routes */}
          <Route
            element={
              <RouteGuard>
                <Layout />
              </RouteGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
