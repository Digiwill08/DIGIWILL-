import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Clientes = () => {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);

  const [formData, setFormData] = useState({
    nombreCompleto: '',
    cedula: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  const fetchClientes = async () => {
    try {
      const q = query(collection(db, 'clientes'), orderBy('fechaRegistro', 'desc'));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (['vendedor1@digiwill.com', 'estefania@digiwill.com'].includes(currentUser?.email?.toLowerCase())) {
        data = data.filter(d => d.vendedor === currentUser.email);
      }

      setClientes(data);
    } catch (error) {
      console.error("Error cargando clientes: ", error);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'clientes'), {
        nombreCompleto: formData.nombreCompleto,
        cedula: formData.cedula,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
        fechaRegistro: serverTimestamp(),
        vendedor: currentUser?.email || 'admin'
      });
      
      setFormData({ nombreCompleto: '', cedula: '', telefono: '', email: '', direccion: '' });
      setShowForm(false);
      fetchClientes();
      alert('Cliente registrado con éxito!');
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
        <h2 className="text-3xl font-bold text-slate-100">Base de Clientes</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="neon-button px-4 py-2 rounded-lg font-medium"
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
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500">No hay clientes registrados</td>
              </tr>
            ) : (
              clientes.map(c => (
                <tr key={c.id} className="border-b border-none hover:bg-transparent">
                  <td className="p-4 font-medium text-slate-100">{c.nombreCompleto}</td>
                  <td className="p-4 text-slate-400">{c.cedula}</td>
                  <td className="p-4 text-slate-400">{c.telefono} <br/><span className="text-xs text-slate-500">{c.email}</span></td>
                  <td className="p-4 text-slate-400">{c.direccion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clientes;
