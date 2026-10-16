import { useEffect, useRef, useState, type RefObject } from 'react';
import { download, serializeSvg, slugify, svgToPng, toCsv } from '../lib/export';

interface Props {
  name: string;
  rows?: () => Record<string, unknown>[];
  svg?: RefObject<SVGSVGElement | null>;
}

/** Menu "Exportar": CSV/JSON para dados, SVG/PNG para gráficos. */
export function ExportMenu({ name, rows, svg }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof PointerEvent && ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const file = slugify(name) || 'dados';
  const act = async (kind: 'csv' | 'json' | 'svg' | 'png') => {
    setOpen(false);
    if (kind === 'csv' && rows) download(`${file}.csv`, '﻿' + toCsv(rows()), 'text/csv;charset=utf-8');
    if (kind === 'json' && rows) download(`${file}.json`, JSON.stringify(rows(), null, 2), 'application/json');
    if (kind === 'svg' && svg?.current) download(`${file}.svg`, serializeSvg(svg.current), 'image/svg+xml');
    if (kind === 'png' && svg?.current) download(`${file}.png`, await svgToPng(svg.current));
  };
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="btn sm ghost" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Exportar ▾
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {rows && (
            <>
              <button role="menuitem" type="button" onClick={() => act('csv')}>
                CSV (planilha)
              </button>
              <button role="menuitem" type="button" onClick={() => act('json')}>
                JSON
              </button>
            </>
          )}
          {svg && (
            <>
              <button role="menuitem" type="button" onClick={() => act('png')}>
                Imagem PNG
              </button>
              <button role="menuitem" type="button" onClick={() => act('svg')}>
                Vetor SVG
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
