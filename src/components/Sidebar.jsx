import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, WalletCards, Package, Users, ShoppingCart, LogOut, Settings, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const emailUser = currentUser?.email?.toLowerCase() || '';
  const isVendedor = emailUser === 'vendedor1@digiwill.com';
  const isAdmin = emailUser === 'wilmerjosevegaacevedo@gmail.com';

  return (
    <div className="w-full md:w-64 bg-slate-900 border-r border-indigo-900/50 h-auto md:h-full flex flex-col shrink-0 shadow-[4px_0_24px_rgba(79,70,229,0.1)] relative overflow-hidden z-10">
      
      <div className="p-6 border-b border-indigo-900/50 relative">
        <h1 className="text-2xl font-bold text-indigo-400 neon-text flex items-center gap-2 tracking-wider">
          <Settings className="animate-[spin_4s_linear_infinite]" size={24} /> 
          DIGIWILL
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto relative z-10">
        {!isVendedor && (
          <NavLink 
            to="/" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive && window.location.pathname === '/' ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
        )}

        <NavLink 
          to="/clientes" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <Users size={20} />
          <span>Clientes</span>
        </NavLink>
        
        {!isVendedor && (
          <NavLink 
            to="/prestamos" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
          >
            <WalletCards size={20} />
            <span>Préstamos WILL</span>
          </NavLink>
        )}
        
        {!isVendedor && (
          <NavLink 
            to="/productos" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
          >
            <Package size={20} />
            <span>Inventario</span>
          </NavLink>
        )}

        {!isVendedor && (
          <NavLink 
            to="/caja" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
          >
            <DollarSign size={20} />
            <span>Caja Diaria</span>
          </NavLink>
        )}

        {!isVendedor && (
          <NavLink 
            to="/ventas-lizz" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-fuchsia-600/20 text-fuchsia-300 neon-border font-medium border-fuchsia-500' : 'text-slate-400 hover:bg-slate-800 hover:text-fuchsia-200'}`}
          >
            <ShoppingCart size={20} />
            <span>Ventas Lizz</span>
          </NavLink>
        )}

        <NavLink 
          to="/ventas" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <ShoppingCart size={20} />
          <span>Ventas / Facturación</span>
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-indigo-900/50 text-sm relative z-10">
        <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors border border-transparent hover:border-rose-500/30">
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
