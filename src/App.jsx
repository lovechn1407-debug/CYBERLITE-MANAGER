import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Landing from './pages/Landing';
import HostLogin from './pages/host/HostLogin';
import HostDashboard from './pages/host/HostDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClientLogin from './pages/client/ClientLogin';
import ClientSession from './pages/client/ClientSession';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/host/login" element={<HostLogin />} />
          <Route path="/host/dashboard" element={<HostDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/client" element={<ClientLogin />} />
          <Route path="/client/session" element={<ClientSession />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
