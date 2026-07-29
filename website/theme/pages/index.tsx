import { HomeFooter } from '../components/HomeFooter';
import LandingPage from '../components/Landingpage';
import { useI18n } from '../i18n';

const CopyRight = () => {
  const t = useI18n();
  return (
    <footer
      className="bottom-0 mt-12 py-8 px-6 sm:p-8 w-full border-t border-solid"
      style={{ borderColor: 'var(--rp-c-divider-light)' }}
    >
      <div className="m-auto w-full text-center">
        <div className="font-medium text-sm text-text-2">
          <p className="mb-2">{t('copyrightLicense')}</p>
          <p>{t('copyrightOwner')}</p>
        </div>
      </div>
    </footer>
  );
};

export function HomeLayout() {
  return (
    <>
      <LandingPage />
      <HomeFooter />
      <CopyRight />
    </>
  );
}
