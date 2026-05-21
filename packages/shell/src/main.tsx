import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { installDevConsole } from './dev/dev-console';
import './i18n';
import './styles.css';

// Defines window.portfolio (dev only; tree-shaken in prod builds).
// Methods that need React state become functional once <DevConsoleBridge />
// mounts and calls registerDevAPI(); methods that only touch the DOM
// (ui.* / bg.*) work immediately.
installDevConsole();

// GH Pages SPA fallback replay. `public/404.html` stashes the original deep
// link in sessionStorage and bounces to `/`. We rewrite history here, BEFORE
// BrowserRouter mounts, so the router reads the deep link on its first render
// and `RootRedirect` never runs. Doing this in a post-mount useEffect was the
// previous approach — it didn't work because `history.replaceState` is silent
// to react-router's history listener, so the URL updated but the route didn't.
(function replayGitHubPagesRedirect() {
  try {
    const stashed = sessionStorage.getItem('portfolio:redirect');
    if (!stashed) return;
    sessionStorage.removeItem('portfolio:redirect');
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (stashed !== current) {
      window.history.replaceState(null, '', stashed);
    }
  } catch {
    /* sessionStorage unavailable; nothing to do */
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
