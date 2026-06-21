import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const Prestamos = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  // Modal de Abonos
  const [abonoModal, setAbonoModal] = useState({ show: false, prestamo: null, monto: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    clienteId: '',
    montoPrincipal: '',
    tasaInteres: '',
    frecuenciaCobro: 'mensual'
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
      await addDoc(collection(db, 'prestamos'), {
        clienteId: formData.clienteId,
        nombreCompleto: clienteSeleccionado.nombreCompleto,
        cedula: clienteSeleccionado.cedula,
        telefono: clienteSeleccionado.telefono,
        montoPrincipal: Number(formData.montoPrincipal),
        tasaInteres: Number(formData.tasaInteres),
        frecuenciaCobro: formData.frecuenciaCobro,
        fechaInicio: serverTimestamp(),
        estado: 'activo',
        saldoPendiente: Number(formData.montoPrincipal)
      });
      
      setFormData({ clienteId: '', montoPrincipal: '', tasaInteres: '', frecuenciaCobro: 'mensual' });
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

      // Actualizar préstamo
      const nuevoSaldo = p.saldoPendiente - monto;
      const estadoNuevo = nuevoSaldo <= 0 ? 'pagado' : 'activo';
      
      const prestamoRef = doc(db, 'prestamos', p.id);
      await updateDoc(prestamoRef, {
        saldoPendiente: nuevoSaldo,
        estado: estadoNuevo
      });

      setAbonoModal({ show: false, prestamo: null, monto: '' });
      fetchData();
      alert('¡Abono registrado con éxito!');
    } catch (error) {
      console.error("Error registrando abono:", error);
      alert('Error al registrar abono.');
    } finally {
      setLoading(false);
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Frecuencia de Cobro</label>
                <select name="frecuenciaCobro" value={formData.frecuenciaCobro} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none glass-panel">
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
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
              prestamos.map(p => (
                <tr key={p.id} className="border-b border-none hover:bg-transparent">
                  <td className="p-4 font-medium text-slate-100">{p.nombreCompleto} <br/><span className="text-xs text-slate-500">{p.cedula}</span></td>
                  <td className="p-4 text-slate-400">${p.montoPrincipal} <br/><span className="text-xs text-slate-500">{p.tasaInteres}% interés</span></td>
                  <td className="p-4 text-slate-400 capitalize">{p.frecuenciaCobro}</td>
                  <td className="p-4 text-indigo-600 font-bold">${p.saldoPendiente}</td>
                  <td className="p-4 flex flex-col gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold text-center w-fit ${p.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-transparent text-slate-300'}`}>
                      {p.estado}
                    </span>
                    {p.estado === 'activo' && (
                      <button onClick={() => setAbonoModal({show:true, prestamo: p, monto: ''})} className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold transition-colors w-fit">
                        💳 Abonar
                      </button>
                    )}
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

export default Prestamos;
