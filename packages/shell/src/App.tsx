import { useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { CelestialBackdrop, CelestialFocusProvider } from '@portfolio/celestial';
import { SiteLayout } from './layout/SiteLayout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectRedirect } from './pages/ProjectRedirect';
import { Contact } from './pages/Contact';
import { Colophon } from './pages/Colophon';
import { NotFound } from './pages/NotFound';
import { TokensShowcase } from './pages/dev/TokensShowcase';
import { CelestialDebug } from './pages/dev/CelestialDebug';
import { LocaleSync } from './components/LocaleSync';
import { RootRedirect } from './components/RootRedirect';

// The /_dev branch is only mounted in non-production builds. Tree-shaken
// completely out of the prod bundle by Vite via the import.meta.env.PROD
// constant replacement.
const DEV_ROUTES = import.meta.env.PROD ? null : (
  <Route path="_dev">
    <Route path="tokens" element={<TokensShowcase />} />
    <Route path="celestial" element={<CelestialDebug />} />
  </Route>
);

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
    <CelestialFocusProvider>
      <CelestialBackdrop />
      <div className="relative z-10">
        <SiteLayout>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/:locale" element={<LocaleSync />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:slug" element={<ProjectDetail />} />
              <Route path="projects/:slug/redirect" element={<ProjectRedirect />} />
              <Route path="contact" element={<Contact />} />
              <Route path="colophon" element={<Colophon />} />
              {DEV_ROUTES}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SiteLayout>
      </div>
    </CelestialFocusProvider>
  );
}
