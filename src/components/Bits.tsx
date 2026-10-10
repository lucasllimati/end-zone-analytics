import { useEffect, type ReactNode } from 'react';
import { InfoTip } from './InfoTip';
import { useApp } from '../context/AppContext';

/** Título, descrição e metadados de SEO/OpenGraph por página. */
export function Seo({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    document.title = title ? `${title} · End Zone Analytics` : 'End Zone Analytics — dados, história e analytics da NFL';
    const set = (sel: string, attr: string, val: string) => {
      let el = document.head.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        const [k, v] = attr.split('=');
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.content = val;
    };
    if (description) {
      set('meta[name="description"]', 'name=description', description);
      set('meta[property="og:description"]', 'property=og:description', description);
    }
    set('meta[property="og:title"]', 'property=og:title', document.title);
    let canon = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) {
      canon = document.createElement('link');
      canon.rel = 'canonical';
      document.head.appendChild(canon);
    }
    canon.href = window.location.origin + window.location.pathname;
  }, [title, description]);
  return null;
}

export function PageHeader({ eyebrow, title, lede, children }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </header>
  );
}

export function StatTile({ label, value, note, metric }: { label: string; value: ReactNode; note?: ReactNode; metric?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">
        {label}
        {metric && <InfoTip metric={metric} label={label} />}
      </div>
      <div className="tile-value">{value}</div>
      {note && <div className="tile-note">{note}</div>}
    </div>
  );
}

/** Caixa que só aparece no modo indicado (ou com estilo diferente em cada modo). */
export function ModeNote({ beginner, expert }: { beginner?: ReactNode; expert?: ReactNode }) {
  const { mode } = useApp();
  if (mode === 'beginner' && beginner)
    return (
      <div className="callout info">
        <div className="callout-title">Explicação simples</div>
        {beginner}
      </div>
    );
  if (mode === 'expert' && expert)
    return (
      <div className="callout expert">
        <div className="callout-title">Nota técnica</div>
        {expert}
      </div>
    );
  return null;
}

export function Callout({ title, children, tone = 'default' }: { title?: string; children: ReactNode; tone?: 'default' | 'info' | 'expert' }) {
  return (
    <div className={`callout ${tone === 'default' ? '' : tone}`}>
      {title && <div className="callout-title">{title}</div>}
      {children}
    </div>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="xsmall muted" style={{ marginTop: 8 }}>Fonte: {children}</p>;
}
