import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { metric } from '../content/metrics';
import { useApp } from '../context/AppContext';

interface Props {
  /** Chave do dicionário de métricas (src/content/metrics.ts). */
  metric?: string;
  title?: string;
  simple?: string;
  expert?: string;
  formula?: string;
  label?: string;
}

/**
 * Ícone ⓘ com explicação. Abre com mouse, foco (teclado) ou toque; fecha com Esc ou clique fora.
 * Mostra a explicação simples ou técnica conforme o modo Iniciante/Expert.
 */
export function InfoTip(props: Props) {
  const def = props.metric ? metric(props.metric) : null;
  const title = props.title ?? def?.label ?? '';
  const simple = props.simple ?? def?.simple ?? '';
  const expert = props.expert ?? def?.expert ?? '';
  const formula = props.formula ?? def?.formula;
  const { mode } = useApp();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>();
  const id = useId();

  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    const p = pop.current?.getBoundingClientRect();
    if (!b) return;
    const w = p?.width ?? 300;
    const h = p?.height ?? 120;
    let left = b.left + b.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    let top = b.bottom + 8;
    if (top + h > window.innerHeight - 12) top = Math.max(12, b.top - h - 8);
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), btn.current?.focus());
    const onDown = (e: PointerEvent) => {
      if (!btn.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node)) setOpen(false);
    };
    const onScroll = () => place();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, place]);

  const primary = mode === 'expert' ? expert || simple : simple || expert;
  const secondary = mode === 'expert' ? (simple !== primary ? simple : '') : expert !== primary ? expert : '';

  return (
    <span className="infotip">
      <button
        ref={btn}
        type="button"
        className="infotip-btn"
        aria-label={`O que é ${props.label ?? title}?`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => {
          window.clearTimeout(hoverTimer.current);
          hoverTimer.current = window.setTimeout(() => setOpen(true), 120);
        }}
        onMouseLeave={() => {
          window.clearTimeout(hoverTimer.current);
          hoverTimer.current = window.setTimeout(() => setOpen(false), 180);
        }}
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            ref={pop}
            id={id}
            role="tooltip"
            className="infotip-pop"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={() => window.clearTimeout(hoverTimer.current)}
            onMouseLeave={() => setOpen(false)}
          >
            <strong>{title}</strong>
            {primary}
            {secondary && (
              <div style={{ marginTop: 8 }}>
                <span className="muted">{mode === 'expert' ? 'Em palavras simples: ' : 'Para especialistas: '}</span>
                {secondary}
              </div>
            )}
            {formula && <div className="formula">{formula}</div>}
            <span className="mode-tag">Modo {mode === 'expert' ? 'Expert' : 'Iniciante'} · troque no topo da página</span>
          </div>,
          document.body,
        )}
    </span>
  );
}
