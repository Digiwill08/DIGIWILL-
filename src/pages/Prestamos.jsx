import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';

const Prestamos = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  // Modal de Abonos
  const [abonoModal, setAbonoModal] = useState({ show: false, prestamo: null, monto: '' });
  
  // Modal Historial
  const [historialModal, setHistorialModal] = useState({ show: false, prestamo: null, pagos: [] });
  const [loadingPagos, setLoadingPagos] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    clienteId: '',
    montoPrincipal: '',
    tasaInteres: '',
    frecuenciaCobro: 'mensual',
    numeroCuotas: ''
  });

  const fetchData = async () => {
    try {
      // Cargar préstamos
      const qPrestamos = query(collection(db, 'prestamos'), orderBy('fechaInicio', 'desc'));
      const snapPrestamos = await getDocs(qPrestamos);
      setPrestamos(snapPrestamos.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Cargar clientes para el select
      const qClientes = query(collection(db, 'clientes'), orderBy('nombreCompleto', 'asc'));
      const snapClientes = await getDocs(qClientes);
      setClientes(snapClientes.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error cargando datos: ", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clienteId) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    
    setLoading(true);
    const clienteSeleccionado = clientes.find(c => c.id === formData.clienteId);
    
    try {
      const montoP = Number(formData.montoPrincipal);
      const tasaI = Number(formData.tasaInteres);
      const numeroCuotasNum = Number(formData.numeroCuotas);
      const totalConInteres = montoP + (montoP * (tasaI / 100));

      const cuotasList = [];
      const montoCuota = totalConInteres / numeroCuotasNum;
      let currentFecha = new Date();
      for (let i = 1; i <= numeroCuotasNum; i++) {
        if (formData.frecuenciaCobro === 'diario') currentFecha.setDate(currentFecha.getDate() + 1);
        else if (formData.frecuenciaCobro === 'semanal') currentFecha.setDate(currentFecha.getDate() + 7);
        else if (formData.frecuenciaCobro === 'quincenal') currentFecha.setDate(currentFecha.getDate() + 15);
        else if (formData.frecuenciaCobro === 'mensual') currentFecha.setMonth(currentFecha.getMonth() + 1);
        
        cuotasList.push({
          numero: i,
          monto: montoCuota,
          saldo: montoCuota,
          fechaVencimiento: new Date(currentFecha.getTime()),
          estado: 'pendiente'
        });
      }

      await addDoc(collection(db, 'prestamos'), {
        clienteId: formData.clienteId,
        nombreCompleto: clienteSeleccionado.nombreCompleto,
        cedula: clienteSeleccionado.cedula,
        telefono: clienteSeleccionado.telefono,
        montoPrincipal: montoP,
        tasaInteres: tasaI,
        frecuenciaCobro: formData.frecuenciaCobro,
        numeroCuotas: numeroCuotasNum,
        cuotas: cuotasList,
        fechaInicio: serverTimestamp(),
        estado: 'activo',
        saldoPendiente: totalConInteres,
        totalInicial: totalConInteres
      });
      
      setFormData({ clienteId: '', montoPrincipal: '', tasaInteres: '', frecuenciaCobro: 'mensual', numeroCuotas: '' });
      setShowForm(false);
      fetchData();
      alert('Préstamo registrado con éxito!');
    } catch (error) {
      console.error("Error al guardar: ", error);
      alert('Hubo un error al guardar. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  };

  const handleAbonar = async (e) => {
    e.preventDefault();
    setLoading(true);
    const monto = Number(abonoModal.monto);
    const p = abonoModal.prestamo;
    
    if(monto <= 0 || monto > p.saldoPendiente) {
      alert('Monto inválido. No puede ser mayor al saldo pendiente.');
      setLoading(false);
      return;
    }

    try {
      // Registrar pago
      await addDoc(collection(db, 'pagos'), {
        prestamoId: p.id,
        montoAbonado: monto,
        fechaPago: serverTimestamp()
      });

      // Actualizar cuotas si existen
      let montoRestante = monto;
      let nuevasCuotas = p.cuotas ? [...p.cuotas] : [];
      
      if (nuevasCuotas.length > 0) {
        for (let i = 0; i < nuevasCuotas.length; i++) {
          if (nuevasCuotas[i].estado === 'pendiente' && montoRestante > 0) {
            if (montoRestante >= nuevasCuotas[i].saldo) {
              montoRestante -= nuevasCuotas[i].saldo;
              nuevasCuotas[i].saldo = 0;
              nuevasCuotas[i].estado = 'pagado';
            } else {
              nuevasCuotas[i].saldo -= montoRestante;
              montoRestante = 0;
            }
          }
        }
      }

      // Actualizar préstamo
      const nuevoSaldo = p.saldoPendiente - monto;
      const estadoNuevo = nuevoSaldo <= 0 ? 'pagado' : 'activo';
      
      const prestamoRef = doc(db, 'prestamos', p.id);
      await updateDoc(prestamoRef, {
        saldoPendiente: nuevoSaldo,
        estado: estadoNuevo,
        cuotas: nuevasCuotas
      });

      setAbonoModal({ show: false, prestamo: null, monto: '' });
      fetchData();
      alert('¡Abono registrado con éxito!');
    } catch (error) {
      console.error("Error registrando abono:", error);
      alert('Error al registrar abono.');
    } finally {
      setLoadingPagos(false);
      setLoading(false);
    }
  };

  const handleVerHistorial = async (prestamo) => {
    setHistorialModal({ show: true, prestamo, pagos: [] });
    setLoadingPagos(true);
    try {
      const qPagos = query(collection(db, 'pagos'), where('prestamoId', '==', prestamo.id));
      const snapPagos = await getDocs(qPagos);
      const pagosPrestamo = snapPagos.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.fechaPago?.toMillis() || 0) - (a.fechaPago?.toMillis() || 0));
      
      setHistorialModal({ show: true, prestamo, pagos: pagosPrestamo });
    } catch (error) {
      console.error("Error cargando historial", error);
      alert('Error cargando historial de pagos.');
    } finally {
      setLoadingPagos(false);
    }
  };

  return (
    <div className="p-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-100">Préstamos WILL</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showForm ? 'Cancelar' : 'Nuevo Préstamo'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl  border border-none mb-8">
          <h3 className="text-xl font-semibold mb-4">Registro de Préstamo</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Seleccionar Cliente</label>
                <select required name="clienteId" value={formData.clienteId} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none glass-panel">
                  <option value="">-- Elige un cliente de la base de datos --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombreCompleto} (C.C: {c.cedula})</option>
                  ))}
                </select>
                {clientes.length === 0 && <p className="text-xs text-orange-500 mt-1">No tienes clientes registrados. Ve a la sección "Clientes" primero.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor del Préstamo</label>
                <input required type="number" name="montoPrincipal" value={formData.montoPrincipal} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tasa de Interés (%)</label>
                <input required type="number" name="tasaInteres" value={formData.tasaInteres} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Frecuencia de Cobro</label>
                  <select name="frecuenciaCobro" value={formData.frecuenciaCobro} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none glass-panel">
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Número de Cuotas</label>
                  <input required type="number" min="1" name="numeroCuotas" value={formData.numeroCuotas} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="pt-4">
              <button disabled={loading || clientes.length === 0} type="submit" className="neon-button w-full sm:w-auto disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar Préstamo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Abono */}
      {abonoModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel p-6 rounded-xl shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Registrar Abono</h3>
            <p className="text-sm text-slate-400 mb-4">Cliente: {abonoModal.prestamo.nombreCompleto}<br/>Saldo Actual: <span className="font-bold text-indigo-600">${abonoModal.prestamo.saldoPendiente}</span></p>
            <form onSubmit={handleAbonar}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">Monto a abonar</label>
                <input required type="number" max={abonoModal.prestamo.saldoPendiente} value={abonoModal.monto} onChange={(e) => setAbonoModal({...abonoModal, monto: e.target.value})} className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAbonoModal({show:false, prestamo:null, monto:''})} className="px-4 py-2 text-slate-400 hover:bg-transparent rounded-lg font-medium">Cancelar</button>
                <button type="submit" disabled={loading} className="px-4 py-2 neon-button w-full sm:w-auto disabled:opacity-50">Confirmar Abono</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {historialModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel p-6 rounded-xl shadow-lg max-w-md w-full max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold mb-2">Historial de Pagos</h3>
            <p className="text-sm text-slate-400 mb-4">Cliente: {historialModal.prestamo?.nombreCompleto}</p>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {loadingPagos ? (
                <p className="text-center text-slate-500 my-4">Cargando...</p>
              ) : historialModal.pagos.length === 0 ? (
                <p className="text-center text-slate-500 my-4">No hay abonos registrados.</p>
              ) : (
                <ul className="space-y-3">
                  {historialModal.pagos.map(pago => (
                    <li key={pago.id} className="glass-panel p-3 rounded-lg border border-none flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-200">Abono</p>
                        <p className="text-xs text-slate-400">
                          {pago.fechaPago ? new Date(pago.fechaPago.toDate()).toLocaleString() : 'Reciente'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-500">+${pago.montoAbonado}</span>
                        <a 
                          href={`https://wa.me/?text=${encodeURIComponent(`🧾 DIGIWILL - Recibo de Abono\nCliente: ${historialModal.prestamo?.nombreCompleto}\nFecha: ${pago.fechaPago ? new Date(pago.fechaPago.toDate()).toLocaleString() : 'Hoy'}\nMonto Abonado: $${pago.montoAbonado}\nSaldo Restante: $${historialModal.prestamo?.saldoPendiente}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg transition-colors text-xs font-semibold"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-transparent text-right">
              <button type="button" onClick={() => setHistorialModal({show:false, prestamo:null, pagos:[]})} className="px-4 py-2 text-slate-400 hover:bg-transparent rounded-lg font-medium">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-xl  border border-none overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-transparent border-b border-none">
              <th className="p-4 text-sm font-semibold text-slate-400">Cliente</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Monto</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Frecuencia</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Saldo Pendiente</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No hay préstamos registrados</td>
              </tr>
            ) : (
              prestamos.map(p => {
                let enMora = false;
                if (p.estado === 'activo' && p.cuotas) {
                   const cuotasPendientes = p.cuotas.filter(c => c.estado === 'pendiente');
                   if (cuotasPendientes.length > 0) {
                     const firstPending = cuotasPendientes[0];
                     // Comparar asumiendo Timestamp
                     if (firstPending.fechaVencimiento && (firstPending.fechaVencimiento.toDate ? firstPending.fechaVencimiento.toDate() : new Date(firstPending.fechaVencimiento)) < new Date()) {
                       enMora = true;
                     }
                   }
                }
                const estadoVisual = enMora ? 'MORA' : p.estado;
                const estadoColor = enMora ? 'bg-red-500/20 text-red-500 border border-red-500/50' : (p.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-transparent text-slate-300');

                return (
                <tr key={p.id} className="border-b border-none hover:bg-transparent">
                  <td className="p-4 font-medium text-slate-100">{p.nombreCompleto} <br/><span className="text-xs text-slate-500">{p.cedula}</span></td>
                  <td className="p-4 text-slate-400">${p.montoPrincipal} <br/><span className="text-xs text-slate-500">{p.tasaInteres}% interés</span></td>
                  <td className="p-4 text-slate-400 capitalize">{p.frecuenciaCobro} {p.numeroCuotas && `(${p.numeroCuotas} cuotas)`}</td>
                  <td className="p-4 text-indigo-600 font-bold">${p.saldoPendiente}</td>
                  <td className="p-4 flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-center w-fit uppercase ${estadoColor}`}>
                      {estadoVisual}
                    </span>
                    {p.estado === 'activo' && (
                      <button onClick={() => setAbonoModal({show:true, prestamo: p, monto: ''})} className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold transition-colors w-fit">
                        💳 Abonar
                      </button>
                    )}
                    <button onClick={() => handleVerHistorial(p)} className="text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg font-semibold transition-colors w-fit">
                      📋 Ver Pagos
                    </button>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Prestamos;
