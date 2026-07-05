import { createContext, useContext, useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null); // 'host' | 'admin' | null
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    setLoading(true);
    const savedUser = localStorage.getItem('clm_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser); // { email, role, uid }
        if (parsed.role === 'host') {
          const hostSnap = await get(ref(db, 'host/profile'));
          if (hostSnap.exists() && hostSnap.val().email === parsed.email) {
            setCurrentUser(parsed);
            setRole('host');
            setAdminData(null);
          } else {
            logout();
          }
        } else if (parsed.role === 'admin') {
          const adminSnap = await get(ref(db, `host/admins/${parsed.uid}`));
          if (adminSnap.exists() && adminSnap.val().email === parsed.email) {
            const data = adminSnap.val();
            setCurrentUser(parsed);
            setRole('admin');
            setAdminData(data);
          } else {
            logout();
          }
        }
      } catch (e) {
        console.error('Auth verification error:', e);
        logout();
      }
    } else {
      setCurrentUser(null);
      setRole(null);
      setAdminData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (user) => {
    localStorage.setItem('clm_auth_user', JSON.stringify(user));
    setCurrentUser(user);
    setRole(user.role);
    if (user.adminData) {
      setAdminData(user.adminData);
    } else {
      setAdminData(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('clm_auth_user');
    setCurrentUser(null);
    setRole(null);
    setAdminData(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, role, adminData, loading, login, logout, refreshAuth: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
