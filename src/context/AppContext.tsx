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

/**
 * Quantos componentes da página atual mudam de conteúdo com o modo Iniciante/Expert.
 * O seletor de modo só aparece quando há pelo menos um (fica separado do AppState para que
 * montar/desmontar componentes não re-renderize o app inteiro).
 */
const ModeUsageCtx = createContext<{ count: number; register: () => () => void }>({ count: 0, register: () => () => {} });

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
  const [modeUsers, setModeUsers] = useState(0);
  const register = useCallback(() => {
    setModeUsers((n) => n + 1);
    return () => setModeUsers((n) => n - 1);
  }, []);
  const usage = useMemo(() => ({ count: modeUsers, register }), [modeUsers, register]);

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
  return (
    <Ctx.Provider value={value}>
      <ModeUsageCtx.Provider value={usage}>{children}</ModeUsageCtx.Provider>
    </Ctx.Provider>
  );
}

/** Marca o componente como dependente do modo enquanto estiver na tela (`active` = de fato muda algo). */
export function useModeSensitive(active = true) {
  const { register } = useContext(ModeUsageCtx);
  useEffect(() => (active ? register() : undefined), [active, register]);
}

/** true quando a página atual tem algo que muda com o modo (controla a exibição do seletor). */
export const useModeRelevant = () => useContext(ModeUsageCtx).count > 0;

export function useApp(): AppState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}
