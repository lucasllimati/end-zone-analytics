/**
 * Idioma dos termos vindos da ESPN (Game Center e placares): português (padrão) ou o original em inglês.
 * A escolha fica no navegador e vale para todos os cartões da página ao mesmo tempo.
 * Em qualquer idioma, passar o mouse (ou tocar) no termo mostra a tradução, o original e a descrição.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { InfoTip } from './InfoTip';
import type { Term } from '../content/espnTerms';

export type TermsLang = 'pt' | 'en';
const KEY = 'eza-terms';
const EVENT = 'eza-terms-change';

const read = (): TermsLang => {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
};

export function useTermsLang(): [TermsLang, (l: TermsLang) => void] {
  const [lang, setLang] = useState<TermsLang>(read);
  useEffect(() => {
    const sync = () => setLang(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const set = (l: TermsLang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* sem armazenamento: vale só nesta página */
    }
    setLang(l);
    window.dispatchEvent(new Event(EVENT));
  };
  return [lang, set];
}

/** Seletor compacto "PT | EN" para os cartões com termos da ESPN. */
export function TermsToggle() {
  const [lang, setLang] = useTermsLang();
  return (
    <div className="segmented segmented-sm" role="group" aria-label="Idioma dos termos">
      <button type="button" aria-pressed={lang === 'pt'} onClick={() => setLang('pt')} title="Termos em português">
        PT
      </button>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} title="Termos originais em inglês (ESPN)">
        EN
      </button>
    </div>
  );
}

/**
 * Termo traduzido com explicação. Mostra o nome no idioma escolhido; a explicação traz o outro idioma
 * e a descrição. Sem tradução conhecida, mostra o texto original.
 */
export function TermText({ term, fallback, lang }: { term: Term | null; fallback: string; lang: TermsLang }): ReactNode {
  if (!term) return fallback;
  return (
    <InfoTip title={term.pt} simple={term.desc} note={<>Em inglês: <strong>{term.en}</strong></>}>
      {lang === 'en' ? term.en : term.pt}
    </InfoTip>
  );
}
