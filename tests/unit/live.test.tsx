/**
 * Consumo de requisições do Game Center ao vivo: 30 s com jogo em andamento, nada com a aba oculta,
 * pausa depois de 30 min sem interação e retomada com qualquer interação.
 */
import { act, renderHook } from '@testing-library/react';
import { IDLE_PAUSE_MS, LIVE_POLL_MS, resumeLive, useGameDetail, useLivePaused } from '../../src/data/live';

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
