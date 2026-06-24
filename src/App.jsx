import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ConstellationBackground from './components/ConstellationBackground';
import Dashboard from './pages/Dashboard';
import Prestamos from './pages/Prestamos';
import Creditos from './pages/Creditos';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Ventas from './pages/Ventas';
import Gastos from './pages/Gastos';
import Caja from './pages/Caja';
import Login from './pages/Login';
import Register from './pages/Register';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Fondo interactivo de constelaciones */}
        <ConstellationBackground />
        
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="*" element={
            <PrivateRoute>
              <div className="flex flex-col md:flex-row h-screen bg-transparent relative overflow-hidden text-slate-200">
                <Sidebar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative z-10">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/prestamos" element={<Prestamos />} />
                    <Route path="/creditos" element={<Creditos />} />
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/ventas" element={<Ventas />} />
                    <Route path="/gastos" element={<Gastos />} />
                    <Route path="/caja" element={<Caja />} />
                  </Routes>
                </main>
              </div>
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

