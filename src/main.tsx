import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { TeamsProvider } from './data/TeamsContext';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

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
