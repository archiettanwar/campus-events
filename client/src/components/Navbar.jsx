import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '../services/socket';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(() =>
    Boolean(socket?.connected || socket?.io?.engine?.readyState === 'open')
  );

  useEffect(() => {
    const checkConnection = () => {
      const isOpen = Boolean(socket?.connected || socket?.io?.engine?.readyState === 'open');
      setConnected(isOpen);
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    checkConnection();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('open', onConnect);

    const timer = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(timer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('open', onConnect);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = (path) =>
    `text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'text-indigo-600 font-semibold'
        : 'text-slate-600 hover:text-indigo-600'
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
              CL
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Campus<span className="text-indigo-600">Lab</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={linkClass('/')}>
              Labs & Equipment
            </Link>
            {user?.role === 'student' && (
              <Link to="/my-requests" className={linkClass('/my-requests')}>
                My Checkouts
              </Link>
            )}
            {user?.role === 'lab_assistant' && (
              <Link to="/assistant" className={linkClass('/assistant')}>
                Lab Assistant Console
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            title={connected ? 'Real-time Socket.IO active' : 'Connecting to Render backend...'}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {connected ? 'Live' : 'Connecting...'}
          </span>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">
                  {user.role === 'lab_assistant' ? 'Lab Assistant' : user.rollNumber || 'Student'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3 py-1.5"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}