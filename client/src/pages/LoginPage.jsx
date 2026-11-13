import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'lab_assistant' ? '/assistant' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <h2 className="text-2xl font-bold text-slate-900">Sign in to CampusLab</h2>
        <p className="text-sm text-slate-500 mt-1">
          Access lab schedules, hardware checkouts, or the assistant console
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Campus Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Fillers */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
            Quick Demo Logins
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('assistant1@campus.edu');
                setPassword('Lab@1234');
              }}
              className="text-xs py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700"
            >
              Assistant 1
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('assistant2@campus.edu');
                setPassword('Lab@1234');
              }}
              className="text-xs py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700"
            >
              Assistant 2
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('student@campus.edu');
                setPassword('Student@1234');
              }}
              className="text-xs py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700"
            >
              Student
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          New student?{' '}
          <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}