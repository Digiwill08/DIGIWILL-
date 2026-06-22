import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Coins, ClipboardCheck, AlertTriangle, Clock, ArrowRightLeft, Shield, CheckCircle, XCircle } from 'lucide-react';
import { logActivity } from '../utils/auditLogger';

const Caja = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania', 'auditoria'
  
  // Totales de hoy
  const [ventasHoy, setVentasHoy] = useState(0);
  const [abonosHoy, setAbonosHoy] = useState(0);
  const [gastosHoy, setGastosHoy] = useState(0);
  
  // Declaración del cierre
  const [efectivoFisico, setEfectivoFisico] = useState('');
  const [notaCierre, setNotaCierre] = useState('');
  
  // Historiales
  const [cierres, setCierres] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminNote, setAdminNote] = useState({}); // { [cierreId]: 'nota' }

  // Filtro de búsqueda para logs
  const [logFilter, setLogFilter] = useState('');

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const emailLower = currentUser?.email?.toLowerCase() || '';
  const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
  const isEstefania = emailLower.includes('estefania');
  const isVendor = isLizz || isEstefania;

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      // 1. Obtener Ventas, Pagos (Abonos) y Gastos de hoy
      let queryVentas, queryPagos, queryGastos;

      if (isVendor) {
        // Scoped para asesoras
        queryVentas = query(collection(db, 'ventas'), where('created_by', '==', currentUser.uid));
        queryPagos = query(collection(db, 'pagos'), where('created_by', '==', currentUser.uid));
        queryGastos = query(collection(db, 'gastos'), where('created_by', '==', currentUser.uid));
      } else {
        // Admin
        queryVentas = collection(db, 'ventas');
        queryPagos = collection(db, 'pagos');
        queryGastos = collection(db, 'gastos');
      }

      const [snapVentas, snapPagos, snapGastos] = await Promise.all([
        getDocs(queryVentas),
        getDocs(queryPagos),
        getDocs(queryGastos)
      ]);

      // Filtrar y sumar solo transacciones de hoy
      let tVentas = 0;
      snapVentas.docs.forEach(d => {
        const val = d.data();
        if (isToday(val.fechaVenta) && val.tipoVenta === 'contado') {
          // Filtrar por administrador si activeTab es específico
          if (!isVendor) {
            if (activeTab === 'lizz' && !(val.userEmail?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('vendedor1') || val.vendedor?.toLowerCase().includes('liz') || val.vendedor?.toLowerCase().includes('vendedor1'))) return;
            if (activeTab === 'estefania' && !(val.userEmail?.toLowerCase().includes('estefania') || val.vendedor?.toLowerCase().includes('estefania'))) return;
            if (activeTab === 'mio' && (val.userEmail?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('vendedor1') || val.vendedor?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('estefania') || val.vendedor?.toLowerCase().includes('estefania'))) return;
          }
          tVentas += Number(val.total || 0);
        }
      });

      let tAbonos = 0;
      snapPagos.docs.forEach(d => {
        const val = d.data();
        if (isToday(val.fechaPago)) {
          if (!isVendor) {
            if (activeTab === 'lizz' && !(val.userEmail?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('vendedor1') || val.vendedor?.toLowerCase().includes('liz') || val.vendedor?.toLowerCase().includes('vendedor1'))) return;
            if (activeTab === 'estefania' && !(val.userEmail?.toLowerCase().includes('estefania') || val.vendedor?.toLowerCase().includes('estefania'))) return;
            if (activeTab === 'mio' && (val.userEmail?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('vendedor1') || val.vendedor?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('estefania') || val.vendedor?.toLowerCase().includes('estefania'))) return;
          }
          tAbonos += Number(val.montoAbonado || 0);
        }
      });

      let tGastos = 0;
      snapGastos.docs.forEach(d => {
        const val = d.data();
        if (isToday(val.fechaCreacion)) {
          if (!isVendor) {
            if (activeTab === 'lizz' && !(val.userEmail?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('vendedor1') || val.vendedor?.toLowerCase().includes('liz') || val.vendedor?.toLowerCase().includes('vendedor1'))) return;
            if (activeTab === 'estefania' && !(val.userEmail?.toLowerCase().includes('estefania') || val.vendedor?.toLowerCase().includes('estefania'))) return;
            if (activeTab === 'mio' && (val.userEmail?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('vendedor1') || val.vendedor?.toLowerCase().includes('liz') || val.userEmail?.toLowerCase().includes('estefania') || val.vendedor?.toLowerCase().includes('estefania'))) return;
          }
          tGastos += Number(val.monto || 0);
        }
      });

      setVentasHoy(tVentas);
      setAbonosHoy(tAbonos);
      setGastosHoy(tGastos);

      // 2. Obtener Cierres de caja
      let queryCierres;
      if (isVendor) {
        queryCierres = query(collection(db, 'cierres_caja'), where('created_by', '==', currentUser.uid));
      } else {
        queryCierres = collection(db, 'cierres_caja');
      }

      const snapCierres = await getDocs(queryCierres);
      let listCierres = snapCierres.docs.map(d => ({ id: d.id, ...d.data() }));

      if (!isVendor) {
        listCierres = listCierres.filter(c => {
          if (activeTab === 'mio') {
            const belongsToVendor = 
              c.userEmail?.toLowerCase().includes('liz') || 
              c.userEmail?.toLowerCase().includes('vendedor1') ||
              c.userEmail?.toLowerCase().includes('estefania');
            return c.created_by === currentUser.uid || !belongsToVendor;
          } else if (activeTab === 'lizz') {
            return c.userEmail?.toLowerCase().includes('liz') || c.userEmail?.toLowerCase().includes('vendedor1');
          } else if (activeTab === 'estefania') {
            return c.userEmail?.toLowerCase().includes('estefania');
          }
          return false;
        });
      }

      listCierres.sort((a, b) => {
        const tA = a.fecha?.toMillis ? a.fecha.toMillis() : (a.fecha ? new Date(a.fecha).getTime() : 0);
        const tB = b.fecha?.toMillis ? b.fecha.toMillis() : (b.fecha ? new Date(b.fecha).getTime() : 0);
        return tB - tA;
      });
      setCierres(listCierres);

      // 3. Si es Admin y pestaña es auditoría, obtener logs
      if (!isVendor && activeTab === 'auditoria') {
        const snapLogs = await getDocs(collection(db, 'auditoria_logs'));
        const listLogs = snapLogs.docs.map(d => ({ id: d.id, ...d.data() }));
        listLogs.sort((a, b) => {
          const tA = a.fecha?.toMillis ? a.fecha.toMillis() : (a.fecha ? new Date(a.fecha).getTime() : 0);
          const tB = b.fecha?.toMillis ? b.fecha.toMillis() : (b.fecha ? new Date(b.fecha).getTime() : 0);
          return tB - tA;
        });
        setAuditLogs(listLogs);
      }

    } catch (error) {
      console.error("Error al cargar datos de Caja:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, activeTab]);

  const esperadoHoy = ventasHoy + abonosHoy - gastosHoy;

  const handleSubmitCierre = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (efectivoFisico === '') return alert('Por favor ingresa el efectivo físico.');

    setLoading(true);
    try {
      const fisico = Number(efectivoFisico);
      const dif = fisico - esperadoHoy;

      const docRef = await addDoc(collection(db, 'cierres_caja'), {
        fecha: serverTimestamp(),
        created_by: currentUser.uid,
        userEmail: currentUser.email,
        efectivoFisico: fisico,
        efectivoEsperado: esperadoHoy,
        diferencia: dif,
        ventasContado: ventasHoy,
        abonosRecibidos: abonosHoy,
        gastosRealizados: gastosHoy,
        estado: 'pendiente_revision',
        nota: notaCierre,
        comentarioAdmin: ''
      });

      // Registrar Auditoría
      await logActivity(
        currentUser,
        'declaracion_caja',
        `Declaró cierre de caja. Esperado: $${esperadoHoy}, Físico: $${fisico}, Diferencia: $${dif}. Nota: ${notaCierre}`,
        'cierres_caja',
        docRef.id
      );

      setEfectivoFisico('');
      setNotaCierre('');
      fetchData();
      alert('Cierre de caja registrado con éxito y enviado para revisión.');
    } catch (error) {
      console.error("Error al registrar cierre de caja:", error);
      alert('Error al registrar el cierre.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCierre = async (cierre, nuevoEstado) => {
    if (!currentUser) return;
    const comentario = adminNote[cierre.id] || '';
    setLoading(true);
    try {
      const ref = doc(db, 'cierres_caja', cierre.id);
      await updateDoc(ref, {
        estado: nuevoEstado,
        comentarioAdmin: comentario
      });

      // Auditoría
      await logActivity(
        currentUser,
        nuevoEstado === 'aprobado' ? 'aprobacion_caja' : 'rechazo_caja',
        `Revisó el cierre de caja de ${cierre.userEmail}. Estado: ${nuevoEstado.toUpperCase()}. Comentario: ${comentario}`,
        'cierres_caja',
        cierre.id
      );

      setAdminNote({ ...adminNote, [cierre.id]: '' });
      fetchData();
      alert(`Cierre de caja ${nuevoEstado} correctamente.`);
    } catch (error) {
      console.error("Error al revisar cierre de caja:", error);
      alert('Error al actualizar revisión.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const term = logFilter.toLowerCase();
    return (
      (log.userEmail || '').toLowerCase().includes(term) ||
      (log.accion || '').toLowerCase().includes(term) ||
      (log.detalles || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Coins className="text-indigo-400" size={32} />
            Caja y Cierre Diario
          </h2>
          
          {!isVendor && (
            <div className="flex border-b border-indigo-900/50 mt-4 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('mio')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'mio' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Mi Caja
              </button>
              <button
                onClick={() => setActiveTab('lizz')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'lizz' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Cierres Liz
              </button>
              <button
                onClick={() => setActiveTab('estefania')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'estefania' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Cierres Estefanía
              </button>
              <button
                onClick={() => setActiveTab('auditoria')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'auditoria' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Bitácora de Auditoría
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab !== 'auditoria' ? (
        <>
          {/* Métricas de hoy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass-panel p-5 rounded-xl border border-none">
              <span className="text-slate-400 text-sm font-semibold">Ventas de Contado (Hoy)</span>
              <p className="text-2xl font-bold text-emerald-400 mt-2">+${ventasHoy.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-none">
              <span className="text-slate-400 text-sm font-semibold">Abonos de Préstamos (Hoy)</span>
              <p className="text-2xl font-bold text-emerald-400 mt-2">+${abonosHoy.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-none">
              <span className="text-slate-400 text-sm font-semibold">Gastos / Egresos (Hoy)</span>
              <p className="text-2xl font-bold text-rose-400 mt-2">-${gastosHoy.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-none bg-gradient-to-br from-indigo-950/40 to-slate-900/60 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20">
              <span className="text-indigo-300 text-sm font-semibold">Efectivo Esperado (Hoy)</span>
              <p className="text-2xl font-bold text-slate-100 mt-2">${esperadoHoy.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Formulario de Cierre (Solo para asesora o admin en su pestaña propia) */}
            {(isVendor || activeTab === 'mio') && (
              <div className="w-full lg:w-1/3 space-y-6">
                <div className="glass-panel p-6 rounded-xl border border-none">
                  <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <ClipboardCheck className="text-emerald-400" size={22} />
                    Declarar Caja del Día
                  </h3>
                  <form onSubmit={handleSubmitCierre} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Efectivo Físico en Caja ($)</label>
                      <input 
                        required 
                        type="number" 
                        value={efectivoFisico} 
                        onChange={(e) => setEfectivoFisico(e.target.value)} 
                        className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" 
                        placeholder="Ingresa la cantidad física" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Novedad / Observación (Opcional)</label>
                      <textarea 
                        value={notaCierre} 
                        onChange={(e) => setNotaCierre(e.target.value)} 
                        className="w-full border border-transparent rounded-lg p-2.5 outline-none glass-panel focus:ring-2 focus:ring-emerald-500 h-20 resize-none" 
                        placeholder="Ej. Faltaron $500 pesos de vuelto." 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full neon-button-emerald disabled:opacity-50 font-bold"
                    >
                      {loading ? 'Guardando...' : 'Realizar Cierre de Caja'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Listado de cierres pasados */}
            <div className="flex-1">
              <div className="glass-panel rounded-xl border border-none overflow-hidden overflow-x-auto">
                <div className="p-4 border-b bg-transparent flex justify-between items-center">
                  <h3 className="font-bold text-slate-300">Cierres de Caja Anteriores</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-none">
                      <th className="p-4 text-sm font-semibold text-slate-400">Fecha</th>
                      {!isVendor && activeTab !== 'mio' && <th className="p-4 text-sm font-semibold text-slate-400">Usuario</th>}
                      <th className="p-4 text-sm font-semibold text-slate-400">Detalle Caja</th>
                      <th className="p-4 text-sm font-semibold text-slate-400">Diferencia</th>
                      <th className="p-4 text-sm font-semibold text-slate-400">Estado / Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierres.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay cierres declarados</td></tr>
                    ) : (
                      cierres.map(c => {
                        const dateStr = c.fecha ? new Date(c.fecha.toDate()).toLocaleDateString() : 'Reciente';
                        const timeStr = c.fecha ? new Date(c.fecha.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        
                        return (
                          <tr key={c.id} className="border-b border-none hover:bg-transparent">
                            <td className="p-4 text-slate-300 text-sm">
                              <span className="font-semibold">{dateStr}</span> <br/>
                              <span className="text-xs text-slate-500">{timeStr}</span>
                            </td>
                            {!isVendor && activeTab !== 'mio' && <td className="p-4 text-slate-300 text-sm font-medium">{c.userEmail}</td>}
                            <td className="p-4 text-sm text-slate-400">
                              <span>Esperado: <strong>${c.efectivoEsperado}</strong></span> <br />
                              <span>Declarado: <strong>${c.efectivoFisico}</strong></span>
                              {c.nota && (
                                <p className="text-xs text-orange-400/80 italic mt-1 font-medium">Nota: "{c.nota}"</p>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${c.diferencia === 0 ? 'bg-emerald-900/30 text-emerald-300' : (c.diferencia > 0 ? 'bg-indigo-900/30 text-indigo-300' : 'bg-rose-900/30 text-rose-300')}`}>
                                {c.diferencia === 0 ? 'Exacto' : `${c.diferencia > 0 ? '+' : ''}${c.diferencia}`}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                  {c.estado === 'pendiente_revision' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-900/20 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                                      <Clock size={12} /> Pendiente
                                    </span>
                                  )}
                                  {c.estado === 'aprobado' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/20 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                                      <CheckCircle size={12} /> Aprobado
                                    </span>
                                  )}
                                  {c.estado === 'rechazado' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-900/20 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                                      <XCircle size={12} /> Rechazado
                                    </span>
                                  )}
                                </div>

                                {c.comentarioAdmin && (
                                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-snug">
                                    <strong className="text-indigo-400">Jefe:</strong> "{c.comentarioAdmin}"
                                  </p>
                                )}

                                {/* Controles de Admin */}
                                {!isVendor && activeTab !== 'mio' && c.estado === 'pendiente_revision' && (
                                  <div className="mt-2 space-y-2 max-w-[200px]">
                                    <input 
                                      type="text" 
                                      placeholder="Agregar comentario..." 
                                      value={adminNote[c.id] || ''}
                                      onChange={(e) => setAdminNote({ ...adminNote, [c.id]: e.target.value })}
                                      className="w-full text-xs border border-transparent rounded p-1 outline-none glass-panel"
                                    />
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={() => handleReviewCierre(c, 'aprobado')}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-1.5 rounded transition-colors"
                                      >
                                        Aprobar
                                      </button>
                                      <button 
                                        onClick={() => handleReviewCierre(c, 'rechazado')}
                                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-1 px-1.5 rounded transition-colors"
                                      >
                                        Rechazar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Vista de Auditoría (Solo Admin) */
        <div className="space-y-6">
          <div className="glass-panel p-4 rounded-xl border border-none flex flex-col sm:flex-row items-center gap-4 justify-between">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Shield className="text-indigo-400" size={24} />
              Historial de Auditoría de Seguridad
            </h3>
            <input 
              type="text" 
              placeholder="Buscar por usuario, acción o detalle..." 
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="w-full sm:w-80 border border-transparent rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none glass-panel"
            />
          </div>

          <div className="glass-panel rounded-xl border border-none overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-none">
                  <th className="p-4 text-sm font-semibold text-slate-400">Fecha / Hora</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Usuario</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Acción</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Detalles de Operación</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-500">No se encontraron registros de auditoría</td></tr>
                ) : (
                  filteredLogs.map(log => {
                    const dateStr = log.fecha ? new Date(log.fecha.toDate()).toLocaleDateString() : 'Reciente';
                    const timeStr = log.fecha ? new Date(log.fecha.toDate()).toLocaleTimeString() : '';
                    
                    return (
                      <tr key={log.id} className="border-b border-none hover:bg-transparent text-sm">
                        <td className="p-4 text-slate-300">
                          <span className="font-semibold">{dateStr}</span> <br/>
                          <span className="text-xs text-slate-500">{timeStr}</span>
                        </td>
                        <td className="p-4 text-slate-100 font-medium">{log.userEmail}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-900/30 text-indigo-300 border border-indigo-500/20">
                            {log.accion}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 leading-relaxed max-w-sm overflow-hidden text-ellipsis">
                          {log.detalles}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caja;
