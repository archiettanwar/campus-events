import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, connected } = useSocket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
              <span>CampusEvents</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
              <Link to="/" className="hover:text-indigo-600 transition-colors">
                Events
              </Link>
              {user?.role === 'student' && (
                <Link to="/my-registrations" className="hover:text-indigo-600 transition-colors">
                  My Registrations
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className="hover:text-indigo-600 transition-colors">
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Live Socket Status Indicator */}
                <span
                  title={connected ? 'Live updates active' : 'Connecting...'}
                  className={`hidden sm:inline-block h-2 w-2 rounded-full ${
                    connected ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />

                {/* Notification Bell */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-800">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500 text-center">
                            No notifications yet
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              onClick={() => !n.read && markAsRead(n._id)}
                              className={`p-3.5 text-sm transition-colors ${
                                n.read
                                  ? 'bg-white text-slate-600'
                                  : 'bg-indigo-50/60 text-slate-900 font-medium cursor-pointer hover:bg-indigo-50'
                              }`}
                            >
                              <p>{n.message}</p>
                              <span className="text-xs text-slate-400 mt-1 block">
                                {new Date(n.createdAt).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop User Badge & Logout */}
                <div className="hidden md:flex items-center gap-3 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800 leading-none">{user.name}</p>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700"
          >
            Events
          </Link>
          {user?.role === 'student' && (
            <Link
              to="/my-registrations"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              My Registrations
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Admin Dashboard
            </Link>
          )}

          {user ? (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-indigo-600 uppercase font-semibold">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium border border-slate-300 rounded-lg"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}