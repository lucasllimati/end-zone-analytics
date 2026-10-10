import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV } from '../content/nav';
import { useApp } from '../context/AppContext';
import { useManifest } from '../data/hooks';
import { BrandMark, Chevron, CloseIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from './Icons';
import { SearchPalette } from './SearchPalette';
import { UpdateBanner } from './UpdateBanner';
import { dateBR } from '../lib/format';

function NavDropdown({ group }: { group: (typeof NAV)[number] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const active = group.items.some((i) => loc.pathname.startsWith(i.to.split(/[?#]/)[0]));
  useEffect(() => setOpen(false), [loc.pathname, loc.search]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="nav-group" ref={ref} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`nav-trigger${active ? ' active' : ''}`}
        aria-expanded={open}
        aria-controls={`menu-${group.id}`}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
      >
        {group.label} <Chevron />
      </button>
      {open && (
        <div className="nav-menu" id={`menu-${group.id}`}>
          {group.items.map((it) => (
            <Link key={it.to} to={it.to} onClick={() => setOpen(false)}>
              {it.label}
              <span>{it.desc}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SeasonSelect() {
  const { season, setSeason } = useApp();
  const m = useManifest();
  if (!m.data) return null;
  const { firstSeason, currentSeason } = m.data.coverage;
  const years = Array.from({ length: currentSeason - firstSeason + 1 }, (_, i) => currentSeason - i);
  return (
    <label className="hide-sm" title="Viagem no tempo: todas as páginas respeitam a temporada escolhida">
      <span className="sr-only">Temporada (viagem no tempo)</span>
      <select className="season-select" value={season ?? ''} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{currentSeason} (atual)</option>
        {years.slice(1).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModeToggle() {
  const { mode, setMode } = useApp();
  return (
    <div className="mode-toggle" role="group" aria-label="Nível das explicações">
      <button type="button" aria-pressed={mode === 'beginner'} onClick={() => setMode('beginner')} title="Explicações simples, sem jargão">
        Iniciante
      </button>
      <button type="button" aria-pressed={mode === 'expert'} onClick={() => setMode('expert')} title="Métricas avançadas (EPA, CPOE…) e notas técnicas">
        Expert
      </button>
    </div>
  );
}

export function Layout() {
  const { theme, toggleTheme, setSearchOpen } = useApp();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  const m = useManifest();
  useEffect(() => {
    setDrawer(false);
    if (!loc.hash) window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="End Zone Analytics — início">
            <BrandMark />
            <span>
              End Zone Analytics
              <small>NFL · dados · história</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Principal">
            {NAV.map((g) => (
              <NavDropdown key={g.id} group={g} />
            ))}
            <NavLink className="nav-link" to="/data">
              Dados
            </NavLink>
          </nav>
          <div className="header-tools">
            <button type="button" className="search-btn" onClick={() => setSearchOpen(true)} aria-label="Buscar (Ctrl+K)">
              <SearchIcon />
              <span className="label">Buscar…</span>
              <span className="label spacer" />
              <kbd className="label">Ctrl K</kbd>
            </button>
            <SeasonSelect />
            <span className="hide-sm">
              <ModeToggle />
            </span>
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button type="button" className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Abrir menu" aria-expanded={drawer}>
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>
      <UpdateBanner />
      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <nav className="drawer" aria-label="Menu">
            <div className="row between">
              <strong>Menu</strong>
              <button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label="Fechar menu">
                <CloseIcon />
              </button>
            </div>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              <ModeToggle />
              <SeasonSelectMobile />
            </div>
            <Link to="/">Início</Link>
            {NAV.map((g) => (
              <div key={g.id}>
                <h3>{g.label}</h3>
                {g.items.map((it) => (
                  <Link key={it.to} to={it.to}>
                    {it.label}
                  </Link>
                ))}
              </div>
            ))}
            <h3>Plataforma</h3>
            <Link to="/data">Dados, fontes e atualização</Link>
          </nav>
        </>
      )}
      <SearchPalette />
      <main id="conteudo" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="cols">
            <div>
              <div className="brand" style={{ marginBottom: 8 }}>
                <BrandMark />
                <span style={{ color: 'var(--text)' }}>End Zone Analytics</span>
              </div>
              <p>Dados, história e analytics da NFL para iniciantes e especialistas.</p>
              <p className="xsmall">
                Dados: nflverse (CC-BY 4.0), cobertura {m.data ? `${m.data.coverage.firstSeason}–${m.data.coverage.lastSeason}` : '1999+'}; histórico anterior por curadoria
                (NFL Record &amp; Fact Book). Atualizado em {m.data ? dateBR(m.data.generatedAt) : '—'}.
              </p>
              <p className="xsmall">
                Projeto independente, sem afiliação com a NFL. Nomes e logos de times são marcas registradas de seus detentores e aparecem apenas para identificação.
              </p>
            </div>
            {NAV.slice(0, 4).map((g) => (
              <div key={g.id}>
                <h4>{g.label}</h4>
                {g.items.slice(0, 5).map((it) => (
                  <Link key={it.to} to={it.to}>
                    {it.label}
                  </Link>
                ))}
              </div>
            ))}
            <div>
              <h4>Aprenda</h4>
              {NAV[4].items.map((it) => (
                <Link key={it.to} to={it.to}>
                  {it.label}
                </Link>
              ))}
              <Link to="/data">Dados e fontes</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function SeasonSelectMobile() {
  const { season, setSeason } = useApp();
  const m = useManifest();
  if (!m.data) return null;
  const { firstSeason, currentSeason } = m.data.coverage;
  const years = Array.from({ length: currentSeason - firstSeason + 1 }, (_, i) => currentSeason - i);
  return (
    <label className="field">
      Temporada
      <select className="select" value={season ?? ''} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{currentSeason} (atual)</option>
        {years.slice(1).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
