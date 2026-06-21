import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Prestamos from './pages/Prestamos';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Ventas from './pages/Ventas';
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="*" element={
            <PrivateRoute>
              <div className="flex flex-col md:flex-row h-screen bg-transparent relative overflow-hidden text-slate-200">
                
                {/* Elementos decorativos de fondo */}
                <div className="gear-bg gear-bg-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.8-7.8l-2.8 2.8m-5.6 5.6l-2.8 2.8m11.2 0l-2.8-2.8m-5.6-5.6l-2.8-2.8" /><circle cx="12" cy="12" r="4" /></svg>
                </div>
                <div className="gear-bg gear-bg-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.8-7.8l-2.8 2.8m-5.6 5.6l-2.8 2.8m11.2 0l-2.8-2.8m-5.6-5.6l-2.8-2.8" /><circle cx="12" cy="12" r="4" /></svg>
                </div>

                <Sidebar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative z-10">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/prestamos" element={<Prestamos />} />
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/ventas" element={<Ventas />} />
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
