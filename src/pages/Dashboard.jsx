import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Wallet, Package, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [metricas, setMetricas] = useState({
    prestamosActivos: 0,
    saldoPendienteTotal: 0,
    productosTotal: 0,
    valorInventario: 0,
    ventasTotal: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetricas = async () => {
      try {
        // 1. Préstamos Activos
        const qPrestamos = query(collection(db, 'prestamos'), where('estado', '==', 'activo'));
        const snapPrestamos = await getDocs(qPrestamos);
        let prestamosCount = 0;
        let saldoTotal = 0;
        snapPrestamos.forEach(doc => {
          prestamosCount++;
          saldoTotal += Number(doc.data().saldoPendiente || 0);
        });

        // 2. Inventario
        const snapProductos = await getDocs(collection(db, 'productos'));
        let productosCount = 0;
        let valorInv = 0;
        snapProductos.forEach(doc => {
          productosCount++;
          const data = doc.data();
          valorInv += Number(data.stock || 0) * Number(data.costo || data.precio || 0);
        });

        // 3. Ventas (Todas para simplificar por ahora, idealmente filtrar por mes actual)
        const snapVentas = await getDocs(collection(db, 'ventas'));
        let ventasTotal = 0;
        snapVentas.forEach(doc => {
          ventasTotal += Number(doc.data().total || 0);
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

    fetchMetricas();
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-slate-500">Cargando métricas...</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-slate-100 mb-6 neon-text flex items-center gap-2">Panel General (Dashboard)</h2>
      
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
