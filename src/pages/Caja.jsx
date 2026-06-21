import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DollarSign, TrendingDown, Wallet } from 'lucide-react';

const Caja = () => {
  const [gastos, setGastos] = useState([]);
  const [metricas, setMetricas] = useState({ totalIngresos: 0, totalGastos: 0, balance: 0 });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    concepto: '',
    monto: '',
    tipo: 'gasto', // puede ser 'gasto' o 'ingreso_extra'
  });

  useEffect(() => {
    // Calculamos el total de ventas y pagos de Firebase
    const fetchIngresos = async () => {
       try {
         // Sumamos ventas
         const snapVentas = await getDocs(collection(db, 'ventas'));
         let ingresosVentas = 0;
         snapVentas.forEach(doc => ingresosVentas += Number(doc.data().total || 0));
         
         // Sumamos pagos de préstamos
         const snapPagos = await getDocs(collection(db, 'pagos'));
         let ingresosPagos = 0;
         snapPagos.forEach(doc => ingresosPagos += Number(doc.data().montoAbonado || 0));

         const ingresosBase = ingresosVentas + ingresosPagos;

         // Escuchamos gastos
         const qGastos = query(collection(db, 'caja'), orderBy('fecha', 'desc'));
         onSnapshot(qGastos, (snapshot) => {
            const data = [];
            let totalGastos = 0;
            let totalIngresosExtras = 0;

            snapshot.forEach(doc => {
              const d = doc.data();
              data.push({ id: doc.id, ...d });
              if (d.tipo === 'gasto') totalGastos += Number(d.monto);
              if (d.tipo === 'ingreso_extra') totalIngresosExtras += Number(d.monto);
            });

            setGastos(data);
            const ingresosTotales = ingresosBase + totalIngresosExtras;
            setMetricas({
              totalIngresos: ingresosTotales,
              totalGastos: totalGastos,
              balance: ingresosTotales - totalGastos
            });
         });
       } catch (error) {
         console.error("Error cargando caja:", error);
       }
    };
    fetchIngresos();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'caja'), {
        concepto: formData.concepto,
        monto: Number(formData.monto),
        tipo: formData.tipo,
        fecha: serverTimestamp()
      });
      setFormData({ concepto: '', monto: '', tipo: 'gasto' });
      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert('Error guardando movimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-100">Caja y Finanzas</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showForm ? 'Cancelar' : 'Registrar Movimiento'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl mb-8">
          <form className="flex flex-col sm:flex-row gap-4 items-end" onSubmit={handleSubmit}>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-1">Concepto (Ej. Luz, Internet, Nómina)</label>
              <input required type="text" name="concepto" value={formData.concepto} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" style={{background: 'rgba(255,255,255,0.05)'}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Monto</label>
              <input required type="number" name="monto" value={formData.monto} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" style={{background: 'rgba(255,255,255,0.05)'}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Movimiento</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" style={{background: 'rgba(20,20,40,1)'}}>
                <option value="gasto">Salida (Gasto)</option>
                <option value="ingreso_extra">Entrada Extra</option>
              </select>
            </div>
            <button disabled={loading} type="submit" className="neon-button px-6 py-2.5 rounded-lg disabled:opacity-50">
              {loading ? '...' : 'Guardar'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
          <div className="p-4 bg-emerald-500/20 rounded-lg text-emerald-400">
            <DollarSign size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Ingresos Brutos (Ventas+Abonos)</p>
            <p className="text-2xl font-bold text-slate-200">${metricas.totalIngresos.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
          <div className="p-4 bg-rose-500/20 rounded-lg text-rose-400">
            <TrendingDown size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Gastos y Salidas Acumuladas</p>
            <p className="text-2xl font-bold text-slate-200">${metricas.totalGastos.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border border-indigo-500/30">
          <div className="p-4 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Wallet size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Balance Real Neto</p>
            <p className={`text-3xl font-bold ${metricas.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${metricas.balance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-none">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <h3 className="font-bold text-slate-200">Historial de Gastos y Movimientos Extras</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-sm font-semibold text-slate-400">Fecha</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Concepto</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Tipo</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Monto</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">No hay movimientos registrados.</td></tr>
            ) : (
              gastos.map(g => (
                <tr key={g.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-slate-400 text-sm">{g.fecha ? new Date(g.fecha.toDate()).toLocaleString() : 'Reciente'}</td>
                  <td className="p-4 font-medium text-slate-200">{g.concepto}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${g.tipo === 'gasto' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {g.tipo === 'gasto' ? 'SALIDA' : 'INGRESO EXTRA'}
                    </span>
                  </td>
                  <td className={`p-4 font-bold ${g.tipo === 'gasto' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ${g.monto.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Caja;
