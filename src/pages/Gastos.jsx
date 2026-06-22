import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Receipt, Trash2, Edit } from 'lucide-react';

const Gastos = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gastos, setGastos] = useState([]);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  const [editingGasto, setEditingGasto] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    categoria: 'Otros',
    monto: '',
    descripcion: ''
  });

  const fetchGastos = async () => {
    if (!currentUser) return;
    try {
      const emailLower = currentUser.email?.toLowerCase() || '';
      const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
      const isEstefania = emailLower.includes('estefania');
      const isVendor = isLizz || isEstefania;

      let data = [];

      if (isVendor) {
        // Vendedoras: Consultar de forma segura usando cláusulas 'where' para cumplir las reglas de Firestore
        const q1 = query(collection(db, 'gastos'), where('created_by', '==', currentUser.uid));
        const q2 = query(collection(db, 'gastos'), where('userId', '==', currentUser.uid));
        const q3 = query(collection(db, 'gastos'), where('vendedor', '==', currentUser.email));
        
        const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
        
        const map = new Map();
        snap1.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap2.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap3.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        
        data = Array.from(map.values());
      } else {
        // Administrador: Puede consultar la colección completa sin problemas
        const snapshot = await getDocs(collection(db, 'gastos'));
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

      // Ordenar en memoria por fechaCreacion desc
      data.sort((a, b) => {
        const tA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : (a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0);
        const tB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : (b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0);
        return tB - tA;
      });

      setGastos(data);
    } catch (error) {
      console.error("Error cargando gastos: ", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchGastos();
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
      await addDoc(collection(db, 'gastos'), {
        categoria: formData.categoria,
        monto: Number(formData.monto),
        descripcion: formData.descripcion,
        fechaCreacion: serverTimestamp(),
        created_by: currentUser.uid, 
        userId: currentUser.uid,      
        userEmail: currentUser.email,  
      });
      
      setFormData({ categoria: 'Otros', monto: '', descripcion: '' });
      setShowForm(false);
      fetchGastos();
      alert('Gasto registrado con éxito!');
    } catch (error) {
      console.error("Error al guardar gasto: ", error);
      alert('Hubo un error al registrar el gasto. Revisa tus permisos.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingGasto) return;
    setLoading(true);
    try {
      const ref = doc(db, 'gastos', editingGasto.id);
      await updateDoc(ref, {
        categoria: editingGasto.categoria,
        monto: Number(editingGasto.monto),
        descripcion: editingGasto.descripcion
      });
      setEditingGasto(null);
      fetchGastos();
      alert('Gasto actualizado con éxito!');
    } catch (error) {
      console.error("Error al actualizar gasto: ", error);
      alert('Error al actualizar el gasto.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro de gasto?")) return;
    try {
      await deleteDoc(doc(db, 'gastos', id));
      fetchGastos();
      alert('Gasto eliminado con éxito.');
    } catch (error) {
      console.error("Error al eliminar: ", error);
      alert('Error al eliminar el gasto. Revisa los permisos.');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (gastos.length === 0) return alert('No hay gastos para exportar.');
    
    const headers = ['ID', 'Fecha', 'Categoria', 'Monto', 'Descripcion'];
    const rows = gastos.map(g => [
      g.id,
      g.fechaCreacion?.toDate ? new Date(g.fechaCreacion.toDate()).toLocaleString() : 'N/A',
      g.categoria,
      g.monto,
      g.descripcion.replace(/"/g, '""')
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gastos_export_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const emailLower = currentUser?.email?.toLowerCase() || '';
  const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
  const isEstefania = emailLower.includes('estefania');
  const isVendor = isLizz || isEstefania;

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="text-indigo-400" size={32} />
            Egresos y Gastos
          </h2>
          {!isVendor && (
            <div className="flex border-b border-indigo-900/50 mt-4 gap-2">
              <button
                onClick={() => setActiveTab('mio')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'mio' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Mis Gastos
              </button>
              <button
                onClick={() => setActiveTab('lizz')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'lizz' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Egresos Liz
              </button>
              <button
                onClick={() => setActiveTab('estefania')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'estefania' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Egresos Estefanía
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button 
            onClick={handleExportCSV}
            className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Exportar Excel (CSV)
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {showForm ? 'Cancelar' : 'Registrar Egreso'}
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 glass-panel rounded-xl max-w-sm border border-none">
        <h4 className="text-sm font-medium text-slate-400">Total de Egresos en Vista</h4>
        <p className="text-3xl font-bold text-rose-400 neon-text">${totalGastos.toLocaleString()}</p>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl border border-none mb-8">
          <h3 className="text-xl font-semibold mb-4 text-slate-200">Registro de Gasto o Egreso</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Categoría</label>
                <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 outline-none glass-panel">
                  <option value="Otros">Otros</option>
                  <option value="Servicios">Servicios Públicos / Local</option>
                  <option value="Mercancía / Inventario">Mercancía / Inventario</option>
                  <option value="Viáticos">Viáticos / Alimentación</option>
                  <option value="Transporte">Transporte / Envíos</option>
                  <option value="Sueldos">Sueldos / Comisiones</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Monto del Egreso ($)</label>
                <input required type="number" name="monto" value={formData.monto} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 outline-none" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-300 mb-1">Detalle / Descripción</label>
                <input required type="text" name="descripcion" value={formData.descripcion} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 outline-none" />
              </div>
            </div>
            <div className="pt-4">
              <button disabled={loading} type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50 transition-colors">
                {loading ? 'Registrando...' : 'Registrar Gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl border border-none overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-transparent border-b border-none">
              <th className="p-4 text-sm font-semibold text-slate-400">Fecha</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Categoría</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Descripción</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Monto</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No hay egresos registrados</td>
              </tr>
            ) : (
              gastos.map(g => {
                const dateStr = g.fechaCreacion ? new Date(g.fechaCreacion.toDate()).toLocaleDateString() : 'Reciente';
                return (
                  <tr key={g.id} className="border-b border-none hover:bg-transparent">
                    <td className="p-4 text-slate-400">{dateStr}</td>
                    <td className="p-4 font-semibold text-indigo-300">{g.categoria}</td>
                    <td className="p-4 text-slate-300">{g.descripcion}</td>
                    <td className="p-4 text-rose-500 font-bold">${g.monto}</td>
                    <td className="p-4 flex gap-2">
                      <button
                        onClick={() => setEditingGasto(g)}
                        className="px-3 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold hover:bg-indigo-600/50 transition-colors flex items-center gap-1"
                      >
                        <Edit size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(g.id)}
                        className="px-3 py-1 bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold hover:bg-rose-600/50 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición de Gasto */}
      {editingGasto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel p-6 rounded-xl shadow-lg max-w-md w-full border border-indigo-500/50 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-100 neon-text">Editar Registro de Gasto</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Categoría</label>
                <select 
                  value={editingGasto.categoria} 
                  onChange={(e) => setEditingGasto({ ...editingGasto, categoria: e.target.value })} 
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none glass-panel"
                >
                  <option value="Otros">Otros</option>
                  <option value="Servicios">Servicios Públicos / Local</option>
                  <option value="Mercancía / Inventario">Mercancía / Inventario</option>
                  <option value="Viáticos">Viáticos / Alimentación</option>
                  <option value="Transporte">Transporte / Envíos</option>
                  <option value="Sueldos">Sueldos / Comisiones</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Monto ($)</label>
                <input
                  required
                  type="number"
                  value={editingGasto.monto}
                  onChange={(e) => setEditingGasto({ ...editingGasto, monto: e.target.value })}
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Detalle / Descripción</label>
                <input
                  required
                  type="text"
                  value={editingGasto.descripcion}
                  onChange={(e) => setEditingGasto({ ...editingGasto, descripcion: e.target.value })}
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGasto(null)}
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

export default Gastos;
