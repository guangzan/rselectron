import { Link } from '@rspress/core/theme-original';
import { memo } from 'react';
import { useI18n, useI18nUrl } from '../../i18n';
import styles from './index.module.scss';

const GITHUB_URL = 'https://github.com/guangzan/rselectron';

function useFooterData() {
  const t = useI18n();
  const tUrl = useI18nUrl();

  return [
    {
      title: t('guide'),
      items: [
        {
          title: t('quickStart'),
          link: tUrl('/guide/getting-started'),
        },
        {
          title: t('migration'),
          link: tUrl('/guide/migration'),
        },
        {
          title: t('compatibility'),
          link: tUrl('/guide/compatibility'),
        },
        {
          title: t('troubleshooting'),
          link: tUrl('/guide/troubleshooting'),
        },
      ],
    },
    {
      title: 'API',
      items: [
        {
          title: t('cli'),
          link: tUrl('/api/cli'),
        },
        {
          title: t('configuration'),
          link: tUrl('/config/'),
        },
        {
          title: t('apiReference'),
          link: tUrl('/api/javascript-api'),
        },
      ],
    },
    {
      title: t('toolchain'),
      items: [
        {
          title: 'Rspack',
          link: 'https://rspack.rs/',
        },
        {
          title: 'Rsbuild',
          link: 'https://rsbuild.rs/',
        },
        {
          title: 'Rslib',
          link: 'https://rslib.rs/',
        },
        {
          title: 'Rspress',
          link: 'https://rspress.rs/',
        },
        {
          title: 'Rsdoctor',
          link: 'https://rsdoctor.rs/',
        },
        {
          title: 'Rstest',
          link: 'https://rstest.rs/',
        },
      ],
    },
    {
      title: t('community'),
      items: [
        {
          title: 'GitHub',
          link: GITHUB_URL,
        },
      ],
    },
  ];
}

export const HomeFooter = memo(() => {
  const footerData = useFooterData();
  return (
    <div
      className="flex flex-col border-t items-center mt-24 hidden sm:flex"
      style={{ borderColor: 'var(--rp-c-divider-light)' }}
    >
      <div className="pt-12 pb-4 w-full justify-around max-w-6xl flex">
        {footerData.map((item) => (
          <div key={item.title} className="flex flex-col items-start">
            <h2 className="font-bold my-4 text-lg">{item.title}</h2>
            <ul className="flex flex-col gap-3">
              {item.items.map((subItem) => (
                <li key={subItem.title}>
                  <Link href={subItem.link}>
                    <span className={`font-normal ${styles.text}`}>
                      {subItem.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
});
