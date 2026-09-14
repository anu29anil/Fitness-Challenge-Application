import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

// Components
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { AdminRoute, ClientRoute, PublicRoute } from '@/components/ProtectedRoute';

// Pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ReferenceDashboardPage } from '@/pages/ReferenceDashboardPage';
import { ValidatedRecordActivityPage } from '@/pages/ValidatedRecordActivityPage';
import { ReferenceLeaderboardPage } from '@/pages/ReferenceLeaderboardPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { AdminActivityHistoryPage } from '@/pages/AdminActivityHistoryPage';
import { AdminLeaderboardPage } from '@/pages/AdminLeaderboardPage';

// Styles
import '@/styles/globals.css';

function App() {
  const loadAuth = useAuthStore((state) => state.loadAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  return (
    <>
      <BrowserRouter>
        <Navbar />
        <Sidebar />
        <div className={isAuthenticated ? 'lg:ml-60' : ''}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ClientRoute>
                <ReferenceDashboardPage />
              </ClientRoute>
            }
          />
          
          <Route path="/record-activity" element={<ClientRoute><ValidatedRecordActivityPage /></ClientRoute>} />
          <Route path="/leaderboard" element={<ClientRoute><ReferenceLeaderboardPage /></ClientRoute>} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/leaderboard" element={<AdminRoute><AdminLeaderboardPage /></AdminRoute>} />
          <Route path="/admin/activities" element={<AdminRoute><AdminActivityHistoryPage /></AdminRoute>} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
