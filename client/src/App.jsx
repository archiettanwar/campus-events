import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-2">{subtitle}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <PlaceholderPage
                        title="Upcoming Campus Events"
                        subtitle="Event cards and live seat tracking will be built in Phase 6."
                      />
                    }
                  />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route
                    path="/my-registrations"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <PlaceholderPage
                          title="My Registrations"
                          subtitle="Your event registration statuses will appear here in Phase 6."
                        />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PlaceholderPage
                          title="Admin Dashboard"
                          subtitle="Event creation and registration approvals will appear here in Phase 6."
                        />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}