import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Mode = 'beginner' | 'expert';
export type Theme = 'dark' | 'light';

interface AppState {
  /** Temporada global ("time travel"). null = temporada atual dos dados. */
  season: number | null;
  setSeason: (s: number | null) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  theme: Theme;
  toggleTheme: () => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* armazenamento indisponível: preferências valem só nesta sessão */
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [season, setSeasonState] = useState<number | null>(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get('season'));
    return Number.isFinite(fromUrl) && fromUrl > 1900 ? fromUrl : null;
  });
  const [mode, setModeState] = useState<Mode>(() => (read('eza-mode') === 'expert' ? 'expert' : 'beginner'));
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    write('eza-theme', theme);
  }, [theme]);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    write('eza-mode', m);
  }, []);

  const setSeason = useCallback((s: number | null) => setSeasonState(s), []);
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(
    () => ({ season, setSeason, mode, setMode, theme, toggleTheme, searchOpen, setSearchOpen }),
    [season, setSeason, mode, setMode, theme, toggleTheme, searchOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}
