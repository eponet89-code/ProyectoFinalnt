import React, { useState } from 'react';
import './login.css';

export default function Login({ onLoginSuccess }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (user.toUpperCase() === "BLIVERP" && pass === "136883") {
      onLoginSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <img 
          src="/logoLiverpol.png" 
          alt="Liverpool Logo" 
          className="login-logo" 
        />
        <h3>Portafolio de Proyectos Inteligente</h3>
        
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Usuario BP TI" 
            value={user}
            onChange={(e) => setUser(e.target.value)} 
            required 
          />
          
          <div className="password-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Contraseña" 
              value={pass}
              onChange={(e) => setPass(e.target.value)} 
              required 
            />
            <button 
              type="button" 
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "✕" : "👁"} {/* Usé caracteres simples para evitar errores de iconos */}
            </button>
          </div>

          {error && <p className="login-error">Acceso denegado: Verifique sus credenciales</p>}
          
          <button type="submit" className="login-btn">
            Iniciar Sesión
          </button>
        </form>
        
        <p style={{marginTop: '20px', fontSize: '0.7rem', color: '#999'}}>
          El Puerto de Liverpool © 2026 | Acceso Restringido
        </p>
      </div>
    </div>
  );
}