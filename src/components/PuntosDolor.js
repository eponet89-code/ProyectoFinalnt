import React, { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
//import { readXlsx } from "../modules/incidencias/utils/readXlsx";
import "./PuntosDolor.css";

export default function PuntosDolorDashboard() {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
    async function loadData() {
      try {
        // 1. El ID de tu hoja de Google Sheets de Incidencias
        const SHEET_ID = "15FGxYrNDbrxlDm9tTtXb6JpS6lvJk-mW39qhSTrs7AQ"; // <--- ID DE LA HOJA DE

        // 
        // Usamos la URL de Render porque tu Front ya está configurado para buscarla ahí
        const response = await fetch(
          `https://proyectointer.onrender.com/projects/incidencias/dashboard?id=${SHEET_ID}`
        );

        if (!response.ok) {
          throw new Error(`Error en la API: ${response.statusText}`);
        }

        const data = await response.json();

        // 3. Guardamos los datos. 
        // Como el Back ya unió las 3 pestañas, 'data' ya es el array completo.
        setIncidencias(data);
      } catch (error) {
        console.error("Error al cargar datos desde Google Sheets:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const puntosAnalizados = useMemo(() => {
    const diccionario = [
      { etiqueta: "Sistemas (SAP/ADCON)", keywords: ["SISTEMA", "RED", "CONEXION", "ADCON", "SAP", "INTERNET"], color: "#E6007E" },
      { etiqueta: "Procesos de Carga", keywords: ["CARGA", "ARCHIVO", "EXPORTADOR", "GENERACION"], color: "#7C3AED" },
      { etiqueta: "Infraestructura/Fallas", keywords: ["PERCANCE", "FALLA", "DAÑO", "MANTENIMIENTO", "ELEVADOR"], color: "#F59E0B" },
      { etiqueta: "Facturación Web", keywords: ["FACTURA", "COBRO", "PAGO", "CANCELACION"], color: "#3B82F6" },
      { etiqueta: "Atención Clientes", keywords: ["QUEJA", "ATENCION", "SERVICIO", "CLIENTE"], color: "#10B981" }
    ];

    return diccionario.map(cat => {
      // 1. Filtramos base VÁLIDA (Sin Cancelados ni Rechazados)
      const baseValida = incidencias.filter(i => 
        cat.keywords.some(key => i.Resumen?.toUpperCase().includes(key)) &&
        i.Estado?.toLowerCase() !== "cancelados" &&
        i.Estado?.toLowerCase() !== "rechazado"
      );

      const total = baseValida.length;
      //la notificacion con cancelacion es exito 
      // 2. ÉXITO: Cerrados con notificación O Finalizados
      const exito = baseValida.filter(i => 
        (i.Estado?.toLowerCase() === "cerrado" && i["Motivo de estado"]?.toLowerCase().includes("notificación")) ||
        (i.Estado?.toLowerCase() === "finalizado")
      ).length;

      // 3. SISTEMA (DOLOR): Cerrados por omisión técnica
      const sistema = baseValida.filter(i => 
        i.Estado?.toLowerCase() === "cerrado" && 
        i["Motivo de estado"]?.toLowerCase().includes("cierre de sistema")
      ).length;

      // 4. PENDIENTES: Lo que queda (Asignado, Pendiente, Programado)
      const pendientes = total - (exito + sistema);

      return {
        ...cat,
        total,
        exito,
        sistema,
        pendientes,
        porcentajeEfectividad: total > 0 ? Math.round((exito / total) * 100) : 0,
        porcentajeDolor: total > 0 ? Math.round((sistema / total) * 100) : 0,
        chartData: [
          { name: 'Éxito', value: exito, color: '#10B981' },
          { name: 'Sistema', value: sistema, color: '#E6007E' },
          { name: 'En Proceso', value: pendientes, color: '#94A3B8' }
        ]
      };
    }).filter(p => p.total > 0).sort((a, b) => b.total - a.total);
  }, [incidencias]);

  if (loading) return <div className="loading-screen">Analizando Puntos de Dolor...</div>;

  return (
    <div className="incidencias-container">
      <header className="glass-header">
        <div>
          <h2 className="page-title">Puntos de Dolor</h2>
          <p className="page-subtitle">Efectividad Operativa</p>
        </div>
      </header>

      <div className="pp-grid-modern">
        {puntosAnalizados.map((item, index) => (
          <div key={index} className="pp-card-premium">
            <div className="card-accent" style={{ backgroundColor: item.color }}></div>
            
            <div className="card-content">
              <div className="card-left">
                <h3 className="card-title">{item.etiqueta}</h3>
                <div className="main-stat">
                  <strong>{item.total}</strong> <small>Tickets Válidos</small>
                </div>

                <div className="stats-breakdown">
                  <div className="stat-row success">
                    <span>✔️ Resueltos / Finalizados</span>
                    <strong>{item.exito}</strong>
                  </div>
                  <div className="stat-row danger">
                    <span>⚠️ Cierre Sistema (Omisión)</span>
                    <strong>{item.sistema}</strong>
                  </div>
                  <div className="stat-row process">
                    <span>⏳ Trabajo en Curso</span>
                    <strong>{item.pendientes}</strong>
                  </div>
                </div>
              </div>

              <div className="card-right-chart">
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={item.chartData}
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {item.chartData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-label">{item.porcentajeEfectividad}% Éxito</div>
              </div>
            </div>

            <div className="card-footer-analysis">
              <strong>Análisis de Desempeño:</strong>
              <p>
               El <b>{item.porcentajeDolor}%</b> de los casos fueron cerrados automáticamente por el sistema, lo que indica una falta de respuesta del responsable asignado.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}