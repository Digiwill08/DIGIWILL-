import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Prestamos from './pages/Prestamos';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Ventas from './pages/Ventas';
import VentasLizz from './pages/VentasLizz';
import Caja from './pages/Caja';
import Login from './pages/Login';
import Register from './pages/Register';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

const ProtectedLayout = () => {
  const { currentUser } = useAuth();
  const emailUser = currentUser?.email?.toLowerCase() || '';
  const isVendedor = emailUser === 'vendedor1@digiwill.com';
  const isAdmin = emailUser === 'wilmerjosevegaacevedo@gmail.com';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-transparent relative overflow-hidden text-slate-200">
      <div className="gear-bg gear-bg-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.8-7.8l-2.8 2.8m-5.6 5.6l-2.8 2.8m11.2 0l-2.8-2.8m-5.6-5.6l-2.8-2.8" /><circle cx="12" cy="12" r="4" /></svg>
      </div>
      <div className="gear-bg gear-bg-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.8-7.8l-2.8 2.8m-5.6 5.6l-2.8 2.8m11.2 0l-2.8-2.8m-5.6-5.6l-2.8-2.8" /><circle cx="12" cy="12" r="4" /></svg>
      </div>

      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative z-10">
        <Routes>
          <Route path="/" element={isVendedor ? <Navigate to="/ventas" /> : <Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/prestamos" element={isVendedor ? <Navigate to="/ventas" /> : <Prestamos />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/ventas-lizz" element={isVendedor ? <Navigate to="/ventas" replace /> : <VentasLizz />} />
          <Route path="/caja" element={isVendedor ? <Navigate to="/ventas" replace /> : <Caja />} />
          <Route path="*" element={<Navigate to={isVendedor ? "/ventas" : "/"} />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="*" element={
            <PrivateRoute>
              <ProtectedLayout />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
