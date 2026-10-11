import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV } from '../content/nav';
import { useApp } from '../context/AppContext';
import { useManifest } from '../data/hooks';
import { BrandLogo, Chevron, CloseIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from './Icons';
import { SearchPalette } from './SearchPalette';
import { UpdateBanner } from './UpdateBanner';
import { dateBR } from '../lib/format';

/** Atalho exibido conforme o sistema: ⌘K no macOS/iOS, Ctrl K nos demais. */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
const SHORTCUT = IS_MAC ? '⌘ K' : 'Ctrl K';

function NavDropdown({ group }: { group: (typeof NAV)[number] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const here = loc.pathname + loc.search;
  const active = group.items.some((i) => {
    const [path, query] = i.to.split(/[?#]/);
    if (path === '/season') return loc.pathname === '/season' && (query ? here.includes(query) : !loc.search.includes('tab=power'));
    return loc.pathname.startsWith(path);
  });
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

function useSeasonOptions() {
  const m = useManifest();
  if (!m.data) return null;
  const { firstSeason, currentSeason } = m.data.coverage;
  return { currentSeason, years: Array.from({ length: currentSeason - firstSeason + 1 }, (_, i) => currentSeason - i) };
}

function SeasonSelect({ variant }: { variant: 'header' | 'drawer' }) {
  const { season, setSeason } = useApp();
  const opts = useSeasonOptions();
  if (!opts) return null;
  const select = (
    <select
      className={variant === 'header' ? 'season-select' : 'select'}
      value={season ?? ''}
      onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : null)}
      aria-label={variant === 'header' ? 'Temporada' : undefined}
    >
      <option value="">{opts.currentSeason} · atual</option>
      {opts.years.slice(1).map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
  if (variant === 'header')
    return (
      <span className="hide-sm season-wrap" title="Todas as páginas respeitam a temporada escolhida">
        {select}
      </span>
    );
  return (
    <label className="field">
      Temporada
      {select}
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

function Drawer({ onClose }: { onClose: () => void }) {
  const { setSearchOpen } = useApp();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <nav className="drawer" aria-label="Menu" role="dialog" aria-modal="true">
        <div className="row between">
          <BrandLogo />
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Fechar menu">
            <CloseIcon />
          </button>
        </div>
        <button
          type="button"
          className="search-btn drawer-search"
          onClick={() => {
            onClose();
            setSearchOpen(true);
          }}
        >
          <SearchIcon />
          <span>Buscar times, jogadores, páginas…</span>
        </button>
        <div className="drawer-controls">
          <ModeToggle />
          <SeasonSelect variant="drawer" />
        </div>
        <Link to="/" className="drawer-home">
          Início
        </Link>
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
        <Link to="/data">Fontes e qualidade dos dados</Link>
      </nav>
    </>
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
      if ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
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
            <BrandLogo />
          </Link>
          <nav className="nav" aria-label="Principal">
            <NavLink className="nav-link" to="/" end>
              Início
            </NavLink>
            {NAV.map((g) => (
              <NavDropdown key={g.id} group={g} />
            ))}
          </nav>
          <div className="header-tools">
            <button type="button" className="search-btn" onClick={() => setSearchOpen(true)} aria-label={`Buscar (${SHORTCUT.replace(' ', '+')})`}>
              <SearchIcon />
              <span className="label">Buscar times, jogadores…</span>
              <span className="label spacer" />
              <kbd className="label">{SHORTCUT}</kbd>
            </button>
            <SeasonSelect variant="header" />
            <span className="hide-md">
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
      {drawer && <Drawer onClose={() => setDrawer(false)} />}
      <SearchPalette />
      <main id="conteudo" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <BrandLogo />
              <p>Dados, história e analytics da NFL para iniciantes e especialistas.</p>
              <p className="footer-quote">“Mostrar primeiro o que importa, permitir explorar o que interessa e explicar como os números foram obtidos.”</p>
            </div>
            <div className="footer-cols">
              {NAV.map((g) => (
                <div key={g.id}>
                  <h4>{g.label}</h4>
                  {g.items.map((it) => (
                    <Link key={it.to} to={it.to}>
                      {it.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              Dados: nflverse (CC-BY 4.0), cobertura {m.data ? `${m.data.coverage.firstSeason}–${m.data.coverage.lastSeason}` : '1999+'}; histórico anterior por curadoria (NFL Record &amp; Fact
              Book). Atualizado em {m.data ? dateBR(m.data.generatedAt) : '—'}. <Link to="/data">Fontes e qualidade dos dados</Link>.
            </p>
            <p>Projeto independente, sem afiliação com a NFL. Nomes e logos de times são marcas registradas de seus detentores e aparecem apenas para identificação.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
