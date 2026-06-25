import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Download, User, X, FileText, Calendar, DollarSign, Wallet, Award, ArrowUpRight } from 'lucide-react';
import { logActivity } from '../utils/auditLogger';
import { formatCOP } from '../utils/format';

const Clientes = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  const [editingCliente, setEditingCliente] = useState(null);

  // CRM State
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [crmActiveTab, setCrmActiveTab] = useState('ventas'); // 'ventas', 'creditos', 'prestamos', 'pagos'
  const [crmData, setCrmData] = useState({
    loading: false,
    ventas: [],
    creditos: [],
    prestamos: [],
    pagos: [],
    totalComprado: 0,
    saldoPendientePrestamos: 0,
    saldoPendienteCreditos: 0,
    totalAbonado: 0
  });

  const fetchClientCRMData = async (client) => {
    setSelectedClient(client);
    setCrmModalOpen(true);
    setCrmData(prev => ({ ...prev, loading: true }));
    try {
      const qVentas = query(collection(db, 'ventas'), where('clienteId', '==', client.id));
      const qPrestamos = query(collection(db, 'prestamos'), where('clienteId', '==', client.id));

      const [snapVentas, snapPrestamos] = await Promise.all([
        getDocs(qVentas),
        getDocs(qPrestamos)
      ]);

      const clientVentas = snapVentas.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientPrestamos = snapPrestamos.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      clientVentas.sort((a, b) => {
        const tA = a.fechaVenta?.toMillis ? a.fechaVenta.toMillis() : (a.fechaVenta ? new Date(a.fechaVenta).getTime() : 0);
        const tB = b.fechaVenta?.toMillis ? b.fechaVenta.toMillis() : (b.fechaVenta ? new Date(b.fechaVenta).getTime() : 0);
        return tB - tA;
      });

      clientPrestamos.sort((a, b) => {
        const tA = a.fechaInicio?.toMillis ? a.fechaInicio.toMillis() : (a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0);
        const tB = b.fechaInicio?.toMillis ? b.fechaInicio.toMillis() : (b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0);
        return tB - tA;
      });

      let clientPagos = [];
      const loanIds = clientPrestamos.map(p => p.id);
      if (loanIds.length > 0) {
        if (loanIds.length <= 30) {
          const qPagos = query(collection(db, 'pagos'), where('prestamoId', 'in', loanIds));
          const snapPagos = await getDocs(qPagos);
          clientPagos = snapPagos.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          const snapPagos = await getDocs(collection(db, 'pagos'));
          clientPagos = snapPagos.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(pago => loanIds.includes(pago.prestamoId));
        }
      }

      clientPagos.sort((a, b) => {
        const tA = a.fechaPago?.toMillis ? a.fechaPago.toMillis() : (a.fechaPago ? new Date(a.fechaPago).getTime() : 0);
        const tB = b.fechaPago?.toMillis ? b.fechaPago.toMillis() : (b.fechaPago ? new Date(b.fechaPago).getTime() : 0);
        return tB - tA;
      });

      const totalComprado = clientVentas.reduce((sum, v) => sum + Number(v.total || 0), 0);
      
      const clientCreditos = clientPrestamos.filter(p => !!p.ventaId);
      const clientLoans = clientPrestamos.filter(p => !p.ventaId);

      const saldoPendientePrestamos = clientLoans
        .filter(p => p.estado === 'activo')
        .reduce((sum, p) => sum + Number(p.saldoPendiente || 0), 0);

      const saldoPendienteCreditos = clientCreditos
        .filter(p => p.estado === 'activo')
        .reduce((sum, p) => sum + Number(p.saldoPendiente || 0), 0);

      const totalAbonado = clientPagos.reduce((sum, p) => sum + Number(p.montoAbonado || 0), 0);

      setCrmData({
        loading: false,
        ventas: clientVentas,
        creditos: clientCreditos,
        prestamos: clientLoans,
        pagos: clientPagos,
        totalComprado,
        saldoPendientePrestamos,
        saldoPendienteCreditos,
        totalAbonado
      });
    } catch (err) {
      console.error("Error loading CRM data:", err);
      alert("Error al cargar la información del cliente.");
      setCrmData(prev => ({ ...prev, loading: false }));
    }
  };

  const [formData, setFormData] = useState({
    nombreCompleto: '',
    cedula: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  const fetchClientes = async () => {
    if (!currentUser) return;
    try {
      const emailLower = currentUser.email?.toLowerCase() || '';
      const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
      const isEstefania = emailLower.includes('estefania');
      const isVendor = isLizz || isEstefania;

      let data = [];

      if (isVendor) {
        // Vendedoras: Consultar de forma segura usando cláusulas 'where' para cumplir las reglas de Firestore
        const q1 = query(collection(db, 'clientes'), where('created_by', '==', currentUser.uid));
        const q2 = query(collection(db, 'clientes'), where('userId', '==', currentUser.uid));
        const q3 = query(collection(db, 'clientes'), where('vendedor', '==', currentUser.email));
        
        const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
        
        const map = new Map();
        snap1.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap2.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap3.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        
        data = Array.from(map.values());
      } else {
        // Administrador: Puede consultar la colección completa sin problemas
        const snapshot = await getDocs(collection(db, 'clientes'));
        const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Administrador: filtrar según la selección de pestaña
        if (activeTab === 'mio') {
          data = allData.filter(d => {
            const belongsToVendor = 
              d.userEmail?.toLowerCase().includes('liz') || 
              d.userEmail?.toLowerCase().includes('vendedor1') ||
              d.vendedor?.toLowerCase().includes('liz') ||
              d.vendedor?.toLowerCase().includes('vendedor1') ||
              d.userEmail?.toLowerCase().includes('estefania') || 
              d.vendedor?.toLowerCase().includes('estefania');
            return d.created_by === currentUser.uid || d.userId === currentUser.uid || !belongsToVendor;
          });
        } else if (activeTab === 'lizz') {
          data = allData.filter(d => 
            d.userEmail?.toLowerCase().includes('liz') || 
            d.userEmail?.toLowerCase().includes('vendedor1') ||
            d.vendedor?.toLowerCase().includes('liz') ||
            d.vendedor?.toLowerCase().includes('vendedor1')
          );
        } else if (activeTab === 'estefania') {
          data = allData.filter(d => 
            d.userEmail?.toLowerCase().includes('estefania') || 
            d.vendedor?.toLowerCase().includes('estefania')
          );
        }
      }

      // Ordenar en memoria por nombre alfabéticamente (A-Z)
      data.sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || ''));

      setClientes(data);
    } catch (error) {
      console.error("Error cargando clientes: ", error);
    }
  };

  const handleExportCSV = () => {
    if (clientes.length === 0) return alert('No hay clientes para exportar.');
    
    const headers = ['ID', 'Nombre Completo', 'Cedula', 'Telefono', 'Email', 'Direccion'];
    const rows = clientes.map(c => [
      c.id,
      c.nombreCompleto,
      c.cedula,
      c.telefono,
      c.email,
      c.direccion
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clientes_export_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (currentUser) {
      fetchClientes();
    }
  }, [currentUser, activeTab]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    
    try {
      const clientRef = await addDoc(collection(db, 'clientes'), {
        nombreCompleto: formData.nombreCompleto,
        cedula: formData.cedula,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
        fechaRegistro: serverTimestamp(),
        created_by: currentUser.uid, // Campo obligatorio
        userId: currentUser.uid,      // Legacy
        userEmail: currentUser.email,  // Legacy
      });

      // Auditoría
      await logActivity(currentUser, 'creacion_cliente', `Registró al cliente '${formData.nombreCompleto}' (C.C: ${formData.cedula}, Tel: ${formData.telefono})`, 'clientes', clientRef.id);
      
      setFormData({ nombreCompleto: '', cedula: '', telefono: '', email: '', direccion: '' });
      setShowForm(false);
      fetchClientes();
      alert('Cliente registrado con éxito!');
    } catch (error) {
      console.error("Error al guardar: ", error);
      alert('Hubo un error al guardar. Revisa la consola o las reglas de base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCliente) return;
    setLoading(true);
    try {
      const ref = doc(db, 'clientes', editingCliente.id);
      await updateDoc(ref, {
        nombreCompleto: editingCliente.nombreCompleto,
        cedula: editingCliente.cedula,
        telefono: editingCliente.telefono,
        email: editingCliente.email,
        direccion: editingCliente.direccion
      });

      // Auditoría
      await logActivity(currentUser, 'edicion_cliente', `Editó la información del cliente '${editingCliente.nombreCompleto}' (C.C: ${editingCliente.cedula}, Tel: ${editingCliente.telefono})`, 'clientes', editingCliente.id);

      setEditingCliente(null);
      fetchClientes();
      alert('Cliente actualizado con éxito!');
    } catch (error) {
      console.error("Error al actualizar: ", error);
      alert('Error al actualizar el cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;
    try {
      const c = clientes.find(client => client.id === id);
      const cNombre = c ? c.nombreCompleto : id;

      await deleteDoc(doc(db, 'clientes', id));

      // Auditoría
      await logActivity(currentUser, 'eliminacion_cliente', `Eliminó al cliente '${cNombre}'`, 'clientes', id);

      fetchClientes();
      alert('Cliente eliminado con éxito.');
    } catch (error) {
      console.error("Error al eliminar: ", error);
      alert('Error al eliminar el cliente. Revisa los permisos.');
    }
  };

  const emailLower = currentUser?.email?.toLowerCase() || '';
  const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
  const isEstefania = emailLower.includes('estefania');
  const isVendor = isLizz || isEstefania;

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Base de Clientes</h2>
          {!isVendor && (
            <div className="flex border-b border-indigo-900/50 mt-4 gap-2">
              <button
                onClick={() => setActiveTab('mio')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'mio' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Mis Clientes
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
        <div className="flex gap-2 self-start sm:self-auto">
          <button 
            onClick={handleExportCSV}
            className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <Download size={16} />
            Exportar Excel
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="neon-button px-4 py-2 rounded-lg font-medium"
          >
            {showForm ? 'Cancelar' : 'Añadir Cliente'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl mb-8">
          <h3 className="text-xl font-semibold mb-4 text-slate-200">Registro de Nuevo Cliente</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo</label>
                <input required type="text" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Cédula</label>
                <input required type="text" name="cedula" value={formData.cedula} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Teléfono</label>
                <input required type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico (Opcional)</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Dirección Completa</label>
                <input required type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="pt-4">
              <button disabled={loading} type="submit" className="neon-button px-6 py-2 rounded-lg font-medium">
                {loading ? 'Guardando...' : 'Guardar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-transparent border-b border-none">
              <th className="p-4 text-sm font-semibold text-slate-400">Nombre</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Cédula</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Contacto</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Dirección</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No hay clientes registrados</td>
              </tr>
            ) : (
              clientes.map(c => (
                <tr key={c.id} className="border-b border-none hover:bg-transparent">
                  <td className="p-4 font-medium text-slate-100">{c.nombreCompleto}</td>
                  <td className="p-4 text-slate-400">{c.cedula}</td>
                  <td className="p-4 text-slate-400">{c.telefono} <br/><span className="text-xs text-slate-500">{c.email}</span></td>
                  <td className="p-4 text-slate-400">{c.direccion}</td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => fetchClientCRMData(c)}
                      className="px-3 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-600/50 transition-colors"
                    >
                      Ver Perfil
                    </button>
                    <button
                      onClick={() => setEditingCliente(c)}
                      className="px-3 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold hover:bg-indigo-600/50 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(c.id)}
                      className="px-3 py-1 bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold hover:bg-rose-600/50 transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición de Cliente */}
      {editingCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel p-6 rounded-xl shadow-lg max-w-md w-full border border-indigo-500/50 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-100 neon-text">Editar Cliente</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={editingCliente.nombreCompleto}
                  onChange={(e) => setEditingCliente({ ...editingCliente, nombreCompleto: e.target.value })}
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cédula</label>
                  <input
                    required
                    type="text"
                    value={editingCliente.cedula}
                    onChange={(e) => setEditingCliente({ ...editingCliente, cedula: e.target.value })}
                    className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Teléfono</label>
                  <input
                    required
                    type="text"
                    value={editingCliente.telefono}
                    onChange={(e) => setEditingCliente({ ...editingCliente, telefono: e.target.value })}
                    className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  value={editingCliente.email || ''}
                  onChange={(e) => setEditingCliente({ ...editingCliente, email: e.target.value })}
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Dirección</label>
                <input
                  required
                  type="text"
                  value={editingCliente.direccion}
                  onChange={(e) => setEditingCliente({ ...editingCliente, direccion: e.target.value })}
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCliente(null)}
                  className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 neon-button text-white rounded-lg font-medium"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal CRM de Cliente */}
      {crmModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 rounded-xl shadow-lg max-w-4xl w-full border border-indigo-500/30 relative max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-indigo-950 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">{selectedClient.nombreCompleto}</h3>
                  <p className="text-sm text-slate-400">C.C. {selectedClient.cedula} • Tel: {selectedClient.telefono}</p>
                  <p className="text-xs text-slate-500">{selectedClient.direccion}</p>
                </div>
              </div>
              <button 
                onClick={() => setCrmModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/35 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {crmData.loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-indigo-400">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400 mb-4"></div>
                <p>Cargando información del cliente...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                
                {/* Metric cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-300 shrink-0"><DollarSign size={18}/></div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Total Comprado (Ventas)</p>
                      <h4 className="text-base font-bold text-slate-100">${formatCOP(crmData.totalComprado)}</h4>
                    </div>
                  </div>
                  <div className="bg-orange-950/15 border border-orange-900/35 p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-orange-600/20 text-orange-300 shrink-0"><Wallet size={18}/></div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Saldo Pendiente (Créditos)</p>
                      <h4 className="text-base font-bold text-orange-400">${formatCOP(crmData.saldoPendienteCreditos)}</h4>
                    </div>
                  </div>
                  <div className="bg-rose-950/10 border border-rose-900/30 p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-rose-600/20 text-rose-300 shrink-0"><Wallet size={18}/></div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Saldo Pendiente (Préstamos)</p>
                      <h4 className="text-base font-bold text-rose-400">${formatCOP(crmData.saldoPendientePrestamos)}</h4>
                    </div>
                  </div>
                  <div className="bg-emerald-950/10 border border-emerald-900/30 p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-600/20 text-emerald-300 shrink-0"><Award size={18}/></div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Total Abonado (Deuda)</p>
                      <h4 className="text-base font-bold text-emerald-400">${formatCOP(crmData.totalAbonado)}</h4>
                    </div>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-indigo-950/50 mb-4 gap-2 flex-wrap">
                  <button
                    onClick={() => setCrmActiveTab('ventas')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${crmActiveTab === 'ventas' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                  >
                    Compras ({crmData.ventas.length})
                  </button>
                  <button
                    onClick={() => setCrmActiveTab('creditos')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${crmActiveTab === 'creditos' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                  >
                    Créditos de Ventas ({crmData.creditos.length})
                  </button>
                  <button
                    onClick={() => setCrmActiveTab('prestamos')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${crmActiveTab === 'prestamos' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                  >
                    Préstamos WILL ({crmData.prestamos.length})
                  </button>
                  <button
                    onClick={() => setCrmActiveTab('pagos')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${crmActiveTab === 'pagos' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                  >
                    Historial de Abonos ({crmData.pagos.length})
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto pr-1">
                  {crmActiveTab === 'ventas' && (
                    <div className="space-y-3">
                      {crmData.ventas.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">Este cliente no registra compras directas.</p>
                      ) : (
                        crmData.ventas.map(v => {
                          const date = v.fechaVenta ? new Date(v.fechaVenta.toDate()).toLocaleString() : 'Reciente';
                          return (
                            <div key={v.id} className="glass-panel p-4 rounded-xl border border-indigo-900/10 flex flex-col md:flex-row justify-between gap-4">
                              <div>
                                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12}/> {date}</p>
                                <div className="text-sm font-medium text-slate-200">
                                  {v.detalles?.map((d, idx) => (
                                    <div key={idx} className="flex items-center gap-2 mt-0.5">
                                      <span className="text-emerald-500 font-bold">{d.cantidad}x</span> 
                                      <span>{d.nombre}</span>
                                      <span className="text-xs text-slate-500">(${formatCOP(d.precioUnitario)})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col md:items-end justify-between">
                                <span className="font-bold text-slate-100">${formatCOP(v.total)}</span>
                                <span className={`text-[10px] px-2 py-0.5 mt-2 rounded font-semibold self-start md:self-auto ${v.tipoVenta === 'financiada' ? 'bg-orange-600/20 text-orange-300' : 'bg-emerald-600/20 text-emerald-300'}`}>
                                  {v.tipoVenta === 'financiada' ? 'A Crédito' : 'Contado'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {crmActiveTab === 'creditos' && (
                    <div className="space-y-3">
                      {crmData.creditos.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">Este cliente no registra créditos de ventas.</p>
                      ) : (
                        crmData.creditos.map(p => {
                          const date = p.fechaInicio ? new Date(p.fechaInicio.toDate()).toLocaleDateString() : 'Reciente';
                          return (
                            <div key={p.id} className="glass-panel p-4 rounded-xl border border-indigo-900/10 flex flex-col md:flex-row justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${p.estado === 'activo' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/20' : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/20'}`}>
                                    {p.estado === 'activo' ? 'Activo' : 'Pagado'}
                                  </span>
                                  <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12}/> {date}</span>
                                </div>
                                <p className="text-sm text-slate-300">
                                  Monto Principal: <strong className="text-slate-100">${formatCOP(p.montoPrincipal)}</strong>
                                  <span className="text-xs text-slate-500 ml-2">({p.tasaInteres}% interés (${formatCOP(p.montoPrincipal * (p.tasaInteres / 100))}) • Frecuencia: {p.frecuenciaCobro})</span>
                                </p>
                              </div>
                              <div className="flex flex-col md:items-end justify-center">
                                <p className="text-xs text-slate-400">Saldo Pendiente</p>
                                <span className="font-bold text-rose-400 text-lg">${formatCOP(p.saldoPendiente)}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {crmActiveTab === 'prestamos' && (
                    <div className="space-y-3">
                      {crmData.prestamos.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">Este cliente no registra préstamos de efectivo.</p>
                      ) : (
                        crmData.prestamos.map(p => {
                          const date = p.fechaInicio ? new Date(p.fechaInicio.toDate()).toLocaleDateString() : 'Reciente';
                          return (
                            <div key={p.id} className="glass-panel p-4 rounded-xl border border-indigo-900/10 flex flex-col md:flex-row justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${p.estado === 'activo' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/20' : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/20'}`}>
                                    {p.estado === 'activo' ? 'Activo' : 'Pagado'}
                                  </span>
                                  <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12}/> {date}</span>
                                </div>
                                <p className="text-sm text-slate-300">
                                  Monto Principal: <strong className="text-slate-100">${formatCOP(p.montoPrincipal)}</strong>
                                  <span className="text-xs text-slate-500 ml-2">({p.tasaInteres}% interés (${formatCOP(p.montoPrincipal * (p.tasaInteres / 100))}) • Frecuencia: {p.frecuenciaCobro})</span>
                                </p>
                              </div>
                              <div className="flex flex-col md:items-end justify-center">
                                <p className="text-xs text-slate-400">Saldo Pendiente</p>
                                <span className="font-bold text-rose-400 text-lg">${formatCOP(p.saldoPendiente)}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {crmActiveTab === 'pagos' && (
                    <div className="space-y-3">
                      {crmData.pagos.length === 0 ? (
                        <p className="text-slate-500 text-center py-10 text-sm">No se registran abonos en el sistema.</p>
                      ) : (
                        crmData.pagos.map(pago => {
                          const date = pago.fechaPago ? new Date(pago.fechaPago.toDate()).toLocaleString() : 'Reciente';
                          const matchingItem = crmData.prestamos.find(pr => pr.id === pago.prestamoId) || 
                                               crmData.creditos.find(cr => cr.id === pago.prestamoId);
                          const tipoLabel = matchingItem?.ventaId ? 'Crédito de Venta' : 'Préstamo WILL';
                          return (
                            <div key={pago.id} className="glass-panel p-3 rounded-xl border border-indigo-900/10 flex justify-between items-center">
                              <div>
                                <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1"><Calendar size={12}/> {date}</p>
                                <p className="text-sm text-slate-200">
                                  Abono para <span className="text-indigo-400 font-semibold">{tipoLabel}</span> de: <span className="text-indigo-400 font-semibold">${formatCOP(matchingItem?.montoPrincipal || 0)}</span>
                                </p>
                              </div>
                              <span className="font-bold text-emerald-400 text-md">+ ${formatCOP(pago.montoAbonado)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
