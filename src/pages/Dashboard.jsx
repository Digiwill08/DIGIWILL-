import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Wallet, Package, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [metricas, setMetricas] = useState({
    prestamosActivos: 0,
    saldoPendienteTotal: 0,
    capitalPrestado: 0,
    interesEsperado: 0,
    productosTotal: 0,
    valorInventario: 0,
    ventasTotal: 0,
    recaudoHoy: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState("Iniciando...");
  const [errorDetails, setErrorDetails] = useState("");

  useEffect(() => {
    const fetchMetricas = async () => {
      try {
        setLoadingStep("Obteniendo préstamos (1/4)...");
        const snapPrestamos = await getDocs(collection(db, 'prestamos'));
        let prestamosCount = 0;
        let saldoTotal = 0;
        let capitalTotal = 0;
        snapPrestamos.forEach(doc => {
          const data = doc.data();
          if (data.estado === 'activo') {
            prestamosCount++;
            saldoTotal += Number(data.saldoPendiente || 0);
            
            // Estimar capital e interés restante
            const totalInic = Number(data.totalInicial || data.montoPrincipal || 1);
            const capInic = Number(data.montoPrincipal || 0);
            const proporcionCapital = capInic / totalInic;
            
            capitalTotal += Number(data.saldoPendiente || 0) * proporcionCapital;
          }
        });

        const interesTotal = saldoTotal - capitalTotal;

        setLoadingStep("Obteniendo inventario (2/4)...");
        const snapProductos = await getDocs(collection(db, 'productos'));
        let productosCount = 0;
        let valorInv = 0;
        snapProductos.forEach(doc => {
          productosCount++;
          const data = doc.data();
          valorInv += Number(data.stock || 0) * Number(data.costo || data.precio || 0);
        });

        setLoadingStep("Obteniendo ventas (3/4)...");
        const snapVentas = await getDocs(collection(db, 'ventas'));
        let ventasTotal = 0;
        snapVentas.forEach(doc => {
          ventasTotal += Number(doc.data().total || 0);
        });

        setLoadingStep("Obteniendo recaudo hoy (4/4)...");
        const snapPagos = await getDocs(collection(db, 'pagos'));
        let recaudoHoyTotal = 0;
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        
        snapPagos.forEach(doc => {
          const data = doc.data();
          if (data.fechaPago) {
            let fechaPago = null;
            if (typeof data.fechaPago.toDate === 'function') {
              fechaPago = data.fechaPago.toDate();
            } else if (data.fechaPago.seconds) {
              fechaPago = new Date(data.fechaPago.seconds * 1000);
            } else {
              fechaPago = new Date(data.fechaPago);
            }
            
            if (fechaPago && fechaPago >= hoy) {
              recaudoHoyTotal += Number(data.montoAbonado || 0);
            }
          }
        });

        setMetricas({
          prestamosActivos: prestamosCount,
          saldoPendienteTotal: saldoTotal,
          capitalPrestado: capitalTotal,
          interesEsperado: interesTotal,
          productosTotal: productosCount,
          valorInventario: valorInv,
          ventasTotal: ventasTotal,
          recaudoHoy: recaudoHoyTotal
        });
      } catch (error) {
        console.error("Error obteniendo métricas: ", error);
        setErrorDetails(error.message || String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchMetricas();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="text-xl font-semibold">Cargando métricas...</div>
        <div className="text-indigo-400">{loadingStep}</div>
        {errorDetails && <div className="text-red-500 text-sm">{errorDetails}</div>}
      </div>
    );
  }

  if (errorDetails) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-red-400 gap-4">
        <div className="text-xl font-semibold">Error al cargar métricas</div>
        <div className="text-sm">{errorDetails}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-slate-100 mb-6 neon-text flex items-center gap-2">Panel General (Dashboard)</h2>
      
      <div className="flex flex-col gap-6">
        
        {/* Fila 1: Métricas Financieras Principales */}
        <h3 className="text-xl font-semibold text-slate-300 mt-2 border-b border-slate-700/50 pb-2">Resumen Financiero Diario</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
            <div className="p-3 bg-emerald-900/50 text-emerald-400 rounded-lg neon-border shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <TrendingUp size={28} />
            </div>
            <div>
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Recaudo de Hoy</h3>
              <p className="text-4xl font-bold text-emerald-400 mt-2 neon-text-emerald">${metricas.recaudoHoy.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Ingresos por abonos</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
            <div className="p-3 bg-indigo-900/50 text-indigo-400 rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <Wallet size={28} />
            </div>
            <div>
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Capital Vivo</h3>
              <p className="text-3xl font-bold text-slate-200 mt-2">${Math.round(metricas.capitalPrestado).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Dinero real en la calle</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl flex items-start gap-4">
            <div className="p-3 bg-orange-900/50 text-orange-400 rounded-lg shadow-[0_0_10px_rgba(249,115,22,0.2)]">
              <TrendingUp size={28} />
            </div>
            <div>
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Interés Esperado</h3>
              <p className="text-3xl font-bold text-orange-400 mt-2">+${Math.round(metricas.interesEsperado).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Ganancia proyectada</p>
            </div>
          </div>

        </div>

        {/* Fila 2: Estadísticas Generales */}
        <h3 className="text-xl font-semibold text-slate-300 mt-4 border-b border-slate-700/50 pb-2">Estadísticas del Negocio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="glass-panel p-6 rounded-xl flex items-start gap-4 opacity-90">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="text-slate-400 text-sm font-medium">Deuda Total Activa</h3>
              <p className="text-2xl font-bold text-slate-200 mt-1">${metricas.saldoPendienteTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{metricas.prestamosActivos} préstamos vigentes</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl flex items-start gap-4 opacity-90">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-slate-400 text-sm font-medium">Inventario</h3>
              <p className="text-2xl font-bold text-slate-200 mt-1">${metricas.valorInventario.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{metricas.productosTotal} referencias en stock</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl flex items-start gap-4 opacity-90">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-slate-400 text-sm font-medium">Ventas Totales</h3>
              <p className="text-2xl font-bold text-slate-200 mt-1">${metricas.ventasTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Histórico de facturación</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
