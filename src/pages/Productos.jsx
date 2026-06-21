import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Productos = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    valorCompra: '',
    valorVenta: '',
    stock: ''
  });

  const fetchProductos = async () => {
    try {
      const q = query(collection(db, 'productos'), orderBy('fechaCreacion', 'desc'));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const userEmail = currentUser?.email?.toLowerCase();
      if (userEmail !== 'wilmerjosevegaacevedo@gmail.com') {
        data = data.filter(d => d.vendedor === userEmail);
      }
      
      setProductos(data);
    } catch (error) {
      console.error("Error cargando productos: ", error);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'productos'), {
        nombre: formData.nombre,
        valorCompra: Number(formData.valorCompra),
        valorVenta: Number(formData.valorVenta),
        stock: Number(formData.stock),
        fechaCreacion: serverTimestamp(),
        vendedor: currentUser?.email || 'admin'
      });
      
      setFormData({ nombre: '', valorCompra: '', valorVenta: '', stock: '' });
      setShowForm(false);
      fetchProductos();
      alert('Producto registrado con éxito!');
    } catch (error) {
      console.error("Error al guardar: ", error);
      alert('Hubo un error al guardar. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-100">Inventario y Productos</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showForm ? 'Cancelar' : 'Añadir Producto'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl  border border-none mb-8">
          <h3 className="text-xl font-semibold mb-4">Registro de Nuevo Producto</h3>
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

      <div className="glass-panel rounded-xl  border border-none overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-transparent border-b border-none">
              <th className="p-4 text-sm font-semibold text-slate-400">Producto</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Costo Compra</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Precio Venta</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Stock</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Vendedor</th>
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
                  <td className="p-4 text-slate-400 text-sm">{p.vendedor}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Productos;
