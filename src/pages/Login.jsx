import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Fallo al iniciar sesión. Revisa tus credenciales.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4 relative overflow-hidden text-slate-200">
      
      <div className="max-w-md w-full glass-panel p-8 rounded-xl relative z-10">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/logo.jpg" 
            alt="DIGIWILL Logo" 
            className="w-24 h-24 rounded-full border-2 border-indigo-500/50 shadow-[0_0_20px_rgba(139,92,246,0.5)] object-cover mb-4" 
          />
          <h2 className="text-4xl font-bold text-center text-indigo-400 tracking-widest uppercase">DIGIWILL</h2>
        </div>
        <h3 className="text-lg font-semibold mb-6 text-center text-slate-300">Iniciar Sesión Segura</h3>
        
        {error && <div className="bg-rose-900/50 text-rose-300 p-3 rounded-lg mb-4 text-sm text-center border border-rose-500/50 shadow-[0_0_10px_rgba(225,29,72,0.4)]">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              className="w-full rounded-lg p-3 outline-none" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              className="w-full rounded-lg p-3 outline-none" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading} 
            type="submit" 
            className="w-full neon-button text-white font-bold py-3 rounded-lg disabled:opacity-50 mt-6 tracking-wide"
          >
            {loading ? 'Sincronizando...' : 'ACCEDER AL SISTEMA'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500">
          ¿No tienes cuenta? <Link to="/register" className="text-indigo-400 hover:text-indigo-300 hover:underline">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
