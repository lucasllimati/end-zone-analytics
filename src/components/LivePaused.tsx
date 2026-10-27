/**
 * Aviso de placar ao vivo pausado: depois de 30 min sem interação, as atualizações param para não gastar
 * requisições à toa (aba esquecida aberta). Qualquer toque retoma; o botão deixa isso explícito.
 */
import { resumeLive, useLivePaused } from '../data/live';

export function LivePaused() {
  const paused = useLivePaused();
  if (!paused) return null;
  return (
    <div className="update-banner" role="status">
      <div className="container">
        <span className="text-2">Placar ao vivo pausado depois de 30 minutos sem interação.</span>
        <button type="button" className="btn sm primary" onClick={resumeLive}>
          Continuar atualizando
        </button>
      </div>
    </div>
  );
}
