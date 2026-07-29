import {
  containerStyle,
  innerContainerStyle,
} from '@rstack-dev/doc-ui/section-style';
import { WhyRspack as BaseWhyRspack } from '@rstack-dev/doc-ui/why-rspack';
import { memo, useMemo } from 'react';
import { useI18n, useI18nUrl } from '../../../i18n';
import { SafeLink } from '../../SafeLink';
import CompatibleJson from './assets/Compatible.json';
import Compatible from './assets/Compatible.svg';
import FrameCheckJson from './assets/FrameCheck.json';
import FrameCheck from './assets/FrameCheck.svg';
import LightningJson from './assets/Lightning.json';
import Lightning from './assets/Lightning.svg';
import SpeedometerJson from './assets/Speedometer.json';
import Speedometer from './assets/Speedometer.svg';

type Feature = {
  img: string;
  url: string;
  title: string;
  description: string;
  lottieJsonData: unknown;
};

const WhyRspack = memo(() => {
  const t = useI18n();
  const tUrl = useI18nUrl();

  const features: Feature[] = useMemo(
    () => [
      {
        img: Speedometer,
        url: '',
        title: t('FastStartup'),
        description: t('FastStartupDesc'),
        lottieJsonData: SpeedometerJson,
      },
      {
        img: Lightning,
        url: '',
        title: t('LightningHMR'),
        description: t('LightningHMRDesc'),
        lottieJsonData: LightningJson,
      },
      {
        img: FrameCheck,
        url: '',
        title: t('FrameworkAgnostic'),
        description: t('FrameworkAgnosticDesc'),
        lottieJsonData: FrameCheckJson,
      },
      {
        img: Compatible,
        url: tUrl('/guide/compatibility'),
        title: t('WebpackCompatible'),
        description: t('WebpackCompatibleDesc'),
        lottieJsonData: CompatibleJson,
      },
    ],
    [t, tUrl],
  );

  return (
    <section className={containerStyle}>
      <div className={innerContainerStyle}>
        <BaseWhyRspack features={features} LinkComp={SafeLink} />
      </div>
    </section>
  );
});

export default WhyRspack;
