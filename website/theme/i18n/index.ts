import { useLang } from '@rspress/core/runtime';
import { useCallback } from 'react';
import { EN_US } from './enUS';
import { ZH_CN } from './zhCN';

const translations = {
  en: EN_US,
  zh: ZH_CN,
} as const;

/** Prefix internal paths with the active locale (rspack website `useI18nUrl`). */
export function useI18nUrl() {
  const lang = useLang();

  return useCallback(
    (url: string) => {
      if (
        !url.startsWith('/') ||
        url.startsWith('//') ||
        url.startsWith(`/${lang}/`) ||
        lang === 'en'
      ) {
        return url;
      }
      return `/${lang}${url}`;
    },
    [lang],
  );
}

export function useI18n() {
  const lang = useLang() as keyof typeof translations;
  return (key: keyof typeof EN_US) => translations[lang][key];
}
