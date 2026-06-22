import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Wallet, Package, TrendingUp, AlertTriangle, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [metricas, setMetricas] = useState({
    prestamosActivos: 0,
    saldoPendienteTotal: 0,
    productosTotal: 0,
    valorInventario: 0,
    ventasTotal: 0,
    egresosTotal: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mio'); // 'mio', 'lizz', 'estefania'
  const [productoEstrella, setProductoEstrella] = useState({ nombre: 'Ninguno', cantidad: 0 });
  const [topDeudores, setTopDeudores] = useState([]);

  useEffect(() => {
    const fetchMetricas = async () => {
      if (!currentUser) return;
      try {
        const emailLower = currentUser.email?.toLowerCase() || '';
        const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
        const isEstefania = emailLower.includes('estefania');
        const isVendor = isLizz || isEstefania;
        
        let prestamosCount = 0;
        let saldoTotal = 0;
        let productosCount = 0;
        let valorInv = 0;
        let ventasTotal = 0;
        let egresosTotal = 0;
        let productsData = [];

        const productSalesCount = {};
        const clientDebts = {};

        if (isVendor) {
          // Vendedoras: Consultar de forma segura usando cláusulas 'where' para cumplir las reglas de Firestore
          const qP1 = query(collection(db, 'prestamos'), where('estado', '==', 'activo'), where('created_by', '==', currentUser.uid));
          const qP2 = query(collection(db, 'prestamos'), where('estado', '==', 'activo'), where('userId', '==', currentUser.uid));
          const qP3 = query(collection(db, 'prestamos'), where('estado', '==', 'activo'), where('vendedor', '==', currentUser.email));

          const qPr1 = query(collection(db, 'productos'), where('created_by', '==', currentUser.uid));
          const qPr2 = query(collection(db, 'productos'), where('userId', '==', currentUser.uid));
          const qPr3 = query(collection(db, 'productos'), where('vendedor', '==', currentUser.email));

          const qV1 = query(collection(db, 'ventas'), where('created_by', '==', currentUser.uid));
          const qV2 = query(collection(db, 'ventas'), where('userId', '==', currentUser.uid));
          const qV3 = query(collection(db, 'ventas'), where('vendedor', '==', currentUser.email));

          const qG1 = query(collection(db, 'gastos'), where('created_by', '==', currentUser.uid));
          const qG2 = query(collection(db, 'gastos'), where('userId', '==', currentUser.uid));
          const qG3 = query(collection(db, 'gastos'), where('vendedor', '==', currentUser.email));

          const [sP1, sP2, sP3, sPr1, sPr2, sPr3, sV1, sV2, sV3, sG1, sG2, sG3] = await Promise.all([
            getDocs(qP1), getDocs(qP2), getDocs(qP3),
            getDocs(qPr1), getDocs(qPr2), getDocs(qPr3),
            getDocs(qV1), getDocs(qV2), getDocs(qV3),
            getDocs(qG1), getDocs(qG2), getDocs(qG3)
          ]);

          const mapP = new Map();
          sP1.docs.forEach(doc => mapP.set(doc.id, doc.data()));
          sP2.docs.forEach(doc => mapP.set(doc.id, doc.data()));
          sP3.docs.forEach(doc => mapP.set(doc.id, doc.data()));
          
          const mapPr = new Map();
          sPr1.docs.forEach(doc => mapPr.set(doc.id, { id: doc.id, ...doc.data() }));
          sPr2.docs.forEach(doc => mapPr.set(doc.id, { id: doc.id, ...doc.data() }));
          sPr3.docs.forEach(doc => mapPr.set(doc.id, { id: doc.id, ...doc.data() }));

          const mapV = new Map();
          sV1.docs.forEach(doc => mapV.set(doc.id, doc.data()));
          sV2.docs.forEach(doc => mapV.set(doc.id, doc.data()));
          sV3.docs.forEach(doc => mapV.set(doc.id, doc.data()));

          const mapG = new Map();
          sG1.docs.forEach(doc => mapG.set(doc.id, doc.data()));
          sG2.docs.forEach(doc => mapG.set(doc.id, doc.data()));
          sG3.docs.forEach(doc => mapG.set(doc.id, doc.data()));

          mapP.forEach(data => {
            prestamosCount++;
            saldoTotal += Number(data.saldoPendiente || 0);
            clientDebts[data.nombreCompleto] = (clientDebts[data.nombreCompleto] || 0) + Number(data.saldoPendiente || 0);
          });

          mapPr.forEach(data => {
            productosCount++;
            valorInv += Number(data.stock || 0) * Number(data.valorCompra || data.valorVenta || 0);
            productsData.push(data);
          });

          mapV.forEach(data => {
            ventasTotal += Number(data.total || 0);
            if (data.detalles) {
              data.detalles.forEach(item => {
                productSalesCount[item.nombre] = (productSalesCount[item.nombre] || 0) + Number(item.cantidad || 0);
              });
            }
          });

          mapG.forEach(data => {
            egresosTotal += Number(data.monto || 0);
          });
        } else {
          // Administrador: Puede consultar la colección completa sin problemas
          const [snapPrestamos, snapProductos, snapVentas, snapGastos] = await Promise.all([
            getDocs(query(collection(db, 'prestamos'), where('estado', '==', 'activo'))),
            getDocs(collection(db, 'productos')),
            getDocs(collection(db, 'ventas')),
            getDocs(collection(db, 'gastos'))
          ]);

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

          snapPrestamos.forEach(doc => {
            const data = doc.data();
            if (filterFn(data)) {
              prestamosCount++;
              saldoTotal += Number(data.saldoPendiente || 0);
              clientDebts[data.nombreCompleto] = (clientDebts[data.nombreCompleto] || 0) + Number(data.saldoPendiente || 0);
            }
          });

          snapProductos.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            if (filterFn(data)) {
              productosCount++;
              valorInv += Number(data.stock || 0) * Number(data.valorCompra || data.valorVenta || 0);
              productsData.push(data);
            }
          });

          snapVentas.forEach(doc => {
            const data = doc.data();
            if (filterFn(data)) {
              ventasTotal += Number(data.total || 0);
              if (data.detalles) {
                data.detalles.forEach(item => {
                  productSalesCount[item.nombre] = (productSalesCount[item.nombre] || 0) + Number(item.cantidad || 0);
                });
              }
            }
          });

          snapGastos.forEach(doc => {
            const data = doc.data();
            if (filterFn(data)) {
              egresosTotal += Number(data.monto || 0);
            }
          });
        }

        // Calcular producto estrella
        let maxSales = 0;
        let prodEstrellaNombre = 'Ninguno';
        for (const name in productSalesCount) {
          if (productSalesCount[name] > maxSales) {
            maxSales = productSalesCount[name];
            prodEstrellaNombre = name;
          }
        }
        setProductoEstrella({ nombre: prodEstrellaNombre, cantidad: maxSales });

        // Calcular top deudores
        const debtorsList = Object.keys(clientDebts)
          .map(name => ({ name, debt: clientDebts[name] }))
          .sort((a, b) => b.debt - a.debt)
          .slice(0, 3);
        setTopDeudores(debtorsList);

        setMetricas({
          prestamosActivos: prestamosCount,
          saldoPendienteTotal: saldoTotal,
          productosTotal: productosCount,
          valorInventario: valorInv,
          ventasTotal: ventasTotal,
          egresosTotal: egresosTotal
        });

        // Filtrar productos con stock bajo (3 o menos)
        setLowStockProducts(productsData.filter(p => p.stock <= 3));

      } catch (error) {
        console.error("Error obteniendo métricas: ", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchMetricas();
    }
  }, [currentUser, activeTab]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-slate-500">Cargando métricas...</div>;
  }

  const emailLower = currentUser?.email?.toLowerCase() || '';
  const isLizz = emailLower.includes('liz') || emailLower.includes('vendedor1');
  const isEstefania = emailLower.includes('estefania');
  const isVendor = isLizz || isEstefania;

  const maxVal = Math.max(metricas.ventasTotal, metricas.egresosTotal, 1);
  const ingresosHeight = (metricas.ventasTotal / maxVal) * 120;
  const egresosHeight = (metricas.egresosTotal / maxVal) * 120;

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 neon-text flex items-center gap-2">Panel General (Dashboard)</h2>
          {!isVendor && (
            <div className="flex border-b border-indigo-900/50 mt-4 gap-2">
              <button
                onClick={() => setActiveTab('mio')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'mio' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Mis Métricas
              </button>
              <button
                onClick={() => setActiveTab('lizz')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'lizz' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Métricas Liz
              </button>
              <button
                onClick={() => setActiveTab('estefania')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'estefania' ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Métricas Estefanía
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card: Préstamos */}
        <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-indigo-900/50 text-indigo-400 rounded-lg neon-border">
            <Wallet size={24} />
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium">Préstamos Activos ({metricas.prestamosActivos})</h3>
            <p className="text-3xl font-bold text-indigo-300 mt-1 neon-text">${metricas.saldoPendienteTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Saldo pendiente en la calle</p>
          </div>
        </div>

        {/* Card: Inventario */}
        <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-emerald-900/50 text-emerald-400 rounded-lg border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Package size={24} />
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium">Productos en Stock ({metricas.productosTotal})</h3>
            <p className="text-3xl font-bold text-emerald-300 mt-1 neon-text-emerald">${metricas.valorInventario.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Valor estimado del inventario</p>
          </div>
        </div>

        {/* Card: Ventas / Ingresos */}
        <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-blue-900/50 text-blue-400 rounded-lg border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium">Ingresos por Ventas</h3>
            <p className="text-3xl font-bold text-blue-300 mt-1 text-shadow-[0_0_10px_rgba(59,130,246,0.8)]">${metricas.ventasTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Total acumulado</p>
          </div>
        </div>

      </div>

      {/* Nueva fila de KPIs Avanzados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Card: Producto Estrella */}
        <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-amber-900/40 text-amber-400 rounded-lg border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <span className="text-xl">⭐</span>
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium">Producto Estrella (Más Vendido)</h3>
            <p className="text-2xl font-bold text-amber-300 mt-1 uppercase tracking-wider">{productoEstrella.nombre}</p>
            <p className="text-xs text-slate-500 mt-1">Total vendido: <span className="font-bold text-slate-300">{productoEstrella.cantidad}</span> unidades</p>
          </div>
        </div>

        {/* Card: Top Deudores */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-1.5">
            <span className="text-rose-400">⚠️</span>
            Top 3 Clientes con Mayor Deuda
          </h3>
          {topDeudores.length === 0 ? (
            <p className="text-xs text-slate-500">No hay deudas registradas.</p>
          ) : (
            <div className="space-y-2">
              {topDeudores.map((debtor, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b border-indigo-950/20 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-slate-300 font-medium">{index + 1}. {debtor.name}</span>
                  <span className="font-bold text-rose-400">${debtor.debt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Double-Bar Chart comparison panel */}
      <div className="glass-panel p-6 rounded-xl border border-none md:col-span-3 mt-6">
        <h3 className="text-xl font-bold text-slate-200 mb-4 neon-text flex items-center gap-2">
          <Receipt className="text-indigo-400" size={20} />
          Comparativa de Flujo de Caja (Ventas vs Gastos)
        </h3>
        <div className="flex flex-col md:flex-row items-center gap-8 justify-around">
          
          <svg className="w-full max-w-md h-52 overflow-visible" viewBox="0 0 300 180">
            <defs>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#be123c" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <line x1="40" y1="20" x2="280" y2="20" stroke="#1e293b" strokeDasharray="3" />
            <line x1="40" y1="80" x2="280" y2="80" stroke="#1e293b" strokeDasharray="3" />
            <line x1="40" y1="140" x2="280" y2="140" stroke="#475569" strokeWidth="2" />
            
            {/* Y-Axis text */}
            <text x="35" y="24" fill="#64748b" fontSize="8" textAnchor="end">${maxVal.toLocaleString()}</text>
            <text x="35" y="84" fill="#64748b" fontSize="8" textAnchor="end">${(maxVal/2).toLocaleString()}</text>
            <text x="35" y="144" fill="#64748b" fontSize="8" textAnchor="end">$0</text>
            
            {/* Bar: Ingresos */}
            <rect 
              x="80" 
              y={140 - ingresosHeight} 
              width="40" 
              height={ingresosHeight} 
              fill="url(#gradIngresos)" 
              rx="4" 
              stroke="#10b981"
              strokeWidth="1.5"
            />
            <text x="100" y={130 - ingresosHeight} fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">${metricas.ventasTotal.toLocaleString()}</text>
            <text x="100" y="155" fill="#94a3b8" fontSize="9" textAnchor="middle">Ventas</text>
            
            {/* Bar: Egresos */}
            <rect 
              x="180" 
              y={140 - egresosHeight} 
              width="40" 
              height={egresosHeight} 
              fill="url(#gradEgresos)" 
              rx="4" 
              stroke="#f43f5e"
              strokeWidth="1.5"
            />
            <text x="200" y={130 - egresosHeight} fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="middle">${metricas.egresosTotal.toLocaleString()}</text>
            <text x="200" y="155" fill="#94a3b8" fontSize="9" textAnchor="middle">Gastos</text>
          </svg>
          
          {/* Metrics summary list */}
          <div className="space-y-4 w-full max-w-xs">
            <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
              <span className="text-emerald-400 font-medium text-sm">Ingresos Totales</span>
              <span className="text-lg font-bold text-slate-100">${metricas.ventasTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
              <span className="text-rose-400 font-medium text-sm">Egresos Totales</span>
              <span className="text-lg font-bold text-slate-100">${metricas.egresosTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20">
              <span className="text-indigo-400 font-medium text-sm">Utilidad Neta</span>
              <span className={`text-lg font-bold ${metricas.ventasTotal - metricas.egresosTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${(metricas.ventasTotal - metricas.egresosTotal).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Stock alerts */}
      {lowStockProducts.length > 0 && (
        <div className="glass-panel p-6 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] mt-6">
          <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="animate-bounce" />
            Alerta de Inventario: Stock Crítico
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {lowStockProducts.map(p => (
              <div key={p.id} className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg flex justify-between items-center">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-slate-200 text-sm truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-500">Precio Venta: ${p.valorVenta}</p>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${p.stock <= 0 ? 'bg-rose-900/40 text-rose-300 border border-rose-500/30' : 'bg-amber-900/40 text-amber-300 border border-amber-500/30'}`}>
                  {p.stock <= 0 ? 'Agotado' : `${p.stock} Uds`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
