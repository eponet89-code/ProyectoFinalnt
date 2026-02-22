import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  CartesianGrid,
} from 'recharts';
import './ProgressChart.css';

/* 🎨 Colores Liverpool este bueno*/
const COLORS = {
  low: '#FAD1E8',  // Rosa muy claro
  mid: '#4bf180',  // Verde (según tu ajuste)
  high: '#4f83e4', // Azul (según tu ajuste)
  full: '#e100a9', // Rosa fuerte
};

/* 🔹 Componente de Leyenda */
const LegendItem = ({ color, label }) => (
  <div className="legend-item">
    <span className="legend-color" style={{ background: color }} />
    <span>{label}</span>
  </div>
);

/* 🔹 YAxis con ajuste para nombres largos y móvil */
const CustomYAxisTick = ({ x, y, payload, isMobile }) => {
  const label = payload.value || '';
  // Si es móvil y el texto es muy largo, lo cortamos para no robar espacio a la gráfica
  const finalLabel = isMobile && label.length > 14 
    ? label.substring(0, 11) + '...' 
    : label;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        textAnchor="end"
        dominantBaseline="middle"
        className="y-axis-label"
        style={{ fontSize: isMobile ? '10px' : '12px', fill: '#666' }}
      >
        {finalLabel}
      </text>
    </g>
  );
};

export default function ProgressChart({ projects = [] }) {
  const [range, setRange] = useState('ALL');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 📱 Hook para detectar cambio de tamaño de pantalla en tiempo real
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const data = useMemo(() => {
    if (!Array.isArray(projects)) return [];

    return projects
      .filter((p) => p.canvasLink && p.canvasLink.trim() !== '' && p.cumplimiento)
      .map((p) => ({
        name: p.nombre,
        value: Number(String(p.cumplimiento).replace('%', '')) || 0,
        canvas: p.canvasLink,
      }))
      .filter((p) => {
        if (range === '10-29') return p.value >= 10 && p.value <= 29;
        if (range === '30-59') return p.value >= 30 && p.value <= 59;
        if (range === '60-90') return p.value >= 60 && p.value <= 90;
        if (range === '100') return p.value === 100;
        return true;
      })
      .sort((a, b) => b.value - a.value);
  }, [projects, range]);

  const getColor = (v) => {
    if (v === 100) return COLORS.full;
    if (v >= 60) return COLORS.high;
    if (v >= 30) return COLORS.mid;
    return COLORS.low;
  };

  const openCanvas = (canvasName) => {
    const encoded = encodeURIComponent(canvasName);
    window.open(`/projects/canvas/${encoded}`, '_blank');
  };

  return (
    <section className="progress-card">
      <div className="progress-header">
        <div className="progress-title-container">
          <h2 className='page-title'>Avance general de iniciativas</h2>
          <p className="subtitle">Haz clic en una barra para abrir el Canvas</p>
        </div>

        <select 
          className="filter-select"
          value={range} 
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="ALL">Todas</option>
          <option value="10-29">10–29%</option>
          <option value="30-59">30–59%</option>
          <option value="60-90">60–90%</option>
          <option value="100">100%</option>
        </select>
      </div>

      <div className="legend">
        <LegendItem color={COLORS.full} label="100%" />
        <LegendItem color={COLORS.high} label="60–90%" />
        <LegendItem color={COLORS.mid} label="30–59%" />
        <LegendItem color={COLORS.low} label="10–29%" />
      </div>

      <div className="chart-wrapper" style={{ width: '100%', marginTop: '20px' }}>
        {data.length === 0 ? (
          <p className="empty-state">No hay iniciativas para el filtro seleccionado</p>
        ) : (
          <ResponsiveContainer width="100%" height={data.length * 55 + 60}>
            <BarChart
              data={data}
              layout="vertical"
              // Margen dinámico: mas espacio en PC (260) y menos en móvil (85)
              margin={{ 
                left: isMobile ? 85 : 260, 
                right: 45, 
                top: 10, 
                bottom: 10 
              }}
              barCategoryGap={12}
            >
              {/* Líneas de guía verticales (Grid) solo visibles claramente en PC */}
              <CartesianGrid 
                strokeDasharray="3 3" 
                horizontal={false} 
                stroke="#f0f0f0" 
              />

              {/* El eje X muestra los porcentajes de medida abajo solo en PC */}
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                hide={isMobile}
                tickFormatter={(v) => `${v}%`}
                style={{ fontSize: '12px', fill: '#999' }}
              />

              <YAxis
                type="category"
                dataKey="name"
                tick={<CustomYAxisTick isMobile={isMobile} />}
                width={isMobile ? 80 : 250}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip 
                formatter={(v) => `${v}%`} 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }} 
              />

              <Bar
                dataKey="value"
                radius={[0, 6, 6, 0]}
                onClick={(barData) => {
                  const canvasName = barData?.payload?.canvas;
                  if (canvasName) openCanvas(canvasName);
                }}
              >
                {/* 🏷️ Etiqueta de porcentaje al final de cada barra */}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(v) => `${v}%`}
                  style={{ 
                    fontSize: isMobile ? '10px' : '12px', 
                    fontWeight: 'bold', 
                    fill: '#7c7777' 
                  }}
                />

                {data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={getColor(entry.value)}
                    cursor="pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}