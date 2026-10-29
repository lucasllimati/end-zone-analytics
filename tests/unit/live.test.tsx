/**
 * Consumo de requisições do Game Center ao vivo: 30 s com jogo em andamento, nada com a aba oculta,
 * pausa depois de 30 min sem interação e retomada com qualquer interação.
 */
import { act, renderHook } from '@testing-library/react';
import { IDLE_PAUSE_MS, LIVE_POLL_MS, resumeLive, useGameDetail, useLivePaused, useLiveScores, watchTeamInBackground, withLiveFinals } from '../../src/data/live';

let visibility: DocumentVisibilityState = 'visible';
const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ state: 'in' }), { headers: { 'content-type': 'application/json' } }));

beforeAll(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockClear();
  visibility = 'visible';
  resumeLive();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

describe('Game Center ao vivo', () => {
  it('consulta a cada 30 s enquanto o jogo está em andamento', async () => {
    const { unmount } = renderHook(() => useGameDetail('401873026'));
    await tick(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await tick(LIVE_POLL_MS * 3);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    unmount();
  });

  it('aba oculta não consulta; ao voltar, atualiza na hora', async () => {
    const { unmount } = renderHook(() => useGameDetail('401873026'));
    await tick(0);
    visibility = 'hidden';
    await tick(LIVE_POLL_MS * 10);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    visibility = 'visible';
    await act(async () => void document.dispatchEvent(new Event('visibilitychange')));
    await tick(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('pausa depois de 30 min sem interação e retoma com uma interação', async () => {
    const { unmount } = renderHook(() => useGameDetail('401873026'));
    const paused = renderHook(() => useLivePaused());
    await tick(0);
    await tick(IDLE_PAUSE_MS + LIVE_POLL_MS * 2);
    const before = fetchSpy.mock.calls.length;
    expect(paused.result.current).toBe(true);
    await tick(LIVE_POLL_MS * 20);
    expect(fetchSpy.mock.calls.length).toBe(before);
    await act(async () => void window.dispatchEvent(new Event('pointerdown')));
    await tick(0);
    expect(paused.result.current).toBe(false);
    expect(fetchSpy.mock.calls.length).toBe(before + 1);
    unmount();
    paused.unmount();
  });
});

describe('Game Center antes do jogo', () => {
  it('confere a cada 5 min e passa a 30 s quando o jogo começa', async () => {
    let state = 'pre';
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ state }), { headers: { 'content-type': 'application/json' } }));
    const { result, unmount } = renderHook(() => useGameDetail<{ state: string }>('401873026'));
    await tick(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await tick(LIVE_POLL_MS * 2);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // antes do jogo, nada a cada 30 s
    state = 'in';
    await act(async () => void window.dispatchEvent(new Event('pointerdown')));
    await tick(5 * 60_000);
    expect(result.current.data?.state).toBe('in');
    const at = fetchSpy.mock.calls.length;
    await tick(LIVE_POLL_MS);
    expect(fetchSpy.mock.calls.length).toBe(at + 1); // já ao vivo: 30 s
    unmount();
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ state: 'in' }), { headers: { 'content-type': 'application/json' } }));
  });
});

describe('placar compartilhado', () => {
  const board = (score: number) => ({ week: 8, season: 2026, games: [{ id: '1', state: 'in', detail: 'Q2', teams: [{ side: 'home', abbr: 'BUF', score }, { side: 'away', abbr: 'BAL', score: 3 }] }] });

  it('só avisa quem ouve quando o placar muda de fato', async () => {
    let score = 7;
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify(board(score)), { headers: { 'content-type': 'application/json' } }));
    let renders = 0;
    const { unmount } = renderHook(() => {
      renders++;
      return useLiveScores();
    });
    await tick(0);
    const afterFirst = renders;
    await tick(LIVE_POLL_MS * 3); // 3 consultas com o mesmo placar
    expect(renders).toBe(afterFirst);
    score = 14;
    await tick(LIVE_POLL_MS);
    expect(renders).toBeGreaterThan(afterFirst);
    unmount();
  });

  it('com o aviso ligado, segue consultando com a aba oculta durante o jogo do time favorito', async () => {
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify(board(7)), { headers: { 'content-type': 'application/json' } }));
    watchTeamInBackground('BUF');
    const { unmount } = renderHook(() => useLiveScores());
    await tick(0);
    visibility = 'hidden';
    const at = fetchSpy.mock.calls.length;
    await tick(LIVE_POLL_MS * 2);
    expect(fetchSpy.mock.calls.length).toBe(at + 2);
    // Sem aviso ligado, a aba oculta para tudo: a rodada seguinte já não consulta.
    watchTeamInBackground(null);
    await tick(LIVE_POLL_MS * 4);
    expect(fetchSpy.mock.calls.length).toBe(at + 2);
    unmount();
  });
});

describe('placares finais ao vivo', () => {
  it('aplica o final só a jogos sem resultado e devolve o mesmo array quando nada muda', () => {
    const games = [
      { away: 'BAL', home: 'BUF', homeScore: null, awayScore: null },
      { away: 'KC', home: 'LV', homeScore: 20, awayScore: 17 },
    ];
    const live = new Map([['BAL@BUF', { state: 'post' as const, detail: 'Final', home: 24, away: 21 }]]);
    const out = withLiveFinals(games, live);
    expect(out[0]).toMatchObject({ homeScore: 24, awayScore: 21 });
    expect(out[1]).toBe(games[1]);
    expect(withLiveFinals(games, new Map([['BAL@BUF', { state: 'in' as const, detail: 'Q3', home: 10, away: 7 }]]))).toBe(games);
  });
});
