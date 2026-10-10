import { Link } from 'react-router-dom';
import { Seo } from '../components/Bits';
import { useApp } from '../context/AppContext';

export default function NotFound() {
  const { setSearchOpen } = useApp();
  return (
    <div className="empty" style={{ padding: 48 }}>
      <Seo title="Página não encontrada" />
      <div className="hero-number" style={{ color: 'var(--text)' }}>
        4th &amp; 404
      </div>
      <p style={{ marginTop: 12 }}>Esta página não existe — mas ainda dá para converter.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link className="btn primary" to="/">
          Voltar ao início
        </Link>
        <button type="button" className="btn" onClick={() => setSearchOpen(true)}>
          Buscar
        </button>
      </div>
    </div>
  );
}
