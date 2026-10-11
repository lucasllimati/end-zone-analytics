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

/**
 * Símbolo do End Zone Analytics: bola oval minimalista com costura estilizada e um corte de trajetória
 * (precisão e movimento). `mono` usa a cor do texto (contextos sem cor).
 */
export const BrandMark = ({ mono = false, size = 34 }: { mono?: boolean; size?: number }) => {
  const rim = mono ? 'currentColor' : 'var(--accent)';
  const ink = mono ? 'currentColor' : 'var(--text)';
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g transform="rotate(-32 20 20)">
        <path d="M3 20C8.5 9.5 31.5 9.5 37 20C31.5 30.5 8.5 30.5 3 20Z" fill="none" stroke={rim} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M8.2 14.6c1.5 3.3 1.5 7.5 0 10.8M31.8 14.6c-1.5 3.3-1.5 7.5 0 10.8" fill="none" stroke={rim} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M14 20h12" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 17.8v4.4M18.7 17.8v4.4M21.3 17.8v4.4M24 17.8v4.4" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <path d="M2.5 34.5C12 33 24 27 33 15" fill="none" stroke={mono ? 'currentColor' : 'var(--accent-strong)'} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 3.4" />
    </svg>
  );
};

/** Logotipo horizontal: símbolo + nome. O nome acessível é sempre "End Zone Analytics". */
export const BrandLogo = ({ mono = false, compact = false }: { mono?: boolean; compact?: boolean }) => (
  <span className={`brand-logo${mono ? ' mono' : ''}`}>
    <BrandMark mono={mono} />
    {!compact && (
      <span className="brand-word" aria-hidden="true">
        <span className="brand-word-main">End Zone</span>
        <span className="brand-word-sub">Analytics</span>
      </span>
    )}
  </span>
);
export const ArrowRight = () => (
  <svg {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const ChevronLeft = () => (
  <svg {...base}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
export const ChevronRight = () => (
  <svg {...base}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
export const CalendarIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const ClockIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const ShieldIcon = () => (
  <svg {...base}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const TrophyIcon = () => (
  <svg {...base}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3M16 6h4v2a3 3 0 0 1-4 3M12 13v4M8 21h8M9 17h6" />
  </svg>
);
export const ChartIcon = () => (
  <svg {...base}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const BallIcon = () => (
  <svg {...base}>
    <g transform="rotate(-35 12 12)">
      <path d="M2.5 12c3.5-6 15.5-6 19 0-3.5 6-15.5 6-19 0z" />
      <path d="M9 12h6M10.5 10.6v2.8M13.5 10.6v2.8" />
    </g>
  </svg>
);
export const StarIcon = () => (
  <svg {...base}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </svg>
);
export const BookIcon = () => (
  <svg {...base}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7" />
  </svg>
);
export const UserIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
