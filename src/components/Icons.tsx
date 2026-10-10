/** Ícones SVG inline (sem dependências). Decorativos: aria-hidden. */
const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const MoonIcon = () => (
  <svg {...base}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
export const MenuIcon = () => (
  <svg {...base}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const CloseIcon = () => (
  <svg {...base}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const Chevron = () => (
  <svg {...base} width={12} height={12}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const RefreshIcon = () => (
  <svg {...base}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

/** Marca do End Zone Analytics: end zone listrada + barra de dados. */
export const BrandMark = () => (
  <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
    <path d="M8 1v30" stroke="var(--accent-ink)" strokeWidth="1.5" opacity="0.5" />
    <path d="M3 8l5-5M3 14l5-5M3 20l5-5M3 26l5-5M4 31l4-4" stroke="var(--accent-ink)" strokeWidth="1.2" opacity="0.45" />
    <rect x="12" y="17" width="3.4" height="8" rx="1.2" fill="var(--accent-ink)" />
    <rect x="17.3" y="12" width="3.4" height="13" rx="1.2" fill="var(--accent-ink)" />
    <rect x="22.6" y="7" width="3.4" height="18" rx="1.2" fill="var(--accent-ink)" />
  </svg>
);
