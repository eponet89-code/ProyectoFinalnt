import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import './ProgressChart.css';

/* 🎨 Colores Liverpool */
const COLORS = {
  low:  '#FAD1E8',
  mid:  '#F58AC8',
  high: '#E44FA3',
  full: '#E10098',
};

/* 🔹 Leyenda */
const LegendItem = ({ color, label }) => (
  <div className="legend-item">
    <span className="legend-color" style={{ background: color }} />
    <span>{label}</span>
  </div>
);

/* 🔹 YAxis multilínea */
const CustomYAxisTick = ({ x, y, payload }) => {
  const words = String(payload.value || '').split(' ');
  const lines = [];
  let line = '';

  words.forEach((word) => {
    if ((line + word).length > 22) {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line += word + ' ';
    }
  });
  if (line.trim()) lines.push(line.trim());

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        textAnchor="end"
        dominantBaseline="middle"
        className="y-axis-label"
      >
        {lines.map((l, i) => (
          <tspan key={i} x={-8} dy={i === 0 ? 0 : 14}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
};

export default function ProgressChart({ projects = [] }) {
  const [range, setRange] = useState('ALL');

  const data = useMemo(() => {
    if (!Array.isArray(projects)) return [];

    return projects
      .filter((p) => p.canvasLink && p.canvasLink.trim() !== '' && p.cumplimiento)
      .map((p) => ({
        name: p.nombre,
        value: Number(String(p.cumplimiento).replace('%', '')) || 0,
        canvas: p.canvasLink, // 👈 nombre del canvas (hoja)
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
    // ✅ Igual que tu ProjectBoard (ruta interna del front)
    window.open(`/projects/canvas/${encoded}`, '_blank');
  };

  return (
    <section className="progress-card">
      {/* HEADER */}
      <div className="progress-header">
        <div>
          <h2 className='page-title'>Avance general de iniciativas</h2>
          <p>Haz clic en una barra para abrir el Canvas del proyecto</p>
        </div>

        <select value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="ALL">Todas</option>
          <option value="10-29">10–29%</option>
          <option value="30-59">30–59%</option>
          <option value="60-90">60–90%</option>
          <option value="100">100%</option>
        </select>
      </div>

      {/* LEYENDA */}
      <div className="legend">
        <LegendItem color={COLORS.full} label="100% Completado" />
        <LegendItem color={COLORS.high} label="60–90% Avance alto" />
        <LegendItem color={COLORS.mid} label="30–59% En progreso" />
        <LegendItem color={COLORS.low} label="10–29% Bajo avance" />
      </div>

      {/* GRÁFICA */}
      {data.length === 0 ? (
        <p className="empty-state">No hay iniciativas para el filtro seleccionado</p>
      ) : (
        <ResponsiveContainer width="100%" height={data.length * 58}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 300, right: 32 }}
            barCategoryGap={18}
          >
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />

            <YAxis
              type="category"
              dataKey="name"
              tick={<CustomYAxisTick />}
              width={280}
            />

            <Tooltip formatter={(v) => `${v}%`} />

            <Bar
              dataKey="value"
              radius={[6, 6, 6, 6]}
              // ✅ Click en la barra completa (extra aparte de los Cell)
              onClick={(barData) => {
                // barData.payload trae el objeto del dataset
                const canvasName = barData?.payload?.canvas;
                if (canvasName) openCanvas(canvasName);
              }}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={getColor(entry.value)}
                  cursor="pointer"
                  // ✅ Click por celda (por si el onClick del Bar no dispara en tu versión)
                  onClick={() => openCanvas(entry.canvas)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
