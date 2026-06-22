import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Wallet, Package, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [metricas, setMetricas] = useState({
    prestamosActivos: 0,
    saldoPendienteTotal: 0,
    productosTotal: 0,
    valorInventario: 0,
    ventasTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [filtroVendedor, setFiltroVendedor] = useState('mio');

  useEffect(() => {
    const fetchMetricas = async () => {
      if (!currentUser) return;
      try {
        const emailLower = currentUser.email?.toLowerCase() || '';
        const isLizz = emailLower.includes('lizz');
        const isEstefania = emailLower.includes('estefania');
        const isVendor = isLizz || isEstefania;
        
        let prestamosCount = 0;
        let saldoTotal = 0;
        let productosCount = 0;
        let valorInv = 0;
        let ventasTotal = 0;

        const snapPrestamos = await getDocs(query(collection(db, 'prestamos'), where('estado', '==', 'activo')));
        const snapProductos = await getDocs(collection(db, 'productos'));
        const snapVentas = await getDocs(collection(db, 'ventas'));

        const filterFn = d => {
          if (isVendor) {
            const isOwner = d.userId === currentUser.uid;
            const matchesEmail = isLizz 
              ? (d.userEmail?.toLowerCase().includes('lizz') || d.vendedor?.toLowerCase().includes('lizz'))
              : (d.userEmail?.toLowerCase().includes('estefania') || d.vendedor?.toLowerCase().includes('estefania'));
            return isOwner || matchesEmail;
          } else {
            if (filtroVendedor === 'mio') {
              const belongsToVendor = 
                d.userEmail?.toLowerCase().includes('lizz') || 
                d.vendedor?.toLowerCase().includes('lizz') ||
                d.userEmail?.toLowerCase().includes('estefania') || 
                d.vendedor?.toLowerCase().includes('estefania');
              return d.userId === currentUser.uid || !belongsToVendor;
            } else if (filtroVendedor === 'lizz') {
              return d.userEmail?.toLowerCase().includes('lizz') || d.vendedor?.toLowerCase().includes('lizz');
            } else if (filtroVendedor === 'estefania') {
              return d.userEmail?.toLowerCase().includes('estefania') || d.vendedor?.toLowerCase().includes('estefania');
            } else {
              return true; // 'todos'
            }
          }
        };

        // 1. Préstamos
        snapPrestamos.forEach(doc => {
          const data = doc.data();
          if (filterFn(data)) {
            prestamosCount++;
            saldoTotal += Number(data.saldoPendiente || 0);
          }
        });

        // 2. Inventario
        snapProductos.forEach(doc => {
          const data = doc.data();
          if (filterFn(data)) {
            productosCount++;
            valorInv += Number(data.stock || 0) * Number(data.valorCompra || data.valorVenta || 0);
          }
        });

        // 3. Ventas
        snapVentas.forEach(doc => {
          const data = doc.data();
          if (filterFn(data)) {
            ventasTotal += Number(data.total || 0);
          }
        });

        setMetricas({
          prestamosActivos: prestamosCount,
          saldoPendienteTotal: saldoTotal,
          productosTotal: productosCount,
          valorInventario: valorInv,
          ventasTotal: ventasTotal
        });
      } catch (error) {
        console.error("Error obteniendo métricas: ", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchMetricas();
    }
  }, [currentUser, filtroVendedor]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-slate-500">Cargando métricas...</div>;
  }

  const emailLower = currentUser?.email?.toLowerCase() || '';
  const isLizz = emailLower.includes('lizz');
  const isEstefania = emailLower.includes('estefania');
  const isVendor = isLizz || isEstefania;

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 neon-text flex items-center gap-2">Panel General (Dashboard)</h2>
          {!isVendor && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-400 text-sm">Ver métricas de:</span>
              <select 
                value={filtroVendedor} 
                onChange={(e) => setFiltroVendedor(e.target.value)} 
                className="border border-transparent rounded-lg p-1.5 outline-none glass-panel text-slate-200 text-xs font-semibold"
              >
                <option value="mio">Mis Métricas (Mío)</option>
                <option value="lizz">Lizz</option>
                <option value="estefania">Estefanía</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card: Préstamos */}
        <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-indigo-900/50 text-indigo-400 rounded-lg neon-border">
            <Wallet size={24} />
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium">Préstamos Activos ({metricas.prestamosActivos})</h3>
            <p className="text-3xl font-bold text-indigo-300 mt-1 neon-text">${metricas.saldoPendienteTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Saldo pendiente en la calle</p>
          </div>
        </div>

        {/* Card: Inventario */}
        <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-emerald-900/50 text-emerald-400 rounded-lg border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Package size={24} />
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium">Productos en Stock ({metricas.productosTotal})</h3>
            <p className="text-3xl font-bold text-emerald-300 mt-1 neon-text-emerald">${metricas.valorInventario.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Valor estimado del inventario</p>
          </div>
        </div>

        {/* Card: Ventas */}
        <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-blue-900/50 text-blue-400 rounded-lg border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium">Ingresos por Ventas</h3>
            <p className="text-3xl font-bold text-blue-300 mt-1 text-shadow-[0_0_10px_rgba(59,130,246,0.8)]">${metricas.ventasTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Total histórico</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
