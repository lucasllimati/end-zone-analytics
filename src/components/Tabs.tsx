import { useEffect, useRef, type KeyboardEvent } from 'react';

interface Props<T extends string> {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}

/** Abas acessíveis (padrão WAI-ARIA: setas esquerda/direita, Home/End). */
export function Tabs<T extends string>({ tabs, value, onChange, label }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);
  // No celular a faixa de abas rola para o lado: a aba ativa fica centralizada (antes podia abrir fora da tela).
  // Só a faixa rola; a página não se move.
  const active = tabs.findIndex((t) => t.id === value);
  useEffect(() => {
    const el = list.current;
    const btn = refs.current[active];
    if (!el || !btn || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = btn.offsetLeft - el.offsetLeft - (el.clientWidth - btn.offsetWidth) / 2;
  }, [active]);
  const onKey = (e: KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div ref={list} className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          id={`tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </div>
  );
}
