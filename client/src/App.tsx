import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SaveStatusProvider } from './contexts/SaveStatusContext';
import { UserSessionProvider } from './contexts/UserSessionContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages - Eager loading for critical pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrganizationalHub from './pages/OrganizationalHub';
import RiskCommandCenter from './pages/RiskCommandCenter';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import CSFBaseline from './pages/CSFBaseline';
import Settings from './pages/Settings';
import SystemDetails from './pages/SystemDetails';

// Pages - Lazy loading for larger pages
const Systems = lazy(() => import('./pages/Systems'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ProductAssessments = lazy(() => import('./pages/ProductAssessments'));
const Frameworks = lazy(() => import('./pages/Frameworks'));
const FrameworkDetails = lazy(() => import('./pages/FrameworkDetails'));
const Reports = lazy(() => import('./pages/Reports'));
const AssessmentWorkspace = lazy(() => import('./pages/AssessmentWorkspace'));

// Loading component for lazy-loaded pages
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
    }}
  >
    <CircularProgress />
  </Box>
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <UserSessionProvider>
            <SaveStatusProvider>
            <Router>
              <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />

                    {/* Protected routes with Layout */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      {/* Organizational Hub - NEW HOME (Phase 1) */}
                      <Route path="/org" element={<OrganizationalHub />} />

                      {/* Legacy Command Center - Redirect to org */}
                      <Route path="/command-center" element={<Navigate to="/org" replace />} />

                      {/* Dashboard - Legacy */}
                      <Route path="/dashboard" element={<Dashboard />} />

                      {/* Frameworks */}
                      <Route path="/frameworks" element={<Frameworks />} />
                      <Route path="/frameworks/:id" element={<FrameworkDetails />} />

                      {/* Products */}
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/:id" element={<ProductDetails />} />
                      <Route path="/products/:id/baseline" element={<CSFBaseline />} />
                      <Route path="/products/:id/assessments" element={<ProductAssessments />} />

                      {/* Systems - Lazy loaded */}
                      <Route path="/systems" element={<Systems />} />
                      <Route path="/systems/:id" element={<SystemDetails />} />

                      {/* Assessment Workspace - Single-page assessment flow */}
                      <Route path="/assess/:productId/:systemId" element={<AssessmentWorkspace />} />


                      {/* Analytics - Lazy loaded */}
                      <Route path="/analytics" element={<Analytics />} />

                      {/* Reports - Export hub */}
                      <Route path="/reports" element={<Reports />} />

                      {/* Settings */}
                      <Route path="/settings" element={<Settings />} />

                      {/* Root redirect */}
                      <Route path="/" element={<Navigate to="/org" replace />} />
                    </Route>

                    {/* Catch all - redirect to organizational hub */}
                    <Route path="*" element={<Navigate to="/org" replace />} />
                  </Routes>
                </Suspense>
              </Box>
            </Router>
            </SaveStatusProvider>
            </UserSessionProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;