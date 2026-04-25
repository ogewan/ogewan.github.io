import { Navigate, Route, Routes } from 'react-router';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Projects } from './pages/Projects';
import { Contact } from './pages/Contact';
import { Colophon } from './pages/Colophon';
import { NotFound } from './pages/NotFound';
import { TokensShowcase } from './pages/dev/TokensShowcase';

// The /_dev branch is only mounted in non-production builds. Tree-shaken
// completely out of the prod bundle by Vite via the import.meta.env.PROD
// constant replacement.
const DEV_ROUTES = import.meta.env.PROD ? null : (
  <Route path="_dev">
    <Route path="tokens" element={<TokensShowcase />} />
  </Route>
);

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/en/" replace />} />
      <Route path="/:locale">
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="projects" element={<Projects />} />
        <Route path="contact" element={<Contact />} />
        <Route path="colophon" element={<Colophon />} />
        {DEV_ROUTES}
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
