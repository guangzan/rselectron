import { FullyFeatured as BaseFullyFeatured } from '@rstack-dev/doc-ui/fully-featured';
import {
  containerStyle,
  descStyle,
  innerContainerStyle,
  titleAndDescStyle,
  titleStyle,
} from '@rstack-dev/doc-ui/section-style';
import { memo } from 'react';
import { useI18n } from '../../../i18n';
import { SafeLink } from '../../SafeLink';
import arrow from './assets/arrow.svg';
import javascriptApi from './assets/javascriptApi.svg';
import layer from './assets/layer.svg';
import lightningcss from './assets/lightningcss.svg';
import loader from './assets/loader.svg';
import workflow from './assets/workflow.svg';
import parallel from './assets/parallel.svg';
import reload from './assets/reload.svg';
import server from './assets/server.svg';
import setting from './assets/setting.svg';
import swc from './assets/swc.svg';
import tree from './assets/tree.svg';

type Feature = {
  icon: string;
  title: string;
  description: string;
  link: string;
};

const FullyFeatured = memo(() => {
  const t = useI18n();

  // No local docs for these rspack feature pages — keep cards non-navigating.
  const FeatureRow1: Feature[] = [
    {
      icon: arrow,
      title: 'Code Splitting',
      description: t('featureCodeSplitting'),
      link: '',
    },
    {
      icon: tree,
      title: 'Tree Shaking',
      description: t('featureTreeShaking'),
      link: '',
    },
    {
      icon: layer,
      title: 'Plugins',
      description: t('featurePlugins'),
      link: '',
    },
    {
      icon: workflow,
      title: 'Multipage',
      description: t('featureMultipage'),
      link: '',
    },
  ];

  const FeatureRow2: Feature[] = [
    {
      icon: setting,
      title: 'Asset Management',
      description: t('featureAssetManagement'),
      link: '',
    },
    {
      icon: loader,
      title: 'Loaders',
      description: t('featureLoaders'),
      link: '',
    },
    {
      icon: reload,
      title: 'HMR',
      description: t('featureHmr'),
      link: '',
    },
    {
      icon: server,
      title: 'Dev Server',
      description: t('featureDevServer'),
      link: '',
    },
  ];

  const FeatureRow3: Feature[] = [
    {
      icon: parallel,
      title: 'Parallel Builds',
      description: t('featureParallelBuilds'),
      link: '',
    },
    {
      icon: swc,
      title: 'SWC',
      description: t('featureSwc'),
      link: '',
    },
    {
      icon: lightningcss,
      title: 'Lightning CSS',
      description: t('featureLightningCss'),
      link: '',
    },
    {
      icon: javascriptApi,
      title: 'JavaScript API',
      description: t('featureJavaScriptApi'),
      link: '',
    },
  ];

  return (
    <section className={containerStyle}>
      <div className={innerContainerStyle}>
        <div className={titleAndDescStyle}>
          <h1 className={titleStyle}>{t('fullyFeaturedTitle')}</h1>
          <p className={descStyle}>{t('fullyFeaturedDesc')}</p>
        </div>
        <BaseFullyFeatured
          featureRows={[FeatureRow1, FeatureRow2, FeatureRow3]}
          LinkComp={SafeLink}
        />
      </div>
    </section>
  );
});

export default FullyFeatured;
