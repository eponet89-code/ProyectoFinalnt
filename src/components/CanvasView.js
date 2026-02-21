import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './CanvasView.css';

// Helpers
const clean = (v) => (typeof v === 'string' ? v.trim() : '');


const norm = (v) =>
  clean(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toUpperCase();

function prettifyTitle(raw) {
  const t = decodeURIComponent(raw || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t || 'Canvas';
}

/** Busca una fila que contenga TODOS los títulos */
function findRowIndexByTitles(rows, titles) {
  const tset = titles.map((t) => norm(t));
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const rowUpper = row.map(norm);
    if (tset.every((t) => rowUpper.includes(t))) return r;
  }
  return -1;
}

function findColIndex(row, title) {
  const t = norm(title);
  const rowUpper = (row || []).map(norm);
  return rowUpper.indexOf(t);
}

function readColumnBlock(rows, col, startRow, endRowExclusive) {
  const lines = [];
  for (let r = startRow; r < endRowExclusive; r++) {
    const cell = clean(rows[r]?.[col] ?? '');
    if (cell) lines.push(cell);
  }
  return lines.join('\n\n');
}

/** Intenta leer "Dirección" de forma segura */
function extractDireccion(rows) {
  const maxScanRows = Math.min(rows.length, 12);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = clean(row[c]);
      const u = norm(cell);

      if (u.startsWith('DIRECCION:')) {
        const value = clean(cell.split(':').slice(1).join(':'));
        if (value) return value;
      }

      if (u === 'DIRECCION' || u === 'DIRECCION:') {
        const value = clean(row[c + 1] ?? '');
        if (value) return value;
      }
    }
  }

  return '';
}

/* ================================
   Extractores para tablas COSTO / INGRESOS
================================ */
function pickNeighborValue(row, baseCol) {
  // intenta col+1 a col+5 (por merges / espacios)
  for (let k = 1; k <= 5; k++) {
    const v = clean(row?.[baseCol + k] ?? '');
    if (v) return v;
  }

  // si viene "LABEL: valor" en la misma celda
  const v0 = clean(row?.[baseCol] ?? '');
  const parts = v0.split(':');
  if (parts.length > 1) {
    const after = clean(parts.slice(1).join(':'));
    if (after) return after;
  }

  return '';
}

function readBlockAndTable(rows, col, startRow, endRowExclusive, spec) {
  // spec: { header?: 'COSTO', labels: ['TI','NEGOCIO','TOTAL'], title: 'Costo' }
  const headerNorm = spec.header ? norm(spec.header) : '';
  const labelsNorm = (spec.labels || []).map((x) => norm(x));

  const found = new Map(); // labelNorm -> value
  const narrative = [];

  let sawHeader = false;

  for (let r = startRow; r < endRowExclusive; r++) {
    const row = rows[r] || [];
    const cell = clean(row?.[col] ?? '');
    const u = norm(cell);

    if (!cell) continue;

    if (headerNorm && u === headerNorm) {
      sawHeader = true;
      continue;
    }

    const idx = labelsNorm.indexOf(u);
    if (idx !== -1) {
      //const label = spec.labels[idx];
      const value = pickNeighborValue(row, col);
      found.set(labelsNorm[idx], value || 'Pendiente por definir.');
      continue;
    }

    // lo que no es tabla, va como texto normal
    narrative.push(cell);
  }

  let table = null;
  if (sawHeader || found.size) {
    const rowsOut = spec.labels.map((lab) => ({
      label: lab,
      value: found.get(norm(lab)) || 'Pendiente por definir.',
    }));
    table = { title: spec.title, rows: rowsOut };
  }

  return { text: narrative.join('\n\n'), table };
}

/* ================================
   EQUIPO: mezcla canvas + meta
================================ */
function parseEquipoBlock(rawEquipo) {
  const text = clean(rawEquipo);
  if (!text) return { known: {}, extra: '' };

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const labels = [
    { key: 'director', names: ['DIRECTOR DE PROYECTO'] },
    { key: 'gerente', names: ['GERENTE DE PROYECTO'] },
    { key: 'lider', names: ['LIDER FUNCIONAL', 'LÍDER FUNCIONAL'] },
    { key: 'areas', names: ['AREAS DE APOYO', 'ÁREAS DE APOYO'] },
  ];

  const isLabelLine = (line) => {
    const n = norm(line);
    return labels.some((L) =>
      L.names.some((name) => n.startsWith(norm(name) + ':') || n === norm(name) + ':')
    );
  };

  const known = {};
  const extra = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matched = false;

    for (const L of labels) {
      for (const name of L.names) {
        const keyNorm = norm(name);

        if (norm(line).startsWith(keyNorm + ':')) {
          matched = true;
          const after = clean(line.split(':').slice(1).join(':'));
          if (after) known[L.key] = after;
          else {
            let j = i + 1;
            while (j < lines.length) {
              const next = clean(lines[j]);
              if (!next) {
                j++;
                continue;
              }
              if (isLabelLine(next)) break;
              known[L.key] = next;
              break;
            }
          }
        }
      }
    }

    if (!matched) extra.push(line);
  }

  return { known, extra: extra.join('\n') };
}

function buildEquipoContent(rawEquipo, meta) {
  const { known, extra } = parseEquipoBlock(rawEquipo);

  const director = clean(known.director) || clean(meta?.dirResponsable) || 'Pendiente por definir.';
  const gerente = clean(known.gerente) || 'Pendiente por definir.';
  const lider = clean(known.lider) || clean(meta?.liderFuncional) || 'Pendiente por definir.';
  const areas = clean(known.areas) || 'Pendiente por definir.';

  const parts = [
    `Director de Proyecto: ${director}`,
    ``,
    `Gerente de Proyecto: ${gerente}`,
    ``,
    `Líder Funcional: ${lider}`,
    ``,
    `Áreas de apoyo: ${areas}`,
  ];

  if (clean(extra)) {
    parts.push('', 'Otros:', extra);
  }

  return parts.join('\n');
}

/* ========== CARDS ========== */
function CanvasCard({ title, icon, content, note, onRemoveNote }) {
  return (
    <section className="canvas-card">
      <header className="canvas-card-header">
        <span className="canvas-card-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="canvas-card-title" title={title}>
          {title}
        </span>
      </header>

      <div className="canvas-card-body">
        {clean(content) ? <pre>{content}</pre> : <em className="canvas-empty">Pendiente por definir.</em>}

        {note && (
          <div className="canvas-note" role="note" aria-label="Recomendación IA">
            <div className="canvas-note-head">
              <span className="canvas-note-title">📝 Recomendación IA</span>
              <button
                className="canvas-note-close"
                onClick={onRemoveNote}
                title="Quitar nota"
                aria-label="Quitar nota"
              >
                ✕
              </button>
            </div>
            <div className="canvas-note-text">{note}</div>
          </div>
        )}
      </div>
    </section>
  );
}

function TableCard({ title, icon, table }) {
  const rows = table?.rows || [];
  return (
    <section className="canvas-card">
      <header className="canvas-card-header">
        <span className="canvas-card-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="canvas-card-title" title={title}>
          {title}
        </span>
      </header>

      <div className="canvas-card-body">
        {rows.length ? (
          <div className="canvas-mini-table" aria-label={title}>
            <div className="canvas-mini-table-title">{table?.title || title}</div>
            <div className="canvas-mini-table-grid">
              {rows.map((r, i) => (
                <div className="canvas-mini-row" key={i}>
                  <div className="canvas-mini-k">{r.label}</div>
                  <div className="canvas-mini-v">{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <em className="canvas-empty">Pendiente por definir.</em>
        )}
      </div>
    </section>
  );
}

/* ========== IA PANEL (tu panel completo, lo mantengo igual) ========== */
function AiPanel({
  open,
  onClose,
  loading,
  error,
  aiData,
  onGenerate,
  onAddNote,
  onAddAllNotes,
  onClearNotes,
}) {
  const [tab, setTab] = useState('onepager');

  useEffect(() => {
    if (open) setTab('onepager');
  }, [open]);

  if (!open) return null;

  const one = aiData?.executive_one_pager;
  const rep = aiData?.technical_report;
  const diag = rep?.diagnostic;

  return (
    <div className="ai-backdrop" onClick={onClose}>
      <div className="ai-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ai-header">
          <div>
            <h3>🤖 Mejorar con IA</h3>
            <p>Genera resumen ejecutivo, sugerencias por sección y reporte técnico.</p>
          </div>

          <button className="ai-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="ai-actions-row">
          <button className="btn btn-primary" onClick={onGenerate} disabled={loading}>
            {loading ? 'Generando…' : 'Generar análisis'}
          </button>

          <button className="btn btn-outline" onClick={onClearNotes}>
            Limpiar notas
          </button>
        </div>

        <div className="ai-tabs">
          <button className={`ai-tab ${tab === 'onepager' ? 'active' : ''}`} onClick={() => setTab('onepager')}>
            Resumen Ejecutivo
          </button>
          <button className={`ai-tab ${tab === 'sections' ? 'active' : ''}`} onClick={() => setTab('sections')}>
            Sugerencias por sección
          </button>
          <button className={`ai-tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
            Reporte técnico
          </button>
        </div>

        {error && <div className="ai-error">⚠️ {error}</div>}

        {!aiData && !loading && (
          <div className="ai-empty">
            <p>Aún no hay análisis generado.</p>
            <p>
              Da clic en <b>Generar análisis</b>.
            </p>
          </div>
        )}

        {aiData && tab === 'onepager' && (
          <div className="ai-content">
            <h4>{one?.title || 'Resumen ejecutivo'}</h4>

            <div className="ai-block">
              <h5>Resumen</h5>
              <ul>
                {(one?.summary_bullets || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div className="ai-block">
              <h5>Value statement</h5>
              <p>{one?.value_statement || 'Pendiente por definir.'}</p>
            </div>

            <div className="ai-grid-2">
              <div className="ai-block">
                <h5>Alcance (Incluye)</h5>
                <ul>
                  {(one?.scope_in || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="ai-block">
                <h5>Fuera de alcance</h5>
                <ul>
                  {(one?.scope_out || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="ai-block">
              <h5>KPIs sugeridos</h5>
              <div className="ai-table">
                <div className="ai-tr ai-th">
                  <div>KPI</div>
                  <div>Fórmula</div>
                  <div>Fuente</div>
                </div>
                {(one?.kpis || []).map((k, i) => (
                  <div className="ai-tr" key={i}>
                    <div>{k?.name}</div>
                    <div>{k?.formula}</div>
                    <div>{k?.source}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-grid-2">
              <div className="ai-block">
                <h5>Riesgos</h5>
                <ul>
                  {(one?.risks || []).map((r, i) => (
                    <li key={i}>
                      <b>{r?.risk}:</b> {r?.mitigation}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ai-block">
                <h5>Próximos pasos</h5>
                <ul>
                  {(one?.next_steps || []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {aiData && tab === 'sections' && (
          <div className="ai-content">
            <div className="ai-sections-actions">
              <button className="btn btn-primary" onClick={onAddAllNotes}>
                Agregar todas las notas
              </button>
            </div>

            {Object.entries(aiData?.section_suggestions || {}).map(([key, suggestion]) => (
              <div className="ai-section" key={key}>
                <div className="ai-section-head">
                  <h4>{key}</h4>
                  <button className="btn btn-outline" onClick={() => onAddNote(key)}>
                    Agregar nota
                  </button>
                </div>
                <pre className="ai-pre">{suggestion || 'Pendiente por definir.'}</pre>
              </div>
            ))}
          </div>
        )}

        {aiData && tab === 'report' && (
          <div className="ai-content">
            <div className="ai-block">
              <h4>Diagnóstico</h4>
              <div className="ai-grid-3">
                <div>
                  <h5>Faltantes</h5>
                  <ul>
                    {(diag?.missing || []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5>Inconsistencias</h5>
                  <ul>
                    {(diag?.inconsistencies || []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5>Supuestos</h5>
                  <ul>
                    {(diag?.assumptions || []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="ai-block">
              <h4>Notas de arquitectura</h4>
              <ul>
                {(rep?.architecture_notes || []).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CanvasView() {
  const { sheetName } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showMeta, setShowMeta] = useState(false);

  // IA states
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiData, setAiData] = useState(null);

  // ✅ Notas (post-its) por sección: NO sustituye el canvas
  const [notes, setNotes] = useState({});

  // ✅ FIX: backend regresa { rows, meta }
  useEffect(() => {
    setLoading(true);

    //fetch(`http://localhost:3000/projects/canvas/${encodeURIComponent(sheetName)}`)
    // Antes: fetch(`http://localhost:3000/projects/canvas/${...}`)
    fetch(`https://backend-tablero.onrender.com/projects/canvas/${encodeURIComponent(sheetName)}`)
      .then((r) => r.json())
      .then((d) => {
        const newRows = Array.isArray(d) ? d : Array.isArray(d?.rows) ? d.rows : [];
        setRows(newRows);

        const newMeta = !Array.isArray(d) ? d?.meta || null : null;
        setMeta(newMeta);

        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando canvas:', err);
        setRows([]);
        setMeta(null);
        setLoading(false);
      });
  }, [sheetName]);

  const canvas = useMemo(() => {
    if (!rows.length) return null;

    const topTitles = ['NECESIDAD', 'DESCRIPCIÓN', 'BENEFICIOS', 'CLIENTE', 'EQUIPO'];
    const midTitles = ['CAPACIDADES', 'ALINEACIÓN ESTRATÉGICA', 'KPIs', 'ANÁLISIS DE IMPACTO'];

    const topHeader = findRowIndexByTitles(rows, topTitles);
    const midHeader = findRowIndexByTitles(rows, midTitles);

    const result = {
      title: prettifyTitle(sheetName),
      direccion: extractDireccion(rows),

      // meta (Google Sheets)
      dirResponsable: meta?.dirResponsable || '',
      liderFuncional: meta?.liderFuncional || '',
      tirVpn: meta?.tirVpn || '',

      top: {},
      mid: {},

      // ✅ tablas separadas (ya NO dentro de CAPACIDADES / KPIs)
      costoTable: null,
      finTable: null,
    };

    // TOP
    if (topHeader !== -1) {
      const end = midHeader !== -1 ? midHeader : rows.length;
      topTitles.forEach((t) => {
        const col = findColIndex(rows[topHeader], t);
        if (col !== -1) result.top[t] = readColumnBlock(rows, col, topHeader + 1, end);
      });
    }

    // MID
    if (midHeader !== -1) {
      const start = midHeader + 1;
      const end = rows.length;

      midTitles.forEach((t) => {
        const col = findColIndex(rows[midHeader], t);
        if (col === -1) return;

        // CAPACIDADES -> extrae COSTO a tabla separada
        if (norm(t) === norm('CAPACIDADES')) {
          const { text, table } = readBlockAndTable(rows, col, start, end, {
            header: 'COSTO',
            title: 'Costo',
            labels: ['TI', 'NEGOCIO', 'TOTAL'],
          });
          result.mid[t] = text;          // solo texto
          result.costoTable = table;     // tabla separada
          return;
        }

        // KPIs -> extrae INGRESOS/AHORROS/TOTAL a tabla separada
        if (norm(t) === norm('KPIs')) {
          const { text, table } = readBlockAndTable(rows, col, start, end, {
            header: '', // no requiere header
            title: 'Resumen financiero',
            labels: ['INGRESOS', 'AHORROS', 'TOTAL'],
          });
          result.mid[t] = text;        // solo texto
          result.finTable = table;     // tabla separada
          return;
        }

        // normal
        result.mid[t] = readColumnBlock(rows, col, start, end);
      });
    }

    // ✅ EQUIPO final: mezcla canvas + meta
    const rawEquipo = result.top?.['EQUIPO'] || '';
    result.top['EQUIPO'] = buildEquipoContent(rawEquipo, meta);

    return result;
  }, [rows, sheetName, meta]);

  const generateAI = async () => {
    if (!canvas) return;
    setAiLoading(true);
    setAiError('');
    try {
      //const res = await fetch(`http://localhost:3000/ai/canvas-improve`,
      const res = await fetch(`https://backend-tablero.onrender.com/ai/canvas-improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.message || 'No se pudo generar el análisis');
      setAiData(json.data);
      if (json?.data?.error) setAiError(json.data.error);
    } catch (e) {
      setAiError(e?.message || 'Error al generar análisis IA');
    } finally {
      setAiLoading(false);
    }
  };

  // ===== Notas (post-its) =====
  const clearNotes = () => setNotes({});

  const addNote = (key) => {
    const suggestion = aiData?.section_suggestions?.[key];
    if (!suggestion) return;
    setNotes((prev) => ({ ...prev, [key]: clean(suggestion) }));
  };

  const addAllNotes = () => {
    const sug = aiData?.section_suggestions;
    if (!sug) return;
    setNotes((prev) => {
      const next = { ...prev };
      Object.entries(sug).forEach(([k, v]) => {
        next[k] = clean(String(v ?? ''));
      });
      return next;
    });
  };

  const removeNote = (key) => {
    setNotes((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  if (loading) return <p className="canvas-loading">Cargando Canvas…</p>;
  if (!canvas) return <p className="canvas-loading">Sin datos de Canvas</p>;

  const hasDireccion = Boolean(canvas.direccion);
  const direccionLong = hasDireccion && canvas.direccion.length > 80;

  return (
    <div className="canvas-wrapper">
      <AiPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        loading={aiLoading}
        error={aiError}
        aiData={aiData}
        onGenerate={generateAI}
        onAddNote={addNote}
        onAddAllNotes={addAllNotes}
        onClearNotes={clearNotes}
      />

      <header className="canvas-header">
        <button className="link-back" onClick={() => navigate('/')}>
          ← Volver a iniciativas
        </button>

        <div className="canvas-title-row">
          <div className="canvas-title-block">
            <h1 className="canvas-title" title={canvas.title}>
              {canvas.title}
            </h1>

            {/* chips meta */}
            <div className="canvas-chip-row">
              {canvas.dirResponsable && <span className="canvas-chip">Dir. Responsable: {canvas.dirResponsable}</span>}
              {canvas.liderFuncional && <span className="canvas-chip">Líder Funcional: {canvas.liderFuncional}</span>}
              {canvas.tirVpn && <span className="canvas-chip">{canvas.tirVpn}</span>}
              {Object.keys(notes).length > 0 && (
                <span className="canvas-chip canvas-chip-ai" title="Notas IA agregadas (no modifican el original)">
                  🟨 Notas IA
                </span>
              )}
            </div>

            {hasDireccion && !direccionLong && (
              <span className="canvas-chip" title={canvas.direccion}>
                {canvas.direccion}
              </span>
            )}
          </div>

          <div className="canvas-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                setAiOpen(true);
                if (!aiData) generateAI();
              }}
            >
              🤖 Mejorar con IA
            </button> <br /><br />
            
          </div>
        </div>

        {hasDireccion && direccionLong && (
          <div className="canvas-meta">
            <button className="meta-toggle" onClick={() => setShowMeta((s) => !s)} aria-expanded={showMeta}>
              {showMeta ? 'Ocultar información general' : 'Ver información general'}
            </button>

            {showMeta && (
              <div className="meta-panel">
                <pre>{canvas.direccion}</pre>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Top */}
      <section className="canvas-grid canvas-grid-top">
        <CanvasCard title="Necesidad" icon="🎯" content={canvas.top['NECESIDAD']} note={notes['NECESIDAD']} onRemoveNote={() => removeNote('NECESIDAD')} />
        <CanvasCard title="Descripción" icon="📝" content={canvas.top['DESCRIPCIÓN']} note={notes['DESCRIPCIÓN']} onRemoveNote={() => removeNote('DESCRIPCIÓN')} />
        <CanvasCard title="Beneficios" icon="📈" content={canvas.top['BENEFICIOS']} note={notes['BENEFICIOS']} onRemoveNote={() => removeNote('BENEFICIOS')} />
        <CanvasCard title="Cliente" icon="👥" content={canvas.top['CLIENTE']} note={notes['CLIENTE']} onRemoveNote={() => removeNote('CLIENTE')} />
        <CanvasCard title="Equipo" icon="🧩" content={canvas.top['EQUIPO']} note={notes['EQUIPO']} onRemoveNote={() => removeNote('EQUIPO')} />
      </section>

      {/* Mid (texto normal) */}
      <section className="canvas-grid canvas-grid-mid">
        <CanvasCard title="Capacidades" icon="⚙️" content={canvas.mid['CAPACIDADES']} note={notes['CAPACIDADES']} onRemoveNote={() => removeNote('CAPACIDADES')} />
        <CanvasCard title="Alineación Estratégica" icon="🧭" content={canvas.mid['ALINEACIÓN ESTRATÉGICA']} note={notes['ALINEACIÓN ESTRATÉGICA']} onRemoveNote={() => removeNote('ALINEACIÓN ESTRATÉGICA')} />
        <CanvasCard title="KPIs" icon="📊" content={canvas.mid['KPIs']} note={notes['KPIs']} onRemoveNote={() => removeNote('KPIs')} />
        <CanvasCard title="Análisis de Impacto" icon="🔎" content={canvas.mid['ANÁLISIS DE IMPACTO']} note={notes['ANÁLISIS DE IMPACTO']} onRemoveNote={() => removeNote('ANÁLISIS DE IMPACTO')} />
      </section>

      {/* ✅ NUEVO: tarjetas separadas SOLO para Costo y Resumen financiero */}
      <section className="canvas-grid canvas-grid-fin">
        <TableCard title="Costo" icon="💰" table={canvas.costoTable} />
        <TableCard title="Resumen financiero" icon="🧾" table={canvas.finTable} />
      </section>
    </div>
  );
}
