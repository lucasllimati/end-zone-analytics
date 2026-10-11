/**
 * Ilustração do hero: bola oval sob refletores de estádio, com luz azul de contorno.
 * SVG vetorial (poucos KB, nítido em qualquer densidade, sem requisição extra). Decorativa: aria-hidden.
 */
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 720 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="ha-glow" cx="58%" cy="52%" r="55%">
          <stop offset="0" stopColor="#078bff" stopOpacity="0.42" />
          <stop offset="0.45" stopColor="#0a3d78" stopOpacity="0.28" />
          <stop offset="1" stopColor="#050b16" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ha-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe3ff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#bfe3ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ha-leather" cx="42%" cy="32%" r="78%">
          <stop offset="0" stopColor="#7a4128" />
          <stop offset="0.45" stopColor="#4c2414" />
          <stop offset="1" stopColor="#1d0c06" />
        </radialGradient>
        <linearGradient id="ha-rim" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#35b6ff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#35b6ff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#7fd0ff" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="ha-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b2340" stopOpacity="0" />
          <stop offset="1" stopColor="#0b2340" stopOpacity="0.9" />
        </linearGradient>
        <filter id="ha-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="ha-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" result="n" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.28 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <clipPath id="ha-ball">
          <path d="M-205 0C-150-104 150-104 205 0C150 104-150 104-205 0Z" />
        </clipPath>
      </defs>

      <rect width="720" height="460" fill="url(#ha-glow)" />

      {/* Refletores e feixes de luz */}
      <g opacity="0.9">
        <polygon points="455,0 520,0 380,330 300,330" fill="url(#ha-beam)" />
        <polygon points="610,0 660,0 560,330 500,330" fill="url(#ha-beam)" opacity="0.7" />
        <polygon points="250,0 285,0 230,300 180,300" fill="url(#ha-beam)" opacity="0.45" />
      </g>
      <g fill="#dff1ff" filter="url(#ha-soft)" opacity="0.75">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={`a${i}`} cx={470 + i * 14} cy={22 + (i % 2) * 4} r="4.5" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={`b${i}`} cx={612 + i * 13} cy={30 + (i % 2) * 3} r="4" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <circle key={`c${i}`} cx={238 + i * 12} cy={36 + (i % 2) * 3} r="3" opacity="0.6" />
        ))}
      </g>

      {/* Campo em perspectiva */}
      <rect y="300" width="720" height="160" fill="url(#ha-field)" />
      <g stroke="#2a5c92" strokeOpacity="0.45" strokeWidth="1.5">
        <path d="M0 360H720M0 395H720M0 438H720" />
        <path d="M360 300L120 460M430 300L330 460M500 300L540 460M570 300L750 460" />
      </g>

      {/* Bola */}
      <g transform="translate(410 268) rotate(-24)">
        <ellipse cx="0" cy="96" rx="190" ry="20" fill="#000" opacity="0.45" filter="url(#ha-soft)" />
        <path d="M-205 0C-150-104 150-104 205 0C150 104-150 104-205 0Z" fill="url(#ha-leather)" />
        <g clipPath="url(#ha-ball)">
          <rect x="-210" y="-110" width="420" height="220" fill="#fff" filter="url(#ha-grain)" opacity="0.5" />
          <path d="M-150-70C-118-24-118 24-150 70M150-70C118-24 118 24 150 70" fill="none" stroke="#120603" strokeOpacity="0.55" strokeWidth="3" />
          <ellipse cx="-30" cy="-46" rx="120" ry="26" fill="#fff" opacity="0.07" />
        </g>
        <path d="M-205 0C-150-104 150-104 205 0C150 104-150 104-205 0Z" fill="none" stroke="url(#ha-rim)" strokeWidth="3.5" />
        {/* Costura */}
        <path d="M-70-40C-24-48 24-48 70-40" fill="none" stroke="#f4f7fc" strokeWidth="5" strokeLinecap="round" />
        {[-52, -31, -10, 11, 32, 53].map((x) => (
          <path key={x} d={`M${x} -56V-30`} stroke="#f4f7fc" strokeWidth="5.5" strokeLinecap="round" />
        ))}
        <text x="-6" y="26" textAnchor="middle" fontFamily="'Barlow Condensed','Arial Narrow',sans-serif" fontWeight="800" fontSize="38" letterSpacing="2" fill="#0d0402" opacity="0.38">
          END ZONE
        </text>
        <text x="-6" y="50" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="600" fontSize="13" letterSpacing="7" fill="#0d0402" opacity="0.35">
          ANALYTICS
        </text>
      </g>

      {/* Detalhe da marca: cortes diagonais */}
      <g fill="#078bff">
        <polygon points="640,460 668,460 720,404 720,374" opacity="0.9" />
        <polygon points="684,460 702,460 720,442 720,422" opacity="0.6" />
      </g>
    </svg>
  );
}
