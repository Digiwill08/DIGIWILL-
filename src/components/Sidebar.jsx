import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, WalletCards, Package, Users, ShoppingCart, LogOut, Settings, Receipt, Coins, BadgePercent } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { currentUser, logout } = useAuth();

  const emailLower = currentUser?.email?.toLowerCase() || '';
  const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
  const isEstefania = emailLower.includes('estefania');
  const isVendor = isLizz || isEstefania;

  return (
    <div className="w-full md:w-64 bg-slate-900 border-r border-indigo-900/50 h-auto md:h-full flex flex-col shrink-0 shadow-[4px_0_24px_rgba(79,70,229,0.1)] relative overflow-hidden z-10">
      
      <div className="p-6 border-b border-indigo-900/50 flex items-center gap-3 relative">
        <img 
          src="/logo.png" 
          alt="DIGIWILL Logo" 
          className="w-9 h-9 rounded-full border border-indigo-500/30 object-contain p-0.5 shadow-[0_0_8px_rgba(139,92,246,0.3)]" 
        />
        <h1 className="text-xl font-bold text-indigo-400 tracking-wider">
          DIGIWILL
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto relative z-10">
        <NavLink 
          to="/" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive && window.location.pathname === '/' ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/clientes" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <Users size={20} />
          <span>Clientes</span>
        </NavLink>
        
        {!isVendor && (
          <NavLink 
            to="/prestamos" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
          >
            <WalletCards size={20} />
            <span>Préstamos WILL</span>
          </NavLink>
        )}

        {!isVendor && (
          <NavLink 
            to="/creditos" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
          >
            <BadgePercent size={20} />
            <span>Créditos de Ventas</span>
          </NavLink>
        )}
        
        <NavLink 
          to="/productos" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <Package size={20} />
          <span>Inventario</span>
        </NavLink>

        <NavLink 
          to="/ventas" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <ShoppingCart size={20} />
          <span>Ventas / Caja</span>
        </NavLink>

        <NavLink 
          to="/gastos" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <Receipt size={20} />
          <span>Egresos / Gastos</span>
        </NavLink>

        <NavLink 
          to="/caja" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/20 text-indigo-300 neon-border font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-200'}`}
        >
          <Coins size={20} />
          <span>Caja y Cierres</span>
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
