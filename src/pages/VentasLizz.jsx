import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingCart, Users, Package } from 'lucide-react';

const getDocsFast = (queryRef) => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(queryRef, (snapshot) => { resolve(snapshot); unsubscribe(); }, (error) => { reject(error); });
  });
};

const VentasLizz = () => {
  const [metricas, setMetricas] = useState({ totalVentas: 0, totalClientes: 0, totalProductos: 0 });
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapVentas = await getDocsFast(collection(db, 'ventas'));
        const snapClientes = await getDocsFast(collection(db, 'clientes'));
        const snapProductos = await getDocsFast(collection(db, 'productos'));

        let vData = [];
        let totalV = 0;
        snapVentas.forEach(doc => {
          const d = doc.data();
          if (d.vendedor === 'vendedor1@digiwill.com') {
            vData.push({ id: doc.id, ...d });
            totalV += Number(d.total || 0);
          }
        });
        
        let cCount = 0;
        snapClientes.forEach(doc => {
          if (doc.data().vendedor === 'vendedor1@digiwill.com') cCount++;
        });

        let pCount = 0;
        snapProductos.forEach(doc => {
          if (doc.data().vendedor === 'vendedor1@digiwill.com') pCount++;
        });

        // Ordenar ventas por fecha descendente
        vData.sort((a, b) => (b.fechaVenta?.toMillis() || 0) - (a.fechaVenta?.toMillis() || 0));

        setVentas(vData);
        setMetricas({ totalVentas: totalV, totalClientes: cCount, totalProductos: pCount });
      } catch (error) {
        console.error("Error", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-fuchsia-400 mb-6 neon-text tracking-wider">Auditoría: Lizz</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
          <div className="p-4 bg-fuchsia-500/20 rounded-lg text-fuchsia-400">
            <ShoppingCart size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Recaudo Total Lizz</p>
            <p className="text-3xl font-bold text-slate-100">${metricas.totalVentas.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
          <div className="p-4 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Users size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Clientes Captados</p>
            <p className="text-3xl font-bold text-slate-100">{metricas.totalClientes}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
          <div className="p-4 bg-blue-500/20 rounded-lg text-blue-400">
            <Package size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Productos Registrados</p>
            <p className="text-3xl font-bold text-slate-100">{metricas.totalProductos}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-none">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <h3 className="font-bold text-slate-200">Historial de Operaciones (Lizz)</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-sm font-semibold text-slate-400">Fecha</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Cliente</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Artículos Vendidos</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Total Venta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="4" className="p-8 text-center text-slate-400">Cargando actividad de Lizz...</td></tr> : ventas.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">Lizz no ha registrado ventas aún.</td></tr>
            ) : (
              ventas.map(v => {
                const dateStr = v.fechaVenta ? new Date(v.fechaVenta.toDate()).toLocaleString() : 'Reciente';
                return (
                  <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-slate-400 text-sm">{dateStr}</td>
                    <td className="p-4 font-medium text-slate-200">{v.clienteNombre}</td>
                    <td className="p-4 text-slate-400 text-sm">
                      {v.detalles?.map((d, i) => <div key={i}>{d.cantidad}x {d.nombre}</div>)}
                    </td>
                    <td className="p-4 text-emerald-400 font-bold">${v.total.toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VentasLizz;
