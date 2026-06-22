import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Download } from 'lucide-react';

const Productos = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [kardexLogs, setKardexLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  const [viewMode, setViewMode] = useState('inventario'); // 'inventario', 'kardex'
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

  const fetchKardex = async () => {
    if (!currentUser) return;
    try {
      const emailLower = currentUser.email?.toLowerCase() || '';
      const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
      const isEstefania = emailLower.includes('estefania');
      const isVendor = isLizz || isEstefania;

      let data = [];

      if (isVendor) {
        // Vendedoras: Consultar de forma segura usando cláusulas 'where' para cumplir las reglas de Firestore
        const q1 = query(collection(db, 'kardex'), where('created_by', '==', currentUser.uid));
        const q2 = query(collection(db, 'kardex'), where('userId', '==', currentUser.uid));
        const q3 = query(collection(db, 'kardex'), where('vendedor', '==', currentUser.email));
        
        const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
        
        const map = new Map();
        snap1.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap2.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        snap3.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        
        data = Array.from(map.values());
      } else {
        // Administrador: Puede consultar la colección completa sin problemas
        const snapshot = await getDocs(collection(db, 'kardex'));
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

      data.sort((a, b) => {
        const tA = a.fecha?.toMillis ? a.fecha.toMillis() : (a.fecha ? new Date(a.fecha).getTime() : 0);
        const tB = b.fecha?.toMillis ? b.fecha.toMillis() : (b.fecha ? new Date(b.fecha).getTime() : 0);
        return tB - tA;
      });

      setKardexLogs(data);
    } catch (error) {
      console.error("Error cargando Kardex: ", error);
    }
  };

  const handleExportCSV = () => {
    if (viewMode === 'inventario') {
      if (productos.length === 0) return alert('No hay productos para exportar.');
      const headers = ['ID', 'Producto', 'Costo Compra', 'Precio Venta', 'Stock'];
      const rows = productos.map(p => [
        p.id,
        p.nombre,
        p.valorCompra,
        p.valorVenta,
        p.stock
      ]);

      const csvContent = 
        'data:text/csv;charset=utf-8,\uFEFF' + 
        [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `productos_export_${activeTab}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (kardexLogs.length === 0) return alert('No hay historial de movimientos para exportar.');
      const headers = ['ID', 'Fecha', 'Producto', 'Tipo', 'Cantidad', 'Detalle'];
      const rows = kardexLogs.map(k => [
        k.id,
        k.fecha?.toDate ? new Date(k.fecha.toDate()).toLocaleString() : 'Reciente',
        k.productoNombre,
        k.tipo,
        k.cantidad,
        k.detalle
      ]);

      const csvContent = 
        'data:text/csv;charset=utf-8,\uFEFF' + 
        [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `kardex_export_${activeTab}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProductos();
      fetchKardex();
    }
  }, [currentUser, activeTab, viewMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    
    try {
      const docRef = await addDoc(collection(db, 'productos'), {
        nombre: formData.nombre,
        valorCompra: Number(formData.valorCompra),
        valorVenta: Number(formData.valorVenta),
        stock: Number(formData.stock),
        fechaCreacion: serverTimestamp(),
        created_by: currentUser.uid, // Campo de auditoría obligatorio
        userId: currentUser.uid,      // Compatibilidad legacy
        userEmail: currentUser.email,  // Compatibilidad legacy
      });

      // Kardex Logger
      await addDoc(collection(db, 'kardex'), {
        productoId: docRef.id,
        productoNombre: formData.nombre,
        tipo: 'entrada',
        cantidad: Number(formData.stock),
        detalle: 'Inventario inicial registrado',
        fecha: serverTimestamp(),
        created_by: currentUser.uid,
        userId: currentUser.uid,
        userEmail: currentUser.email
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
      const originalProduct = productos.find(p => p.id === editingProduct.id);
      const diff = Number(editingProduct.stock) - Number(originalProduct.stock);

      const ref = doc(db, 'productos', editingProduct.id);
      await updateDoc(ref, {
        nombre: editingProduct.nombre,
        valorCompra: Number(editingProduct.valorCompra),
        valorVenta: Number(editingProduct.valorVenta),
        stock: Number(editingProduct.stock)
      });

      if (diff !== 0) {
        await addDoc(collection(db, 'kardex'), {
          productoId: editingProduct.id,
          productoNombre: editingProduct.nombre,
          tipo: diff > 0 ? 'entrada' : 'salida',
          cantidad: Math.abs(diff),
          detalle: 'Ajuste manual de stock',
          fecha: serverTimestamp(),
          created_by: currentUser.uid,
          userId: currentUser.uid,
          userEmail: currentUser.email
        });
      }

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
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {showForm ? 'Cancelar' : 'Añadir Producto'}
          </button>
        </div>
      </div>

      <div className="flex border-b border-indigo-900/50 mb-6 gap-2">
        <button
          onClick={() => setViewMode('inventario')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${viewMode === 'inventario' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Ver Inventario
        </button>
        <button
          onClick={() => setViewMode('kardex')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${viewMode === 'kardex' ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Ver Historial (Kardex)
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

      {viewMode === 'inventario' ? (
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
                      <span className={`px-2.5 py-1 rounded-md font-semibold border ${p.stock <= 0 ? 'bg-rose-900/30 text-rose-300 border-rose-500/30 font-bold' : (p.stock <= 3 ? 'bg-amber-900/30 text-amber-300 border-amber-500/30 font-semibold animate-pulse' : 'bg-indigo-900/20 text-indigo-300 border-indigo-500/10')}`}>
                        {p.stock} {p.stock <= 3 && (p.stock > 0 ? ' (Bajo)' : ' (Agotado)')}
                      </span>
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
      ) : (
        <div className="glass-panel rounded-xl border border-none overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-transparent border-b border-none">
                <th className="p-4 text-sm font-semibold text-slate-400">Fecha</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Producto</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Tipo</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Cantidad</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {kardexLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">No hay movimientos registrados en el Kardex</td>
                </tr>
              ) : (
                kardexLogs.map(k => {
                  const dateStr = k.fecha ? new Date(k.fecha.toDate()).toLocaleString() : 'Reciente';
                  return (
                    <tr key={k.id} className="border-b border-none hover:bg-transparent">
                      <td className="p-4 text-slate-400">{dateStr}</td>
                      <td className="p-4 font-medium text-slate-100">{k.productoNombre}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${k.tipo === 'entrada' ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30' : 'bg-rose-600/30 text-rose-300 border-rose-500/30'}`}>
                          {k.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-200">{k.cantidad}</td>
                      <td className="p-4 text-slate-400 text-sm">{k.detalle}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

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
