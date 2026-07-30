import { useNavigate } from '@rspress/core/runtime';
import { Hero as BaseHero } from '@rstack-dev/doc-ui/hero';
import { memo, useCallback } from 'react';
import { useI18n, useI18nUrl } from '../../../i18n';

const GITHUB_URL = 'https://github.com/guangzan/rselectron';
// Avoid withBase('/rselectron-logo.png'): Rspress treats paths that
// start with the normalized base (`/rselectron`) as already rooted.
const LOGO_URL = '/rselectron/rselectron-logo.png';

const Hero = memo(() => {
  const tUrl = useI18nUrl();
  const t = useI18n();
  const navigate = useNavigate();

  const onClickGetStarted = useCallback(() => {
    navigate(tUrl('/guide/getting-started'));
  }, [tUrl, navigate]);

  return (
    <BaseHero
      showStars
      logoUrl={LOGO_URL}
      title="Rselectron"
      subTitle={t('heroSlogan')}
      description={t('heroSubSlogan')}
      getStartedButtonText={t('getStarted')}
      githubURL={GITHUB_URL}
      onClickGetStarted={onClickGetStarted}
    />
  );
});

export default Hero;
