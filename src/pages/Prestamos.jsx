import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Prestamos = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  
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
    frecuenciaCobro: 'mensual'
  });

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const emailLower = currentUser.email?.toLowerCase() || '';
      const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
      const isEstefania = emailLower.includes('estefania');
      const isVendor = isLizz || isEstefania;

      let prestamosData = [];
      let clientesData = [];

      if (isVendor) {
        // Vendedoras: Consultar de forma segura usando cláusulas 'where' para cumplir las reglas de Firestore
        const qP1 = query(collection(db, 'prestamos'), where('created_by', '==', currentUser.uid));
        const qP2 = query(collection(db, 'prestamos'), where('userId', '==', currentUser.uid));
        const qP3 = query(collection(db, 'prestamos'), where('vendedor', '==', currentUser.email));

        const qC1 = query(collection(db, 'clientes'), where('created_by', '==', currentUser.uid));
        const qC2 = query(collection(db, 'clientes'), where('userId', '==', currentUser.uid));
        const qC3 = query(collection(db, 'clientes'), where('vendedor', '==', currentUser.email));

        const [snapP1, snapP2, snapP3, snapC1, snapC2, snapC3] = await Promise.all([
          getDocs(qP1), getDocs(qP2), getDocs(qP3),
          getDocs(qC1), getDocs(qC2), getDocs(qC3)
        ]);

        const mapP = new Map();
        snapP1.docs.forEach(doc => mapP.set(doc.id, { id: doc.id, ...doc.data() }));
        snapP2.docs.forEach(doc => mapP.set(doc.id, { id: doc.id, ...doc.data() }));
        snapP3.docs.forEach(doc => mapP.set(doc.id, { id: doc.id, ...doc.data() }));
        prestamosData = Array.from(mapP.values());

        const mapC = new Map();
        snapC1.docs.forEach(doc => mapC.set(doc.id, { id: doc.id, ...doc.data() }));
        snapC2.docs.forEach(doc => mapC.set(doc.id, { id: doc.id, ...doc.data() }));
        snapC3.docs.forEach(doc => mapC.set(doc.id, { id: doc.id, ...doc.data() }));
        clientesData = Array.from(mapC.values());
      } else {
        // Administrador: Puede consultar la colección completa sin problemas
        const [snapPrestamos, snapClientes] = await Promise.all([
          getDocs(collection(db, 'prestamos')),
          getDocs(collection(db, 'clientes'))
        ]);
        const allPrestamos = snapPrestamos.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allClientes = snapClientes.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filterFn = d => {
          if (activeTab === 'mio') {
            const belongsToVendor = 
              d.userEmail?.toLowerCase().includes('liz') || 
              d.userEmail?.toLowerCase().includes('vendedor1') ||
              d.vendedor?.toLowerCase().includes('liz') ||
              d.vendedor?.toLowerCase().includes('vendedor1') ||
              d.userEmail?.toLowerCase().includes('estefania') || 
              d.vendedor?.toLowerCase().includes('estefania');
            return d.created_by === currentUser.uid || d.userId === currentUser.uid || !belongsToVendor;
          } else if (activeTab === 'lizz') {
            return d.userEmail?.toLowerCase().includes('liz') || d.userEmail?.toLowerCase().includes('vendedor1') || d.vendedor?.toLowerCase().includes('liz') || d.vendedor?.toLowerCase().includes('vendedor1');
          } else if (activeTab === 'estefania') {
            return d.userEmail?.toLowerCase().includes('estefania') || d.vendedor?.toLowerCase().includes('estefania');
          }
          return false;
        };

        prestamosData = allPrestamos.filter(filterFn);
        clientesData = allClientes.filter(filterFn);
      }

      // Ordenar en memoria
      prestamosData.sort((a, b) => {
        const tA = a.fechaInicio?.toMillis ? a.fechaInicio.toMillis() : (a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0);
        const tB = b.fechaInicio?.toMillis ? b.fechaInicio.toMillis() : (b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0);
        return tB - tA;
      });

      clientesData.sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || ''));

      setPrestamos(prestamosData);
      setClientes(clientesData);
    } catch (error) {
      console.error("Error cargando datos: ", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, activeTab]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!formData.clienteId) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    
    setLoading(true);
    const clienteSeleccionado = clientes.find(c => c.id === formData.clienteId);
    
    try {
      const montoP = Number(formData.montoPrincipal);
      const tasaI = Number(formData.tasaInteres);
      const totalConInteres = montoP + (montoP * (tasaI / 100));

      await addDoc(collection(db, 'prestamos'), {
        clienteId: formData.clienteId,
        nombreCompleto: clienteSeleccionado.nombreCompleto,
        cedula: clienteSeleccionado.cedula,
        telefono: clienteSeleccionado.telefono,
        montoPrincipal: montoP,
        tasaInteres: tasaI,
        frecuenciaCobro: formData.frecuenciaCobro,
        fechaInicio: serverTimestamp(),
        estado: 'activo',
        saldoPendiente: totalConInteres,
        totalInicial: totalConInteres,
        created_by: currentUser.uid, // Campo de auditoría obligatorio
        userId: currentUser.uid,      // Compatibilidad legacy
        userEmail: currentUser.email   // Compatibilidad legacy
      });
      
      setFormData({ clienteId: '', montoPrincipal: '', tasaInteres: '', frecuenciaCobro: 'mensual' });
      setShowForm(false);
      fetchData();
      alert('Préstamo registrado con éxito!');
    } catch (error) {
      console.error("Error al guardar: ", error);
      alert('Hubo un error al guardar. Revisa la consola o las reglas de base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAbonar = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
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
        fechaPago: serverTimestamp(),
        created_by: currentUser.uid, // Campo de auditoría obligatorio
        userId: currentUser.uid,      // Compatibilidad legacy
        userEmail: currentUser.email   // Compatibilidad legacy
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

  const emailLower = currentUser?.email?.toLowerCase() || '';
  const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
  const isEstefania = emailLower.includes('estefania');
  const isVendor = isLizz || isEstefania;

  return (
    <div className="p-8 relative">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Préstamos WILL</h2>
          {!isVendor && (
            <div className="flex border-b border-indigo-900/50 mt-4 gap-2">
              <button
                onClick={() => setActiveTab('mio')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'mio' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Mis Préstamos
              </button>
              <button
                onClick={() => setActiveTab('lizz')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'lizz' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Gestión Liz
              </button>
              <button
                onClick={() => setActiveTab('estefania')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'estefania' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Gestión Estefanía
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors self-start sm:self-auto"
        >
          {showForm ? 'Cancelar' : 'Nuevo Préstamo'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl border border-none mb-8">
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
                      <span className="font-bold text-emerald-500">+${pago.montoAbonado}</span>
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

      <div className="glass-panel rounded-xl border border-none overflow-hidden overflow-x-auto">
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
                  <td className="p-4 flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold text-center w-fit ${p.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-transparent text-slate-300'}`}>
                      {p.estado}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Prestamos;
