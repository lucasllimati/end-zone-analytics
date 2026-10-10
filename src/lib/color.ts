/** Contraste WCAG entre duas cores hex. */
function lum(hex: string): number {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  const [r, g, b] = v.map((x) => {
    const c = parseInt(x, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const SURFACE = { dark: '#131417', light: '#ffffff' };

/**
 * Cor do time legível sobre a superfície do tema (contraste ≥ 2:1 para marcas gráficas).
 * Tenta a cor primária, depois a secundária; senão usa o slot categórico informado.
 */
export function readableTeamColor(colors: (string | null | undefined)[], theme: 'dark' | 'light', fallback: string): string {
  for (const c of colors) if (c && /^#[0-9a-f]{3,6}$/i.test(c) && contrast(c, SURFACE[theme]) >= 2) return c;
  return fallback;
}
