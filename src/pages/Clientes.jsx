import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Clientes = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  const [editingCliente, setEditingCliente] = useState(null);

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

      // Ordenar en memoria por fechaRegistro desc
      data.sort((a, b) => {
        const tA = a.fechaRegistro?.toMillis ? a.fechaRegistro.toMillis() : (a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0);
        const tB = b.fechaRegistro?.toMillis ? b.fechaRegistro.toMillis() : (b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0);
        return tB - tA;
      });

      setClientes(data);
    } catch (error) {
      console.error("Error cargando clientes: ", error);
    }
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
      await addDoc(collection(db, 'clientes'), {
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
      await deleteDoc(doc(db, 'clientes', id));
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
        <button 
          onClick={() => setShowForm(!showForm)}
          className="neon-button px-4 py-2 rounded-lg font-medium self-start sm:self-auto"
        >
          {showForm ? 'Cancelar' : 'Añadir Cliente'}
        </button>
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
    </div>
  );
};

export default Clientes;
