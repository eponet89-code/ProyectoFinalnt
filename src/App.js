import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import MainLayout from './layouts/MainLayout';
import CanvasView from './components/CanvasView';
import Login from './components/login'; // El componente que creamos antes

import './App.css';

function App() {
  const [projects, setProjects] = useState([]);
  // Leemos si ya estaba logueado en esta sesión para no pedir login al refrescar
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isLoggedIn') === 'true'
  );

  useEffect(() => {
    
    if (isAuthenticated) {
        axios.get('https://proyectointer.onrender.com/projects')
        .then(res => setProjects(res.data))
        
        .catch(err => console.error("ERROR VERSION NUEVA:", err));
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Si NO está logueado, cualquier ruta lo manda al Login */}
        {!isAuthenticated ? (
          <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        ) : (
          <>
            {/* Vista principal protegida */}
            <Route
              path="/"
              element={<MainLayout projects={projects} onLogout={handleLogout} />}
            />

            {/* Vista Canvas protegida */}
            <Route
              path="/projects/canvas/:sheetName"
              element={<CanvasView />}
            />

            {/* Redirigir cualquier otra cosa al inicio */}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;