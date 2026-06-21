import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, Plus } from 'lucide-react';

const Ventas = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Datos
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  
  // Estado del formulario (Carrito)
  const [clienteId, setClienteId] = useState('');
  const [carrito, setCarrito] = useState([]);
  
  // Selección temporal de producto
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cantidad, setCantidad] = useState(1);

  // Estado de Financiación
  const [tipoVenta, setTipoVenta] = useState('contado');
  const [tasaInteres, setTasaInteres] = useState('');
  const [frecuenciaCobro, setFrecuenciaCobro] = useState('mensual');

  const fetchData = async () => {
    try {
      // Cargar Ventas
      const qVentas = query(collection(db, 'ventas'), orderBy('fechaVenta', 'desc'));
      const snapVentas = await getDocs(qVentas);
      setVentas(snapVentas.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Cargar Clientes
      const qClientes = query(collection(db, 'clientes'), orderBy('nombreCompleto', 'asc'));
      const snapClientes = await getDocs(qClientes);
      setClientes(snapClientes.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Cargar Productos (Solo con stock)
      const qProductos = query(collection(db, 'productos'), orderBy('nombre', 'asc'));
      const snapProductos = await getDocs(qProductos);
      setProductos(snapProductos.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.stock > 0));
    } catch (error) {
      console.error("Error cargando datos: ", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const agregarAlCarrito = () => {
    if (!selectedProduct) return;
    const prod = productos.find(p => p.id === selectedProduct);
    const cant = Number(cantidad);

    if (cant <= 0) return alert('La cantidad debe ser mayor a 0');
    if (cant > prod.stock) return alert(`Solo hay ${prod.stock} unidades disponibles de ${prod.nombre}`);

    // Verificar si ya está en el carrito
    const existe = carrito.find(item => item.productoId === prod.id);
    if (existe) {
      if (existe.cantidad + cant > prod.stock) {
         return alert(`No puedes agregar más, supera el stock de ${prod.stock}`);
      }
      setCarrito(carrito.map(item => 
        item.productoId === prod.id 
          ? { ...item, cantidad: item.cantidad + cant, subtotal: (item.cantidad + cant) * item.precioUnitario }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        productoId: prod.id,
        nombre: prod.nombre,
        precioUnitario: prod.precio,
        cantidad: cant,
        subtotal: cant * prod.precio
      }]);
    }
    
    // Limpiar selección temporal
    setSelectedProduct('');
    setCantidad(1);
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.productoId !== id));
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clienteId) return alert("Selecciona un cliente");
    if (carrito.length === 0) return alert("Agrega al menos un producto");
    
    setLoading(true);
    const cliente = clientes.find(c => c.id === clienteId);
    
    try {
      // 1. Guardar la venta
      const ventaRef = await addDoc(collection(db, 'ventas'), {
        clienteId,
        clienteNombre: cliente.nombreCompleto,
        fechaVenta: serverTimestamp(),
        total: totalCarrito,
        detalles: carrito,
        tipoVenta
      });

      // 1.5 Si es financiada, crear préstamo
      if (tipoVenta === 'financiada') {
        const montoP = totalCarrito;
        const tasaI = Number(tasaInteres);
        const totalConInteres = montoP + (montoP * (tasaI / 100));

        await addDoc(collection(db, 'prestamos'), {
          clienteId,
          nombreCompleto: cliente.nombreCompleto,
          cedula: cliente.cedula,
          telefono: cliente.telefono,
          montoPrincipal: montoP,
          tasaInteres: tasaI,
          frecuenciaCobro,
          fechaInicio: serverTimestamp(),
          estado: 'activo',
          saldoPendiente: totalConInteres,
          totalInicial: totalConInteres,
          ventaId: ventaRef.id // Referencia cruzada
        });
      }

      // 2. Descontar Stock
      for (const item of carrito) {
        const prod = productos.find(p => p.id === item.productoId);
        const ref = doc(db, 'productos', prod.id);
        await updateDoc(ref, {
          stock: prod.stock - item.cantidad
        });
      }

      // 3. Limpiar y recargar
      setClienteId('');
      setCarrito([]);
      setTipoVenta('contado');
      setTasaInteres('');
      setFrecuenciaCobro('mensual');
      setShowForm(false);
      fetchData();
      alert('Venta procesada con éxito');
    } catch (error) {
      console.error("Error al guardar venta: ", error);
      alert('Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-100">Caja y Ventas</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showForm ? 'Cancelar' : 'Nueva Venta'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl  border border-none mb-8 flex flex-col md:flex-row gap-6">
          {/* Formulario / Selector */}
          <div className="flex-1 space-y-4">
            <h3 className="text-xl font-semibold border-b pb-2">Detalles de Facturación</h3>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Cliente</label>
              <select required value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full border border-transparent rounded-lg p-2.5 outline-none glass-panel">
                <option value="">-- Seleccionar --</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombreCompleto}</option>)}
              </select>
            </div>
            
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Pago</label>
              <select value={tipoVenta} onChange={(e) => setTipoVenta(e.target.value)} className="w-full border border-transparent rounded-lg p-2.5 outline-none glass-panel mb-4">
                <option value="contado">De Contado</option>
                <option value="financiada">Financiado (A Crédito)</option>
              </select>
              
              {tipoVenta === 'financiada' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Interés (%)</label>
                    <input required type="number" min="0" value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} className="w-full border border-transparent rounded-lg p-2.5 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Frecuencia</label>
                    <select value={frecuenciaCobro} onChange={(e) => setFrecuenciaCobro(e.target.value)} className="w-full border border-transparent rounded-lg p-2.5 outline-none glass-panel">
                      <option value="diario">Diario</option>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-slate-300 mb-1">Agregar Producto</label>
              <div className="flex gap-2">
                <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1 border border-transparent rounded-lg p-2.5 outline-none glass-panel">
                  <option value="">-- Buscar Producto --</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (${p.precio} - Stock: {p.stock})</option>)}
                </select>
                <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-20 border border-transparent rounded-lg p-2.5 outline-none text-center" />
                <button type="button" onClick={agregarAlCarrito} className="bg-gray-800 text-white p-2.5 rounded-lg hover:bg-gray-900"><Plus size={20}/></button>
              </div>
            </div>
          </div>

          {/* Carrito Resumen */}
          <div className="w-full md:w-1/3 bg-transparent p-4 rounded-xl border border-none flex flex-col">
            <h4 className="font-bold text-slate-300 mb-4">Resumen de Venta</h4>
            <div className="flex-1 overflow-y-auto max-h-48 space-y-2 mb-4">
              {carrito.length === 0 ? <p className="text-sm text-slate-600 text-center">Carrito vacío</p> : 
                carrito.map(item => (
                  <div key={item.productoId} className="flex justify-between items-center glass-panel p-2 rounded  text-sm">
                    <div>
                      <p className="font-medium">{item.nombre}</p>
                      <p className="text-slate-500">{item.cantidad} x ${item.precioUnitario}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">${item.subtotal}</span>
                      <button onClick={() => eliminarDelCarrito(item.productoId)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))
              }
            </div>
            <div className="border-t border-transparent pt-4 mb-4 flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-indigo-600">${totalCarrito}</span>
            </div>
            <button 
              onClick={handleSubmit} 
              disabled={loading || carrito.length === 0 || !clienteId} 
              className="w-full neon-button-emerald w-full sm:w-auto disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar y Cobrar'}
            </button>
          </div>
        </div>
      )}

      {/* Historial de Ventas */}
      <div className="glass-panel rounded-xl  border border-none overflow-hidden mt-8">
        <div className="p-4 border-b bg-transparent">
          <h3 className="font-bold text-slate-300">Historial de Ventas</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-none">
              <th className="p-4 text-sm font-semibold text-slate-400">Fecha</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Cliente</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Artículos</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Total Venta</th>
              <th className="p-4 text-sm font-semibold text-slate-400">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">No hay ventas registradas</td></tr>
            ) : (
              ventas.map(v => {
                const dateStr = v.fechaVenta ? new Date(v.fechaVenta.toDate()).toLocaleDateString() : 'Reciente';
                return (
                <tr key={v.id} className="border-b border-none hover:bg-transparent">
                  <td className="p-4 text-slate-400">{dateStr}</td>
                  <td className="p-4 font-medium text-slate-100">{v.clienteNombre}</td>
                  <td className="p-4 text-slate-400 text-sm">
                    {v.detalles.map((d, i) => <div key={i}>{d.cantidad}x {d.nombre}</div>)}
                  </td>
                  <td className="p-4 text-emerald-600 font-bold">${v.total}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.tipoVenta === 'financiada' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {v.tipoVenta === 'financiada' ? 'Crédito' : 'Contado'}
                    </span>
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

export default Ventas;
