import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Container, Heading, Text } from '@portfolio/ui';

export function NotFound() {
  const { t, i18n } = useTranslation(['notFound']);
  const locale = i18n.language === 'es' ? 'es' : 'en';
  return (
    <Container width="reading" className="pt-16 pb-24">
      <Heading level={1} variant="h1" tabIndex={-1}>
        {t('title')}
      </Heading>
      <Text variant="lead" className="mt-6">
        {t('lead')}
      </Text>
      <Link to={`/${locale}/`} className="mt-8 inline-block text-cyan font-mono text-small">
        ← {t('back')}
      </Link>
    </Container>
  );
}
