import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUpdates } from '../data/useUpdates';
import { CloseIcon, RefreshIcon } from './Icons';

/** Aviso discreto quando há dados novos nas fontes, com atualização em um clique (carga parcial). */
export function UpdateBanner() {
  const { result, sync, job, syncError } = useUpdates(true);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const running = job?.status === 'running';
  if (job?.status === 'done')
    return (
      <div className="update-banner" role="status">
        <div className="container">
          <strong>Dados atualizados.</strong>
          <span className="text-2">{job.downloaded.length} arquivo(s) novo(s) processado(s).</span>
          <button type="button" className="btn sm primary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
          <span className="spacer" />
          <button type="button" className="icon-btn" aria-label="Fechar aviso" onClick={() => setDismissed(true)}>
            <CloseIcon />
          </button>
        </div>
      </div>
    );
  if (!result?.hasUpdates) return null;
  const items = result.items.filter((i) => i.hasUpdate);
  const seasons = [...new Set(items.flatMap((i) => i.seasons ?? []))];
  return (
    <div className="update-banner" role="status">
      <div className="container">
        <RefreshIcon />
        <span>
          <strong>Novos dados disponíveis:</strong> {items.map((i) => i.label).join(', ')}
          {seasons.length ? ` (temporada${seasons.length > 1 ? 's' : ''} ${seasons.join(', ')})` : ''}.
        </span>
        <button
          type="button"
          className="btn sm primary"
          disabled={running}
          onClick={() => sync({ mode: 'partial', datasets: items.map((i) => i.key), seasons: seasons.length ? seasons : undefined })}
        >
          {running ? 'Atualizando…' : 'Atualizar agora'}
        </button>
        <Link to="/data" className="small">
          Detalhes
        </Link>
        {syncError && <span className="small bad">{syncError}</span>}
        <span className="spacer" />
        <button type="button" className="icon-btn" aria-label="Fechar aviso" onClick={() => setDismissed(true)}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
