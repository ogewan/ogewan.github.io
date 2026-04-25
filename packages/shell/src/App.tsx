import { Navigate, Route, Routes } from 'react-router';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Projects } from './pages/Projects';
import { Contact } from './pages/Contact';
import { Colophon } from './pages/Colophon';
import { NotFound } from './pages/NotFound';

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
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
