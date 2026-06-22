import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, Plus, Download, MessageCircle, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../utils/auditLogger';

const Ventas = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  
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
  const [searchTerm, setSearchTerm] = useState('');

  // Estado de Financiación
  const [tipoVenta, setTipoVenta] = useState('contado');
  const [tasaInteres, setTasaInteres] = useState('');
  const [frecuenciaCobro, setFrecuenciaCobro] = useState('mensual');

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const emailLower = currentUser.email?.toLowerCase() || '';
      const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
      const isEstefania = emailLower.includes('estefania');
      const isVendor = isLizz || isEstefania;

      let ventasData = [];
      let clientesData = [];
      let productosData = [];

      if (isVendor) {
        // Vendedoras: Consultar de forma segura usando cláusulas 'where' para cumplir las reglas de Firestore
        const qV1 = query(collection(db, 'ventas'), where('created_by', '==', currentUser.uid));
        const qV2 = query(collection(db, 'ventas'), where('userId', '==', currentUser.uid));
        const qV3 = query(collection(db, 'ventas'), where('vendedor', '==', currentUser.email));

        const qC1 = query(collection(db, 'clientes'), where('created_by', '==', currentUser.uid));
        const qC2 = query(collection(db, 'clientes'), where('userId', '==', currentUser.uid));
        const qC3 = query(collection(db, 'clientes'), where('vendedor', '==', currentUser.email));

        const qP1 = query(collection(db, 'productos'), where('created_by', '==', currentUser.uid));
        const qP2 = query(collection(db, 'productos'), where('userId', '==', currentUser.uid));
        const qP3 = query(collection(db, 'productos'), where('vendedor', '==', currentUser.email));

        const [snapV1, snapV2, snapV3, snapC1, snapC2, snapC3, snapP1, snapP2, snapP3] = await Promise.all([
          getDocs(qV1), getDocs(qV2), getDocs(qV3),
          getDocs(qC1), getDocs(qC2), getDocs(qC3),
          getDocs(qP1), getDocs(qP2), getDocs(qP3)
        ]);

        const mapV = new Map();
        snapV1.docs.forEach(doc => mapV.set(doc.id, { id: doc.id, ...doc.data() }));
        snapV2.docs.forEach(doc => mapV.set(doc.id, { id: doc.id, ...doc.data() }));
        snapV3.docs.forEach(doc => mapV.set(doc.id, { id: doc.id, ...doc.data() }));
        ventasData = Array.from(mapV.values());

        const mapC = new Map();
        snapC1.docs.forEach(doc => mapC.set(doc.id, { id: doc.id, ...doc.data() }));
        snapC2.docs.forEach(doc => mapC.set(doc.id, { id: doc.id, ...doc.data() }));
        snapC3.docs.forEach(doc => mapC.set(doc.id, { id: doc.id, ...doc.data() }));
        clientesData = Array.from(mapC.values());

        const mapP = new Map();
        snapP1.docs.forEach(doc => mapP.set(doc.id, { id: doc.id, ...doc.data() }));
        snapP2.docs.forEach(doc => mapP.set(doc.id, { id: doc.id, ...doc.data() }));
        snapP3.docs.forEach(doc => mapP.set(doc.id, { id: doc.id, ...doc.data() }));
        productosData = Array.from(mapP.values());
      } else {
        // Administrador: Puede consultar la colección completa sin problemas
        const [snapVentas, snapClientes, snapProductos] = await Promise.all([
          getDocs(collection(db, 'ventas')),
          getDocs(collection(db, 'clientes')),
          getDocs(collection(db, 'productos'))
        ]);
        const allVentas = snapVentas.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allClientes = snapClientes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allProductos = snapProductos.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        ventasData = allVentas.filter(filterFn);
        clientesData = allClientes.filter(filterFn);
        productosData = allProductos.filter(filterFn);
      }

      // Ordenar en memoria
      ventasData.sort((a, b) => {
        const tA = a.fechaVenta?.toMillis ? a.fechaVenta.toMillis() : (a.fechaVenta ? new Date(a.fechaVenta).getTime() : 0);
        const tB = b.fechaVenta?.toMillis ? b.fechaVenta.toMillis() : (b.fechaVenta ? new Date(b.fechaVenta).getTime() : 0);
        return tB - tA;
      });

      clientesData.sort((a, b) => (a.nombreCompleto || '').localeCompare(b.nombreCompleto || ''));
      productosData.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

      setVentas(ventasData);
      setClientes(clientesData);
      setProductos(productosData.filter(p => p.stock > 0));
    } catch (error) {
      console.error("Error cargando datos: ", error);
    }
  };

  const handleWhatsAppReceipt = (v) => {
    const clientObj = clientes.find(c => c.id === v.clienteId);
    const phone = clientObj?.telefono || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;

    const articulosStr = v.detalles.map(d => `• ${d.cantidad}x ${d.nombre} ($${d.precioUnitario})`).join('\n');
    const message = `Hola *${v.clienteNombre}*, ¡gracias por tu compra en DIGIWILL! 🛍️\n\n` +
                    `Detalle de tu compra:\n` +
                    `${articulosStr}\n\n` +
                    `• Total: *$${v.total}*\n` +
                    `• Tipo de pago: *${v.tipoVenta === 'financiada' ? 'Crédito' : 'Contado'}*\n\n` +
                    `Cualquier duda o comentario, estamos a tu disposición. ✨`;

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePrintTicket = (v) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return alert('Por favor habilita las ventanas emergentes (popups) para imprimir.');
    
    const articulosHtml = v.detalles.map(d => `
      <tr>
        <td style="padding: 4px 0; text-align: left;">${d.cantidad}x ${d.nombre}</td>
        <td style="padding: 4px 0; text-align: right;">$${(d.cantidad * d.precioUnitario).toLocaleString()}</td>
      </tr>
    `).join('');

    const fechaStr = v.fechaVenta ? new Date(v.fechaVenta.toDate()).toLocaleString() : new Date().toLocaleString();

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Venta #${v.id.substring(0, 8)}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; }
            }
            body { 
              width: 260px; 
              margin: 0 auto; 
              padding: 10px; 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 11px; 
              color: #000;
              background-color: #fff;
            }
            .text-center { text-align: center; }
            .header { margin-bottom: 10px; }
            .logo { width: 50px; height: 50px; border-radius: 50%; object-fit: contain; }
            .title { font-size: 14px; font-weight: bold; margin: 4px 0; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .totals { margin-top: 10px; font-weight: bold; font-size: 12px; }
            .footer { margin-top: 20px; font-size: 9px; line-height: 1.2; }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <img src="/logo.png" class="logo" alt="Logo" />
            <div class="title">DIGIWILL</div>
            <p style="margin: 2px 0;">Soluciones Comerciales & Crédito</p>
            <p style="margin: 2px 0; font-size: 9px;">Ticket: #${v.id.substring(0, 8).toUpperCase()}</p>
            <p style="margin: 2px 0; font-size: 9px;">Fecha: ${fechaStr}</p>
          </div>
          
          <div class="divider"></div>
          
          <p style="margin: 4px 0;"><strong>Cliente:</strong> ${v.clienteNombre}</p>
          <p style="margin: 4px 0;"><strong>Operador:</strong> ${v.userEmail || 'DIGIWILL Operator'}</p>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 3px;">Detalle</th>
                <th style="text-align: right; padding-bottom: 3px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${articulosHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table class="totals">
            <tr>
              <td style="text-align: left;">TOTAL:</td>
              <td style="text-align: right;">$${v.total.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="text-align: left; font-size: 9px; font-weight: normal;">Método:</td>
              <td style="text-align: right; font-size: 9px; font-weight: normal; text-transform: uppercase;">${v.tipoVenta === 'financiada' ? 'A Crédito' : 'De Contado'}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="text-center footer">
            <p style="margin: 3px 0; font-weight: bold;">¡Gracias por tu compra! 🛍️</p>
            <p style="margin: 3px 0;">Conserva este soporte de pago.</p>
            <p style="margin: 8px 0 0 0; font-size: 8px; color: #555;">DIGIWILL Platform</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    if (ventas.length === 0) return alert('No hay ventas para exportar.');
    
    const headers = ['ID', 'Fecha', 'Cliente', 'Articulos', 'Total Venta', 'Tipo de Venta'];
    const rows = ventas.map(v => [
      v.id,
      v.fechaVenta ? new Date(v.fechaVenta.toDate()).toLocaleString() : 'Reciente',
      v.clienteNombre,
      v.detalles.map(d => `${d.cantidad}x ${d.nombre}`).join('; '),
      v.total,
      v.tipoVenta === 'financiada' ? 'Credito' : 'Contado'
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_export_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, activeTab]);

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
          ? { ...item, cantidad: item.cantidad + cant, subtotal: (item.cantidad + cant) * item.valorVenta }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        productoId: prod.id,
        nombre: prod.nombre,
        precioUnitario: prod.valorVenta,
        cantidad: cant,
        subtotal: cant * prod.valorVenta
      }]);
    }
    
    // Limpiar selección temporal
    setSelectedProduct('');
    setCantidad(1);
    setSearchTerm('');
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.productoId !== id));
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
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
        tipoVenta,
        created_by: currentUser.uid, // Campo de auditoría
        userId: currentUser.uid,      // Legacy
        userEmail: currentUser.email   // Legacy
      });

      // Auditoría
      await logActivity(currentUser, 'creacion_venta', `Registró una venta (${tipoVenta === 'financiada' ? 'Financiada' : 'De contado'}) por un total de $${totalCarrito} al cliente '${cliente.nombreCompleto}'`, 'ventas', ventaRef.id);

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
          ventaId: ventaRef.id,
          created_by: currentUser.uid, // Campo de auditoría
          userId: currentUser.uid,      // Legacy
          userEmail: currentUser.email   // Legacy
        });
      }

      // 2. Descontar Stock y registrar en Kardex
      for (const item of carrito) {
        const prod = productos.find(p => p.id === item.productoId);
        const ref = doc(db, 'productos', prod.id);
        await updateDoc(ref, {
          stock: prod.stock - item.cantidad
        });

        // Registrar en Kardex
        await addDoc(collection(db, 'kardex'), {
          productoId: item.productoId,
          productoNombre: item.nombre,
          tipo: 'salida',
          cantidad: item.cantidad,
          detalle: `Venta registrada de contado/crédito a cliente ${cliente.nombreCompleto}`,
          fecha: serverTimestamp(),
          created_by: currentUser.uid,
          userId: currentUser.uid,
          userEmail: currentUser.email
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
      alert('Error al procesar la venta. Revisa las reglas o permisos.');
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-bold text-slate-100">Caja y Ventas</h2>
          {!isVendor && (
            <div className="flex border-b border-indigo-900/50 mt-4 gap-2">
              <button
                onClick={() => setActiveTab('mio')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'mio' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Mis Ventas
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {showForm ? 'Cancelar' : 'Nueva Venta'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-xl border border-none mb-8 flex flex-col md:flex-row gap-6">
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
              <label className="block text-sm font-medium text-slate-300 mb-1">Buscar y Agregar Producto</label>
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Escribe nombre o código de producto..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full border border-transparent rounded-lg p-2.5 outline-none"
                />
                <div className="flex gap-2">
                  <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1 border border-transparent rounded-lg p-2.5 outline-none glass-panel">
                    <option value="">-- Seleccionar ({productos.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase()))).length} encontrados) --</option>
                    {productos
                      .filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase())))
                      .map(p => <option key={p.id} value={p.id}>{p.nombre} (${p.valorVenta} - Stock: {p.stock})</option>)
                    }
                  </select>
                  <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-20 border border-transparent rounded-lg p-2.5 outline-none text-center" />
                  <button type="button" onClick={agregarAlCarrito} className="bg-gray-800 text-white p-2.5 rounded-lg hover:bg-gray-900"><Plus size={20}/></button>
                </div>
              </div>
            </div>
          </div>

          {/* Carrito Resumen */}
          <div className="w-full md:w-1/3 bg-transparent p-4 rounded-xl border border-none flex flex-col">
            <h4 className="font-bold text-slate-300 mb-4">Resumen de Venta</h4>
            <div className="flex-1 overflow-y-auto max-h-48 space-y-2 mb-4">
              {carrito.length === 0 ? <p className="text-sm text-slate-600 text-center">Carrito vacío</p> : 
                carrito.map(item => (
                  <div key={item.productoId} className="flex justify-between items-center glass-panel p-2 rounded text-sm">
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
      <div className="glass-panel rounded-xl border border-none overflow-hidden mt-8 overflow-x-auto">
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
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay ventas registradas</td></tr>
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
                  <td className="p-4 flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.tipoVenta === 'financiada' ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30' : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'}`}>
                      {v.tipoVenta === 'financiada' ? 'Crédito' : 'Contado'}
                    </span>
                    <button 
                      onClick={() => handleWhatsAppReceipt(v)} 
                      className="text-xs bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 border border-emerald-500/30 p-1.5 rounded-lg transition-colors flex items-center gap-1"
                      title="Enviar Recibo por WhatsApp"
                    >
                      <MessageCircle size={12} />
                      Recibo
                    </button>
                    <button 
                      onClick={() => handlePrintTicket(v)} 
                      className="text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30 p-1.5 rounded-lg transition-colors flex items-center gap-1"
                      title="Imprimir Ticket POS"
                    >
                      <Printer size={12} />
                      Ticket
                    </button>
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
