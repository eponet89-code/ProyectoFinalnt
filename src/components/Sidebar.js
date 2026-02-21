import React, { useMemo, useState } from "react";
import "./Sidebar.css";

export default function Sidebar({ onChange, onLogout, defaultActive = "home" }) {
  const [active, setActive] = useState(defaultActive);

  const items = useMemo(() => [
    { 
      key: "home", 
      label: "Iniciativas",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
    },
    { 
      key: "progress", 
      label: "Avance",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
    },
    { 
      key: "incidencias", 
      label: "Incidencias",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
    },
  ], []);

  function go(key) {
    setActive(key);
    onChange?.(key);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-badge">
          <span>BP</span>
          <span>TI</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((it) => (
          <button
            key={it.key}
            className={`sidebar-item ${active === it.key ? "active" : ""}`}
            onClick={() => go(it.key)}
            title={it.label}
          >
            {it.icon}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
       <button
        className="sidebar-item logout-variant"
        onClick={onLogout} // Ejecuta la función de App.js que limpia el localStorage
        title="Cerrar Sesión"
      >
        {/* Icono de Salida (Log Out) */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
      </div>
    </aside>
  );
}