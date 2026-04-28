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
