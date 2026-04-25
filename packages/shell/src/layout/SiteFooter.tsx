import { Container, Text } from '@portfolio/ui';

// Minimal footer — single signature row + copyright. The colophon page carries
// the actual architecture story; this footer is just an end-of-page anchor.
export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 mb-10 pointer-events-none">
      <Container className="flex flex-wrap justify-between items-baseline gap-4 pointer-events-auto">
        <Text variant="micro">SIG · PORTFOLIO · {new Date().getFullYear()}</Text>
        <Text variant="micro">
          <span className="text-fg-muted">BUILT WITH</span>{' '}
          <span className="text-fg-secondary">REACT · R3F · ANGULAR · TAILWIND</span>
        </Text>
      </Container>
    </footer>
  );
}
