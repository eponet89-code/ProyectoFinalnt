import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "./IncidenciasDashboard.css";
import { readXlsx } from "../modules/incidencias/utils/readXlsx"; 

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const excelEpoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  return new Date(excelEpoch.getTime() + days * 86400000);
}

const extraerPlaza = (texto) => {
  if (!texto) return "OTRAS";
  const match = texto.match(/GALERIAS\s+([^|\]]+)/i);
  return match ? match[0].trim().toUpperCase() : "OTRAS";
};

export default function IncidenciasDashboard() {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState("Estacionamientos");
  const [busqueda, setBusqueda] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [plazaSeleccionada, setPlazaSeleccionada] = useState("Todas");

  useEffect(() => {
    async function loadData() {
      try {
        const [est, gal, inm] = await Promise.all([
          readXlsx("/data/ESTACIONAMIENTOS.xlsx"),
          readXlsx("/data/GALERIAS.xlsx"),
          readXlsx("/data/INMOBILIARIA.xlsx")
        ]);

        setIncidencias([
          ...est.map(i => ({ ...i, categoria: "Estacionamientos" })),
          ...gal.map(i => ({ ...i, categoria: "Galerías" })),
          ...inm.map(i => ({ ...i, categoria: "Inmobiliaria" })),
        ]);
      } catch (error) {
        console.error("Error cargando archivos:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const listaPlazas = useMemo(() => {
    const plazas = incidencias
      .filter(i => i.categoria === "Galerías")
      .map(i => extraerPlaza(i.Resumen));
    return ["Todas", ...new Set(plazas)].sort();
  }, [incidencias]);

  const toggleFiltroPendientes = (cat) => {
    if (categoriaActiva === cat && soloPendientes) {
      setSoloPendientes(false);
    } else {
      setCategoriaActiva(cat);
      setSoloPendientes(true);
    }
  };

  const chartData = useMemo(() => {
    const datosFiltrados = incidencias.filter(i => i.categoria === categoriaActiva);
    const mesesMap = {};
    datosFiltrados.forEach(i => {
      const fecha = excelDateToJSDate(i["Fecha de creación"]);
      if (!fecha || isNaN(fecha.getTime())) return; 
      const mesAño = fecha.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
      const estado = i.Estado || "Sin Estado";
      if (!mesesMap[mesAño]) mesesMap[mesAño] = { name: mesAño };
      mesesMap[mesAño][estado] = (mesesMap[mesAño][estado] || 0) + 1;
    });
    return Object.values(mesesMap);
  }, [incidencias, categoriaActiva]);

  const incidenciasFiltradas = useMemo(() => {
    return incidencias.filter(i => {
      const matchCategoria = i.categoria === categoriaActiva;
      const esPendiente = ["asignado", "en curso", "pendiente"].includes(i.Estado?.toLowerCase());
      const matchEstado = soloPendientes ? esPendiente : true;
      const plazaDeFila = extraerPlaza(i.Resumen);
      const matchPlaza = (categoriaActiva === "Galerías" && plazaSeleccionada !== "Todas")
        ? plazaDeFila === plazaSeleccionada : true;

      const term = busqueda.toLowerCase();
      return matchCategoria && matchEstado && matchPlaza && (
        i["Mostrar ID"]?.toString().toLowerCase().includes(term) ||
        i["Resumen"]?.toLowerCase().includes(term) ||
        i["Nombre de usuario asignado"]?.toLowerCase().includes(term)
      );
    });
  }, [incidencias, categoriaActiva, soloPendientes, plazaSeleccionada, busqueda]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Cargando Dashboard Liverpool...</p></div>;

  return (
    <div className="incidencias-container">
      <header className="glass-header">
        <div className="brand-section">
          <h2 className="page-title">Análisis de Incidencias</h2>
          <p className="page-subtitle">Panel de Gestión </p>
        </div>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por ID, Plaza o Usuario..." 
            className="main-search" 
            onChange={(e) => setBusqueda(e.target.value)} 
          />
        </div>
      </header>

      <div className="kpi-grid">
        <KpiCard title="Total Registros" value={incidencias.length} icon="📊" variant="blue" />
        <KpiCard title="Iniciativas Pendientes" value={incidencias.filter(i => ["asignado", "en curso", "pendiente"].includes(i.Estado?.toLowerCase())).length} icon="⏳" variant="pink" />
        <KpiCard title="Completadas" value={incidencias.filter(i => i.Estado?.toLowerCase() === "cerrado").length} icon="✅" variant="green" />
      </div>

      <div className="main-content-layout">
        <div className="left-column">
          <section className="chart-container-premium">
            <h4 className="section-title">Análisis de Productividad: {categoriaActiva}</h4>
            <div className="responsive-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} />
                  <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="Cerrado" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} barSize={25} />
                  <Bar dataKey="Asignado" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="En curso" stackId="a" fill="#E6007E" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="table-section-premium">
            <div className="filters-bar">
              <div className="tab-group-modern">
                {["Estacionamientos", "Galerías", "Inmobiliaria"].map(cat => (
                  <button key={cat} className={`modern-tab ${categoriaActiva === cat ? "active" : ""}`} 
                    onClick={() => { setCategoriaActiva(cat); setPlazaSeleccionada("Todas"); setSoloPendientes(false); }}>
                    {cat}
                  </button>
                ))}
              </div>

              {categoriaActiva === "Galerías" && (
                <select className="select-modern" value={plazaSeleccionada} onChange={(e) => setPlazaSeleccionada(e.target.value)}>
                  {listaPlazas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </div>

            <CategoriaTable 
              data={incidenciasFiltradas} 
              title={plazaSeleccionada !== "Todas" ? plazaSeleccionada : categoriaActiva}
              esFiltradoPendiente={soloPendientes}
            />
          </section>
        </div>

        <aside className="right-column">
          <ResumenCard titulo="Distribución de Estados" data={incidenciasFiltradas} />

               {/* Invocación del componente inteligente */}
          <PainPointsTable data={incidenciasFiltradas} />

          <PendientesCard 
            data={incidencias} 
            categoriaActiva={categoriaActiva}
            soloPendientes={soloPendientes}
            setCategoria={toggleFiltroPendientes} 
          />
        </aside>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTES ---
function PainPointsTable({ data }) {
  const puntosAnalizados = useMemo(() => {
    const diccionario = [
      { etiqueta: "Facturación Web", keywords: ["FACTURA", "COBRO", "PAGO", "CANCELACION"] },
      { etiqueta: "Procesos de Carga", keywords: ["CARGA", "ARCHIVO", "EXPORTADOR", "GENERACION"] },
      { etiqueta: "Acceso y Sistemas", keywords: ["SISTEMA", "RED", "CONEXION", "ADCON", "SAP", "INTERNET"] },
      { etiqueta: "Infraestructura/Fallas", keywords: ["PERCANCE", "FALLA", "DAÑO", "MANTENIMIENTO", "ELEVADOR"] }
    ];

    return diccionario.map(cat => {
      const coincidencias = data.filter(i => 
        cat.keywords.some(key => i.Resumen?.toUpperCase().includes(key))
      );
      const cerrados = coincidencias.filter(i => i.Estado?.toLowerCase() === "cerrado").length;
      
      // Buscamos el motivo más común en la columna "Motivo de estado"
      const motivos = coincidencias.map(i => i["Motivo de estado"]).filter(Boolean);
      const motivoPrincipal = motivos.length > 0 
        ? motivos.sort((a,b) => motivos.filter(v => v===a).length - motivos.filter(v => v===b).length).pop() 
        : "Sin motivo registrado";

      return { ...cat, frecuencia: coincidencias.length, cerrados, motivo: motivoPrincipal };
    }).filter(r => r.frecuencia > 0).sort((a, b) => b.frecuencia - a.frecuencia);
  }, [data]);

  return (
    <div className="pain-points-container">
      <h4 className="side-title">Puntos de Dolor</h4>
      <div className="pain-points-list">
        {puntosAnalizados.map((item, index) => (
          <div key={index} className="pain-point-card">
            <div className="pp-main-info">
              <span className="pp-label">{item.etiqueta}</span>
              <span className="pp-count-badge">{item.frecuencia} incidentes</span>
            </div>
            
            <div className="pp-stats">
              <span className="pp-check">✅ {item.cerrados} Cerrados</span>
              <div className="pp-progress-mini">
                 <div className="pp-progress-fill" style={{ width: `${(item.cerrados / item.frecuencia) * 100}%` }}></div>
              </div>
            </div>

            <div className="pp-reason-box">
               <strong>Motivo común:</strong> {item.motivo}
            </div>
          </div>
        ))}
      </div>
      
      {puntosAnalizados.length > 0 && (
        <div className="ai-alert-footer">
          <span className="ai-icon">💡</span>
          <p>Los casos de <strong>{puntosAnalizados[0].etiqueta}</strong> concentran el mayor volumen de fricción operativa.</p>
        </div>
      )}
    </div>
  );
}

function CategoriaTable({ data, title, esFiltradoPendiente }) {
  const [page, setPage] = useState(0);
  const size = 6;
  const pages = Math.ceil(data.length / size) || 1;
  const current = data.slice(page * size, page * size + size);

  useEffect(() => { setPage(0); }, [data.length]);

  return (
    <div className="table-container">
      {/* CAMBIO AQUÍ: Nueva estructura para el título y filtro */}
      <div className="info-seccion-container">
        <h2>{title} <span className="badge-registro">{data.length} registros</span></h2>
        {esFiltradoPendiente && <span className="filtro-indicador">● Filtro: Pendientes</span>}
      </div>

      <table className="modern-table">
        <thead>
          <tr>
            <th>Identificador</th>
            <th>Responsable</th>
            <th>Resumen</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {current.map((row, i) => (
            <tr key={i}>
              <td><span className="id-badge">{row["Mostrar ID"]}</span></td>
              <td className="user-name">{row["Nombre de usuario asignado"] || "Sin asignar"}</td>
              {/* CAMBIO AQUÍ: Nueva clase resumen-cell para permitir que se vea más texto */}
              <td className="resumen-cell" title={row["Resumen"]}>{row["Resumen"]}</td>
              <td><span className={`status-pill ${row.Estado?.toLowerCase().replace(/\s/g, '')}`}>{row.Estado}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* CAMBIO AQUÍ: Botones con flechas y estructura mejorada */}
      <div className="pagination-pro">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-pag">
          ← Anterior
        </button>
        <span className="page-info">Página <b>{page + 1}</b> de {pages}</span>
        <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="btn-pag">
          Siguiente →
        </button>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, variant }) {
  return (
    <div className={`kpi-card-pro ${variant}`}>
      <div className="kpi-icon-wrapper">{icon}</div>
      <div className="kpi-content">
        <span className="kpi-title">{title}</span>
        <span className="kpi-value">{value}</span>
      </div>
    </div>
  );
}


function ResumenCard({ titulo, data }) {
    const resumen = data.reduce((acc, i) => { 
      const estado = i.Estado || "Sin Estado";
      acc[estado] = (acc[estado] || 0) + 1; 
      return acc; 
    }, {});

    return (
      <div className="side-card-pro">
        <h4 className="side-title">{titulo}</h4>
        <div className="side-list">
          {Object.entries(resumen).map(([k, v]) => (
            <div key={k} className="side-item">
              <span className="item-label">{k}</span>
              <span className="item-count">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
}


function PendientesCard({ data, setCategoria, categoriaActiva, soloPendientes }) {
    const pend = data.filter(i => ["asignado", "en curso", "pendiente"].includes(i.Estado?.toLowerCase()));
    const grouped = pend.reduce((acc, i) => { acc[i.categoria] = (acc[i.categoria] || 0) + 1; return acc; }, {});
    
    return (
      <div className={`side-card-pro ${soloPendientes ? "active-pink-border" : ""}`}>
        <div className="side-header">
          <h4 className="side-title">Pendientes por Área</h4>
          {/* BOTÓN MEJORADO */}
          {soloPendientes && (
            <button className="reset-btn-premium" onClick={() => setCategoria(categoriaActiva)}>
              Limpiar ↺
            </button>
          )}
        </div>
        <div className="side-list">
          {Object.entries(grouped).map(([k, v]) => (
            <div 
              key={k} 
              className={`side-item-btn ${categoriaActiva === k && soloPendientes ? "selected" : ""}`} 
              onClick={() => setCategoria(k)}
            >
              <span>{k}</span>
              <span className="count-badge-pink">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
}