import React, { useEffect, useState } from 'react';

const ETAPAS = ['Precalificación', 'Avalúo', 'Escrituración', 'Concluido'];

export default function App() {
  const [procesos, setProcesos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroSemaforo, setFiltroSemaforo] = useState('TODOS');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [pestanaModal, setPestanaModal] = useState('proceso');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const [nuevoForm, setNuevoForm] = useState({ idCliente: '', idTerreno: '', formaPago: 'Crédito', institucion: 'INFONAVIT', etapa: 'Precalificación' });

  useEffect(() => { cargarProcesos(); }, []);

  const cargarProcesos = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/procesos');
      const data = await res.json();
      setProcesos(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const guardarCambiosModalCompleto = async () => {
    try {
      await fetch('http://localhost:3001/api/procesos/editar-completo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idProceso: procesoSeleccionado.idProceso,
          datosProceso: {
            idCliente: procesoSeleccionado.idCliente,
            idTerreno: procesoSeleccionado.idTerreno,
            idEmpresa: procesoSeleccionado.idEmpresa,
            formaPago: procesoSeleccionado.formaPago,
            institucion: procesoSeleccionado.institucion,
            etapa: procesoSeleccionado.etapa
          },
          datosCliente: {
            idCliente: procesoSeleccionado.idCliente,
            nombreCliente: procesoSeleccionado.nombreCliente,
            telefonoCliente: procesoSeleccionado.telefonoCliente,
            correoCliente: procesoSeleccionado.correoCliente
          },
          datosTerreno: {
            idTerreno: procesoSeleccionado.idTerreno,
            manzana: procesoSeleccionado.manzana,
            lote: procesoSeleccionado.lote,
            precioLista: procesoSeleccionado.precioLista
          },
          datosEmpresa: {
            idEmpresa: procesoSeleccionado.idEmpresa,
            nombreEmpresa: procesoSeleccionado.nombreEmpresa
          }
        })
      });
      setProcesoSeleccionado(null);
      cargarProcesos();
    } catch (err) { alert('Error al guardar cambios completos'); }
  };

  const crearExpediente = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:3001/api/procesos/nuevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoForm)
      });
      setModalNuevo(false);
      setNuevoForm({ idCliente: '', idTerreno: '', formaPago: 'Crédito', institucion: 'INFONAVIT', etapa: 'Precalificación' });
      cargarProcesos();
    } catch (err) { alert('Error al registrar'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setSubiendo(true);

    try {
      const res = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('¡Excel actualizado exitosamente!');
        cargarProcesos();
      } else {
        alert(`Error al subir: ${data.error || 'Asegúrate de cerrar el archivo Excel antes'}`);
      }
    } catch (err) {
      alert('Error al intentar conectar con el servidor.');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const procesosFiltrados = procesos.filter((p) => {
    const coincideTexto = Object.values(p).some(val => String(val).toLowerCase().includes(busqueda.toLowerCase()));
    const coincideSemaforo = filtroSemaforo === 'TODOS' || p.estadoExpediente.includes(filtroSemaforo);
    return coincideTexto && coincideSemaforo;
  });

  const totalExpedientes = procesos.length;
  const promedioAvance = totalExpedientes ? Math.round(procesos.reduce((a, b) => a + b.porcentajeAvance, 0) / totalExpedientes) : 0;
  const listos = procesos.filter(p => p.porcentajeAvance >= 80).length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      
      {/* Encabezado */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>🏢 BD PROCESOS ACTIVOS DE VENTAS</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Consolidación en tiempo real de las 4 pestañas de Excel</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalNuevo(true)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            ➕ Nuevo Expediente
          </button>
          <label style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {subiendo ? 'Cargando...' : '📁 Actualizar Excel'}
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </header>

      {/* Dashboard KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TOTAL EXPEDIENTES</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{totalExpedientes}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>AVANCE PROMEDIO CARTERA</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>{promedioAvance}%</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>LISTOS PARA ESCRITURAR</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{listos}</div>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔎 Buscar folio, cliente, lote, empresa..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: '240px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
        />

        <div style={{ display: 'flex', gap: '6px' }}>
          {['TODOS', '🟢', '🟡', '🔴'].map(sem => (
            <button
              key={sem}
              onClick={() => setFiltroSemaforo(sem)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                backgroundColor: filtroSemaforo === sem ? '#0f172a' : '#ffffff',
                color: filtroSemaforo === sem ? '#ffffff' : '#0f172a',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              {sem}
            </button>
          ))}
        </div>
      </div>

      {/* Tablero Kanban */}
      {loading ? <p>Cargando información consolidada...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {ETAPAS.map((etapa) => {
            const itemsEtapa = procesosFiltrados.filter((p) => p.etapa.toLowerCase().includes(etapa.toLowerCase()));

            return (
              <div key={etapa} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>{etapa}</h3>
                  <span style={{ backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: 'bold' }}>{itemsEtapa.length}</span>
                </div>

                {itemsEtapa.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Sin registros</p>
                ) : (
                  itemsEtapa.map((p) => (
                    <div
                      key={p.idProceso}
                      onClick={() => { setProcesoSeleccionado({ ...p }); setPestanaModal('proceso'); }}
                      style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                        <span>{p.idProceso}</span>
                        <span>{p.estadoExpediente}</span>
                      </div>
                      
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 'bold', margin: '4px 0' }}>
                        👤 {p.nombreCliente}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        📍 Mza: {p.manzana} - Lote: {p.lote} (Terreno ID: {p.idTerreno})
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        💳 {p.formaPago} - {p.institucion}
                      </div>

                      <div style={{ backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                        <div style={{ width: `${p.porcentajeAvance}%`, backgroundColor: p.porcentajeAvance >= 80 ? '#22c55e' : p.porcentajeAvance >= 40 ? '#eab308' : '#ef4444', height: '100%' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detalle Extendido con Pestañas */}
      {procesoSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '600px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>📂 Expediente Completo: {procesoSeleccionado.idProceso}</h2>
              <button onClick={() => setProcesoSeleccionado(null)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Pestañas de Navegación Modal */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', pb: '8px' }}>
              {[
                { id: 'proceso', label: '📊 Proceso Venta' },
                { id: 'cliente', label: '👤 Datos Cliente' },
                { id: 'terreno', label: '📍 Datos Terreno' },
                { id: 'empresa', label: '🏢 Empresa / RL' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPestanaModal(tab.id)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderBottom: pestanaModal === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: pestanaModal === tab.id ? '#2563eb' : '#64748b',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Pestaña Proceso */}
            {pestanaModal === 'proceso' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Etapa Actual</label>
                  <select value={procesoSeleccionado.etapa} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, etapa: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                    {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Forma de Pago</label>
                  <input type="text" value={procesoSeleccionado.formaPago} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, formaPago: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Institución / Financiamiento</label>
                  <input type="text" value={procesoSeleccionado.institucion} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, institucion: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
              </div>
            )}

            {/* Pestaña Cliente */}
            {pestanaModal === 'cliente' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>ID Cliente</label>
                  <input type="text" value={procesoSeleccionado.idCliente} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, idCliente: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Nombre Completo</label>
                  <input type="text" value={procesoSeleccionado.nombreCliente} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, nombreCliente: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Teléfono Celular</label>
                  <input type="text" value={procesoSeleccionado.telefonoCliente} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, telefonoCliente: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Correo Electrónico</label>
                  <input type="text" value={procesoSeleccionado.correoCliente} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, correoCliente: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
              </div>
            )}

            {/* Pestaña Terreno */}
            {pestanaModal === 'terreno' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>ID Terreno</label>
                  <input type="text" value={procesoSeleccionado.idTerreno} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, idTerreno: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Manzana</label>
                  <input type="text" value={procesoSeleccionado.manzana} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, manzana: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Lote</label>
                  <input type="text" value={procesoSeleccionado.lote} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, lote: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Precio de Lista</label>
                  <input type="text" value={procesoSeleccionado.precioLista} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, precioLista: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
              </div>
            )}

            {/* Pestaña Empresa */}
            {pestanaModal === 'empresa' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>ID Empresa</label>
                  <input type="text" value={procesoSeleccionado.idEmpresa} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, idEmpresa: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Nombre Empresa / RL</label>
                  <input type="text" value={procesoSeleccionado.nombreEmpresa} onChange={e => setProcesoSeleccionado({ ...procesoSeleccionado, nombreEmpresa: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                </div>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button onClick={() => setProcesoSeleccionado(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarCambiosModalCompleto} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Todo en Excel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Expediente */}
      {modalNuevo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form onSubmit={crearExpediente} style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>➕ Crear Nuevo Expediente</h2>
            
            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>ID CLIENTE</label>
                <input required type="text" value={nuevoForm.idCliente} onChange={(e) => setNuevoForm({ ...nuevoForm, idCliente: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>ID TERRENO</label>
                <input required type="text" value={nuevoForm.idTerreno} onChange={(e) => setNuevoForm({ ...nuevoForm, idTerreno: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>INSTITUCIÓN</label>
                <input type="text" value={nuevoForm.institucion} onChange={(e) => setNuevoForm({ ...nuevoForm, institucion: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setModalNuevo(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Registrar</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}