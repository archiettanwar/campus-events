import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyRequestsPage from './pages/MyRequestsPage';
import AssistantDashboardPage from './pages/AssistantDashboardPage';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/my-requests"
          element={
            <ProtectedRoute allowedRole="student">
              <MyRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute allowedRole="lab_assistant">
              <AssistantDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}