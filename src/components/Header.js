import logoLiverpool from '../assets/liverpool-logo.png';

export default function Header() {
  return (
    <header className="layout-header glass-header-top">
      <img
        src={logoLiverpool}
        alt="Liverpool"
        style={{ height: 60 }}
      />
      <h2 style={{ margin: 0, color: '#db0080', fontWeight: 800 }}>
        Proyectos Business Partner TI 
      </h2>
    </header>
  );
}
