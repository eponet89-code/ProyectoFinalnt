import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ProjectBoard from '../components/ProjectBoard';
import ProgressChart from '../components/ProgressChart';
import './MainLayout.css';
import IncidenciasDashboard from '../components/IncidenciasDashboard';
import PuntosDolor from '../components/PuntosDolor'; // Componente para los puntos de dolor

// Agregamos onLogout a los props
export default function MainLayout({ projects, onLogout }) {
  const [view, setView] = useState('home');

  return (
    <div className="layout-root">
      {/* Pasamos onLogout al Sidebar */}
      <Sidebar onChange={setView} active={view} onLogout={onLogout} />

      <div className="layout-content">
        <Header />

        <main className="layout-main">
          {view === 'home' && <ProjectBoard projects={projects} />}
          {view === 'progress' && <ProgressChart projects={projects} />}
          {view === 'incidencias' && <IncidenciasDashboard />}
           {view === 'puntos' && <PuntosDolor />}
        </main>
      </div>
    </div>
  );
}