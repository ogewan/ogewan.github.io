import { useEffect } from 'react';
import { Route, Routes } from 'react-router';
import {
  ActiveSceneProvider,
  CelestialBackdrop,
  CelestialFocusProvider,
  CelestialQualityProvider,
  EarthPlaceholderModeProvider,
  EarthTestModeProvider,
} from '@portfolio/celestial';
import { SiteLayout } from './layout/SiteLayout';
import { MainPage } from './pages/MainPage';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectRedirect } from './pages/ProjectRedirect';
import { NotFound } from './pages/NotFound';
import { TokensShowcase } from './pages/dev/TokensShowcase';
import { CelestialDebug } from './pages/dev/CelestialDebug';
import { LocaleSync } from './components/LocaleSync';
import { RootRedirect } from './components/RootRedirect';
import { DevConsoleBridge } from './dev/DevConsoleBridge';

// The /_dev branch is only mounted in non-production builds. Tree-shaken
// completely out of the prod bundle by Vite via the import.meta.env.PROD
// constant replacement.
const DEV_ROUTES = import.meta.env.PROD ? null : (
  <Route path="_dev">
    <Route path="tokens" element={<TokensShowcase />} />
    <Route path="celestial" element={<CelestialDebug />} />
  </Route>
);

// Same gate: bridge that registers React-context setters into window.portfolio.
const DEV_BRIDGE = import.meta.env.PROD ? null : <DevConsoleBridge />;

// GH Pages serves the same site for any unknown URL via 404.html. The 404 page
// stashes the original pathname in sessionStorage and bounces to /; on mount
// we replay that pathname into history so the SPA router picks up the deep
// link without flashing the home page first.
function useGitHubPagesRedirectReplay() {
  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    const stashed = sessionStorage.getItem('portfolio:redirect');
    if (!stashed) return;
    sessionStorage.removeItem('portfolio:redirect');
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (stashed !== current) {
      window.history.replaceState(null, '', stashed);
    }
  }, []);
}

export function App() {
  useGitHubPagesRedirectReplay();
  return (
    <CelestialQualityProvider>
      <CelestialFocusProvider>
        <EarthTestModeProvider>
          <EarthPlaceholderModeProvider>
            <ActiveSceneProvider>
              <div data-bg-root>
                <CelestialBackdrop />
              </div>
              <div data-ui-root className="relative z-10">
                <SiteLayout>
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/:locale" element={<LocaleSync />}>
                      {/* MainPage is a layout route — its element stays mounted
                        across in-app navigation between section paths. The
                        child routes only exist to match URLs (their elements
                        render nothing); MainPage owns the section stack and
                        scroll-to-section sync. */}
                      <Route element={<MainPage />}>
                        <Route index element={null} />
                        <Route path="about" element={null} />
                        <Route path="projects" element={null} />
                        <Route path="contact" element={null} />
                        <Route path="colophon" element={null} />
                      </Route>
                      <Route path="projects/:slug" element={<ProjectDetail />} />
                      <Route path="projects/:slug/redirect" element={<ProjectRedirect />} />
                      {DEV_ROUTES}
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SiteLayout>
              </div>
              {DEV_BRIDGE}
            </ActiveSceneProvider>
          </EarthPlaceholderModeProvider>
        </EarthTestModeProvider>
      </CelestialFocusProvider>
    </CelestialQualityProvider>
  );
}
