import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }
    try {
      setError('');
      setLoading(true);
      await signup(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Error: Debes habilitar "Correo/Contraseña" en la pestaña Authentication de tu Consola de Firebase.');
      } else if (err.code === 'auth/weak-password') {
        setError('Error: La contraseña es muy débil (mínimo 6 caracteres).');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Error: Ya existe una cuenta con este correo.');
      } else {
        setError('Error al crear la cuenta: ' + err.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4 relative overflow-hidden text-slate-200">
      
      {/* Background Gears */}
      <div className="gear-bg gear-bg-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.8-7.8l-2.8 2.8m-5.6 5.6l-2.8 2.8m11.2 0l-2.8-2.8m-5.6-5.6l-2.8-2.8" /><circle cx="12" cy="12" r="4" /></svg>
      </div>

      <div className="max-w-md w-full glass-panel p-8 rounded-xl relative z-10">
        <h2 className="text-4xl font-bold text-center text-indigo-400 mb-8 neon-text tracking-widest">DIGIWILL</h2>
        <h3 className="text-xl font-semibold mb-6 text-center text-slate-300">Registrar Administrador</h3>
        
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
            <label className="block text-sm font-medium text-slate-400 mb-1">Contraseña (Mínimo 6 caracteres)</label>
            <input 
              type="password" 
              required 
              className="w-full rounded-lg p-3 outline-none" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Confirmar Contraseña</label>
            <input 
              type="password" 
              required 
              className="w-full rounded-lg p-3 outline-none" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading} 
            type="submit" 
            className="w-full neon-button text-white font-bold py-3 rounded-lg disabled:opacity-50 mt-6 tracking-wide"
          >
            {loading ? 'Sincronizando...' : 'CREAR CUENTA'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline">Inicia Sesión aquí</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
