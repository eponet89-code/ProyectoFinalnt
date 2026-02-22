import logoLiverpool from '../assets/liverpool-logo.png';

export default function Header() {
  return (
    <header className="layout-header glass-header-top responsive-header">
      <div className="header-container">
        <img
          src={logoLiverpool}
          alt="Liverpool"
          className="header-logo"
        />
        <h2 className="header-title">
          Proyectos Business Partner TI 
        </h2>
      </div>
    </header>
  );
}