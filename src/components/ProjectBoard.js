import { useMemo, useState } from "react";
import "./ProjectBoard.css";

/**
 * Normaliza texto para búsquedas:
 * - minúsculas
 * - sin acentos
 */
const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function getPct(cumplimiento) {
  const raw = String(cumplimiento ?? "0").replace("%", "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

/**
 * Evita doble encode:
 * - si viene ya encoded, lo normaliza (decode -> encode)
 * - si no viene encoded, encode normal
 */
function safeEncode(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  try {
    return encodeURIComponent(decodeURIComponent(s));
  } catch {
    return encodeURIComponent(s);
  }
}

/**
 * ✅ Backend necesita el título REAL de la pestaña (sheet tab)
 * Si tu canvasLink viene como "CANVAS" (genérico), lo convertimos a "Canvas <nombre>"
 * (funciona si tus pestañas se llaman así: "Canvas Valet Parking", etc.)
 */
function getSheetTitle(p) {
  const raw =
    (p?.canvasLink && String(p.canvasLink).trim()) ||
    (p?.canvas && String(p.canvas).trim()) ||
    (p?.canvasTab && String(p.canvasTab).trim()) ||
    (p?.canvasTitle && String(p.canvasTitle).trim()) ||
    "";

  if (!raw) return "";

  const up = raw.toUpperCase();

  // si viene el genérico "CANVAS", construimos el tab con el nombre del proyecto
  if (up === "CANVAS") {
    const name = String(p?.nombre ?? "").trim();
    if (!name) return "";
    return `Canvas ${name}`.replace(/\s+/g, " ").trim();
  }

  // normaliza espacios
  return raw.replace(/\s+/g, " ").trim();
}

export default function ProjectBoard({ projects = [] }) {
  const [searchText, setSearchText] = useState("");
  const [searchSponsor, setSearchSponsor] = useState("");
  const [searchYear, setSearchYear] = useState("");

  const years = useMemo(() => {
    const ys = Array.from(
      new Set(projects.map((p) => String(p.year ?? "")).filter(Boolean))
    );
    return ys.sort((a, b) => Number(b) - Number(a));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects;

    if (searchText) {
      const q = normalizeText(searchText);
      result = result.filter((p) => normalizeText(p.nombre).includes(q));
    }

    if (searchSponsor) {
      const q = normalizeText(searchSponsor);
      result = result.filter((p) => normalizeText(p.sponsor || "").includes(q));
    }

    if (searchYear) {
      result = result.filter((p) => String(p.year) === String(searchYear));
    }

    return result;
  }, [projects, searchText, searchSponsor, searchYear]);

  // ✅ Mostrar solo si existe Canvas o si tiene avance > 0
  const visibleProjects = useMemo(() => {
    return filteredProjects.filter((p) => {
      const pct = getPct(p.cumplimiento);
      const sheetTitle = getSheetTitle(p); // ✅ clave
      const hasCanvas = Boolean(sheetTitle);
      return hasCanvas || pct > 0;
    });
  }, [filteredProjects]);

  const totalVisible = visibleProjects.length;

  if (!projects.length) {
    return (
      <div className="pb-shell">
        <div className="pb-loading">
          <div className="pb-spinner" />
          <div>
            <p className="pb-loading-title">Cargando iniciativas…</p>
            <p className="pb-loading-sub">Preparando el portafolio</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-shell">
      {/* =========================
          Top / filtros
      ========================= */}
      <div className="pb-top">
        <div className="pb-filters">
          <div className="pb-field">
            <span className="pb-ico" aria-hidden="true">
              🔎
            </span>
            <input
              placeholder="Buscar iniciativa…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="pb-field">
            <span className="pb-ico" aria-hidden="true">
              👤
            </span>
            <input
              placeholder="Buscar sponsor…"
              value={searchSponsor}
              onChange={(e) => setSearchSponsor(e.target.value)}
            />
          </div>

          <div className="pb-field pb-select">
            <span className="pb-ico" aria-hidden="true">
              📅
            </span>
            <select
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
            >
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            className="pb-clear"
            onClick={() => {
              setSearchText("");
              setSearchSponsor("");
              setSearchYear("");
            }}
            disabled={!searchText && !searchSponsor && !searchYear}
            title="Limpiar filtros"
          >
            Limpiar
          </button>
        </div>

        <div className="pb-stats">
          <div className="pb-stat">
            <span className="pb-stat-kpi">{totalVisible}</span>
            <span className="pb-stat-label">Mostrando</span>
          </div>
        </div>
      </div>

      {/* =========================
          Empty state
      ========================= */}
      {totalVisible === 0 ? (
        <div className="pb-empty">
          <div className="pb-empty-icon">🗂️</div>
          <h3>No hay resultados con esos filtros</h3>
          <p>Intenta ajustar la búsqueda o limpiar filtros.</p>
          <button
            className="pb-empty-btn"
            onClick={() => {
              setSearchText("");
              setSearchSponsor("");
              setSearchYear("");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        /* =========================
            Board / tarjetas
        ========================= */
        <div className="board">
          {visibleProjects.map((p, i) => {
            const pct = getPct(p.cumplimiento);
            const sheetTitle = getSheetTitle(p); // ✅ clave
            const hasCanvas = Boolean(sheetTitle);

            const status = pct >= 100 ? "done" : pct > 0 ? "active" : "pending";

            return (
              <div
                key={`${p.nombre}-${p.year}-${i}`}
                className={`card card--${status}`}
                style={{ "--delay": `${i * 55}ms` }}
              >
                <div className="card-top">
                  <span className="pill">Proyecto</span>

                  <span className={`badge badge--${status}`}>
                    {pct >= 100
                      ? "Completado"
                      : pct > 0
                      ? "En progreso"
                      : "Planeado"}
                  </span>
                </div>

                <h3 className="card-title" title={p.nombre}>
                  {p.nombre}
                </h3>

                <div className="card-meta">
                  <div className="meta-item" title={p.sponsor || "Sin sponsor"}>
                    <span className="meta-ico" aria-hidden="true">
                      👤
                    </span>
                    <span className="meta-text">
                      {p.sponsor || "Sin sponsor"}
                    </span>
                  </div>

                  <div className="meta-item" title={String(p.year ?? "")}>
                    <span className="meta-ico" aria-hidden="true">
                      📅
                    </span>
                    <span className="meta-text">{p.year}</span>
                  </div>
                </div>

                <div
                  className={`progress progress--${status}`}
                  aria-label={`Avance ${pct}%`}
                >
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>

                <div className="card-footer">
                  <div className={`percent percent--${status}`}>{pct}%</div>

                  <button
                    className="btn"
                    disabled={!hasCanvas}
                    onClick={() => {
                      if (!hasCanvas) return;

                      const encoded = safeEncode(sheetTitle);

                      // ✅ útil para validar qué se manda al backend
                      console.log("➡️ Ver Canvas", {
                        nombre: p.nombre,
                        canvasLink: p.canvasLink,
                        sheetTitle,
                        url: `/projects/canvas/${encoded}`,
                      });

                      window.location.href = `/projects/canvas/${encoded}`;
                    }}
                    title={hasCanvas ? "Abrir Canvas" : "No hay Canvas disponible"}
                  >
                    Ver Canvas
                    <span className="btn-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </div>

                {/* Glow decor */}
                <div className="card-glow" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
