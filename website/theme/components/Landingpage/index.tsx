import { BackgroundImage } from '@rstack-dev/doc-ui/background-image';
import { Benchmark } from './Benchmark';
import FullyFeatured from './FullyFeatured';
import Hero from './Hero';
import styles from './index.module.scss';
import WhyRspack from './WhyRspack';

const LandingPage = () => {
  return (
    <div className={styles.landingPage}>
      <BackgroundImage />
      <Hero />
      <WhyRspack />
      <Benchmark />
      <FullyFeatured />
    </div>
  );
};

export default LandingPage;
