import { useTranslation } from 'react-i18next';
import { Container, Text } from '@portfolio/ui';

// Minimal footer — single signature row + copyright. The colophon page carries
// the actual architecture story; this footer is just an end-of-page anchor.
export function SiteFooter() {
  const { t } = useTranslation(['common']);
  return (
    <footer className="relative z-10 mt-24 mb-10 pointer-events-none">
      <Container className="flex flex-wrap justify-between items-baseline gap-4 pointer-events-auto">
        <Text variant="micro">
          {t('footer.signature')} · {new Date().getFullYear()}
        </Text>
        <Text variant="micro">
          <span className="text-fg-muted">{t('footer.builtWith')}</span>{' '}
          <span className="text-fg-secondary">{t('footer.stack')}</span>
        </Text>
      </Container>
    </footer>
  );
}
