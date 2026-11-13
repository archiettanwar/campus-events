import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campuslab_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('campuslab_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('campuslab_user', JSON.stringify(res.data.user));
        socket.emit('join', res.data.user._id);
      })
      .catch(() => {
        localStorage.removeItem('campuslab_token');
        localStorage.removeItem('campuslab_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('campuslab_token', res.data.token);
    localStorage.setItem('campuslab_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    socket.emit('join', res.data.user._id);
    return res.data.user;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    localStorage.setItem('campuslab_token', res.data.token);
    localStorage.setItem('campuslab_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    socket.emit('join', res.data.user._id);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('campuslab_token');
    localStorage.removeItem('campuslab_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);