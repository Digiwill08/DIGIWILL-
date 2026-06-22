import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Productos = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  const [editingProduct, setEditingProduct] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    valorCompra: '',
    valorVenta: '',
    stock: ''
  });

  const fetchProductos = async () => {
    if (!currentUser) return;
    try {
      const emailLower = currentUser.email?.toLowerCase() || '';
      const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
      const isEstefania = emailLower.includes('estefania');
      const isVendor = isLizz || isEstefania;

      let data = [];

      if (isVendor) {
        // Vendedoras: Consultar de forma segura usando cláusulas 'where' para cumplir las reglas de Firestore
        const q1 = query(collection(db, 'productos'), where('created_by', '==', currentUser.uid));
        const q2 = query(collection(db, 'productos'), where('userId', '==', currentUser.uid));
        const q3 = query(collection(db, 'productos'), where('vendedor', '==', currentUser.email));
        
        const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
        
        const map = new Map();
        snap1.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap2.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap3.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        
        data = Array.from(map.values());
      } else {
        // Administrador: Puede consultar la colección completa sin problemas
        const snapshot = await getDocs(collection(db, 'productos'));
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

      setProductos(data);
    } catch (error) {
      console.error("Error cargando productos: ", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProductos();
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
      await addDoc(collection(db, 'productos'), {
        nombre: formData.nombre,
        valorCompra: Number(formData.valorCompra),
        valorVenta: Number(formData.valorVenta),
        stock: Number(formData.stock),
        fechaCreacion: serverTimestamp(),
        created_by: currentUser.uid, // Campo de auditoría obligatorio
        userId: currentUser.uid,      // Compatibilidad legacy
        userEmail: currentUser.email,  // Compatibilidad legacy
      });
      
      setFormData({ nombre: '', valorCompra: '', valorVenta: '', stock: '' });
      setShowForm(false);
      fetchProductos();
      alert('Producto registrado con éxito!');
    } catch (error) {
      console.error("Error al guardar: ", error);
      alert('Hubo un error al guardar. Revisa la consola o las reglas de base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);
    try {
      const ref = doc(db, 'productos', editingProduct.id);
      await updateDoc(ref, {
        nombre: editingProduct.nombre,
        valorCompra: Number(editingProduct.valorCompra),
        valorVenta: Number(editingProduct.valorVenta),
        stock: Number(editingProduct.stock)
      });
      setEditingProduct(null);
      fetchProductos();
      alert('Producto actualizado con éxito!');
    } catch (error) {
      console.error("Error al actualizar: ", error);
      alert('Error al actualizar el producto.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este producto?")) return;
    try {
      await deleteDoc(doc(db, 'productos', id));
      fetchProductos();
      alert('Producto eliminado con éxito.');
    } catch (error) {
      console.error("Error al eliminar: ", error);
      alert('Error al eliminar el producto. Revisa los permisos.');
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
          <h2 className="text-3xl font-bold text-slate-100">Inventario y Productos</h2>
          {!isVendor && (
            <div className="flex border-b border-indigo-900/50 mt-4 gap-2">
              <button
                onClick={() => setActiveTab('mio')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'mio' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Mi Inventario
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors self-start sm:self-auto"
        >
          {showForm ? 'Cancelar' : 'Añadir Producto'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl border border-none mb-8">
          <h3 className="text-xl font-semibold mb-4 text-slate-200">Registro de Nuevo Producto</h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Producto / Servicio</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor de Compra (Costo)</label>
                <input required type="number" name="valorCompra" value={formData.valorCompra} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor de Venta (Público)</label>
                <input required type="number" name="valorVenta" value={formData.valorVenta} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Stock Inicial</label>
                <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border border-transparent rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
            <div className="pt-4">
              <button disabled={loading} type="submit" className="neon-button-emerald w-full sm:w-auto disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl border border-none overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-transparent border-b border-none">
              <th className="p-4 text-sm font-semibold text-slate-400">Producto</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Costo Compra</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Precio Venta</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Stock</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No hay productos registrados</td>
              </tr>
            ) : (
              productos.map(p => (
                <tr key={p.id} className="border-b border-none hover:bg-transparent">
                  <td className="p-4 font-medium text-slate-100">{p.nombre}</td>
                  <td className="p-4 text-slate-400">${p.valorCompra}</td>
                  <td className="p-4 text-emerald-600 font-bold">${p.valorVenta}</td>
                  <td className="p-4 text-slate-400">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-semibold">{p.stock}</span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="px-3 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold hover:bg-indigo-600/50 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(p.id)}
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

      {/* Modal de Edición de Producto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel p-6 rounded-xl shadow-lg max-w-md w-full border border-indigo-500/50 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-100 neon-text">Editar Producto</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                <input
                  required
                  type="text"
                  value={editingProduct.nombre}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Costo Compra</label>
                  <input
                    required
                    type="number"
                    value={editingProduct.valorCompra}
                    onChange={(e) => setEditingProduct({ ...editingProduct, valorCompra: e.target.value })}
                    className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Precio Venta</label>
                  <input
                    required
                    type="number"
                    value={editingProduct.valorVenta}
                    onChange={(e) => setEditingProduct({ ...editingProduct, valorVenta: e.target.value })}
                    className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Stock</label>
                <input
                  required
                  type="number"
                  value={editingProduct.stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
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

export default Productos;
