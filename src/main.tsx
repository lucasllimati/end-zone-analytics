import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { TeamsProvider } from './data/TeamsContext';
import { installErrorReporting } from './data/errorReport';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

// Após uma nova publicação, os arquivos JS antigos deixam de existir: quem estava com o site aberto
// recebe o index.html no lugar de uma página carregada sob demanda. Recarrega uma vez para pegar a versão nova
// (a marca na sessão evita laço de recarga se o erro for outro).
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('eza-chunk-reload') ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('eza-chunk-reload', String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

installErrorReporting();

// App instalável e leitura offline (public/sw.js). Só no build de produção: em desenvolvimento,
// o cache atrapalharia o recarregamento automático.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <TeamsProvider>
          <App />
        </TeamsProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
