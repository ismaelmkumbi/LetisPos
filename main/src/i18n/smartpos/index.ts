/**
 * SmartPOS i18n setup.
 *
 * Extends the Modernize template's i18n instance with the `smartpos`
 * namespace and adds Swahili (`sw`) as a first-class locale.
 *
 * Use anywhere:
 *   import { useTranslation } from 'react-i18next';
 *   const { t } = useTranslation('smartpos');
 *   <h1>{t('dashboard.greeting')}</h1>
 */
import i18n from 'src/utils/i18n';
import en from './en.json';
import sw from './sw.json';

const STORAGE_KEY = 'smartpos.locale';

export const SMARTPOS_LOCALES = [
  { code: 'en', label: 'English',  flag: '🇺🇸' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
] as const;

export type SmartPosLocale = typeof SMARTPOS_LOCALES[number]['code'];

// Register the namespace so `useTranslation('smartpos')` resolves.
i18n.addResourceBundle('en', 'smartpos', en, true, true);
i18n.addResourceBundle('sw', 'smartpos', sw, true, true);

// Bootstrap locale from localStorage if present.
if (typeof window !== 'undefined') {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'sw') {
    i18n.changeLanguage(saved);
  }
}

export function setSmartPosLocale(code: SmartPosLocale) {
  i18n.changeLanguage(code);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, code);
  }
}

export function getSmartPosLocale(): SmartPosLocale {
  const lng = (i18n.language || 'en').split('-')[0];
  return (SMARTPOS_LOCALES.some((l) => l.code === lng) ? lng : 'en') as SmartPosLocale;
}

export default i18n;
