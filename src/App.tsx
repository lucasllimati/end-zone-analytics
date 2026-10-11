import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loading } from './components/States';

// Divisão de código por página: cada rota é carregada sob demanda.
const Home = lazy(() => import('./pages/Home'));
const Season = lazy(() => import('./pages/Season'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const Players = lazy(() => import('./pages/Players'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const Compare = lazy(() => import('./pages/Compare'));
const Matchup = lazy(() => import('./pages/Matchup'));
const GamePage = lazy(() => import('./pages/GamePage'));
const SuperBowlPage = lazy(() => import('./pages/SuperBowl'));
const SuperBowlDetail = lazy(() => import('./pages/SuperBowlDetail'));
const Records = lazy(() => import('./pages/Records'));
const Rankings = lazy(() => import('./pages/Rankings'));
const Draft = lazy(() => import('./pages/Draft'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const History = lazy(() => import('./pages/History'));
const Stadiums = lazy(() => import('./pages/Stadiums'));
const Learn = lazy(() => import('./pages/Learn'));
const Rules = lazy(() => import('./pages/Rules'));
const Positions = lazy(() => import('./pages/Positions'));
const Playbook = lazy(() => import('./pages/Playbook'));
const Strategy = lazy(() => import('./pages/Strategy'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Explorer = lazy(() => import('./pages/Explorer'));
const DataCenter = lazy(() => import('./pages/DataCenter'));
const NotFound = lazy(() => import('./pages/NotFound'));
/** A área administrativa não entra no build estático público (VITE_PUBLIC_STATIC=1): o Vite remove o chunk. */
const ADMIN_ENABLED = import.meta.env.VITE_PUBLIC_STATIC !== '1';
const Admin = ADMIN_ENABLED ? lazy(() => import('./pages/Admin')) : null;

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <div className="empty" role="alert">
          <strong style={{ color: 'var(--text)' }}>Algo deu errado nesta página.</strong>
          <p>{this.state.error.message}</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      );
    return this.props.children;
  }
}

const page = (el: ReactNode) => (
  <ErrorBoundary>
    <Suspense fallback={<Loading height={320} />}>{el}</Suspense>
  </ErrorBoundary>
);

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={page(<Home />)} />
        <Route path="season" element={page(<Season />)} />
        <Route path="teams" element={page(<Teams />)} />
        <Route path="teams/:abbr" element={page(<TeamPage />)} />
        <Route path="players" element={page(<Players />)} />
        <Route path="players/:id" element={page(<PlayerPage />)} />
        <Route path="compare" element={page(<Compare />)} />
        <Route path="matchup" element={page(<Matchup />)} />
        <Route path="rivalries" element={page(<Matchup />)} />
        <Route path="games/:id" element={page(<GamePage />)} />
        <Route path="super-bowl" element={page(<SuperBowlPage />)} />
        <Route path="super-bowl/:n" element={page(<SuperBowlDetail />)} />
        <Route path="records" element={page(<Records />)} />
        <Route path="rankings" element={page(<Rankings />)} />
        <Route path="draft" element={page(<Draft />)} />
        <Route path="hall-of-fame" element={page(<HallOfFame />)} />
        <Route path="history" element={page(<History />)} />
        <Route path="stadiums" element={page(<Stadiums />)} />
        <Route path="learn" element={page(<Learn />)} />
        <Route path="rules" element={page(<Rules />)} />
        <Route path="positions" element={page(<Positions />)} />
        <Route path="playbook" element={page(<Playbook />)} />
        <Route path="strategy" element={page(<Strategy />)} />
        <Route path="glossary" element={page(<Glossary />)} />
        <Route path="explorer" element={page(<Explorer />)} />
        <Route path="data" element={page(<DataCenter />)} />
        {Admin && <Route path="admin" element={page(<Admin />)} />}
        <Route path="*" element={page(<NotFound />)} />
      </Route>
    </Routes>
  );
}
