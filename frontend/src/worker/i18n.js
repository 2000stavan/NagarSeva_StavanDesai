/** @deprecated Import from context/LanguageContext or i18n/languages instead */
export { LANGS, BUNDLED, speechLocale } from '../i18n/languages';
export { getLang, setLang, useTranslation } from '../context/LanguageContext';

import { STRINGS_EN } from '../i18n/strings.en';
import { BUNDLED } from '../i18n/languages';

const strings = { en: STRINGS_EN, ...BUNDLED };

export function t(lang, key) {
  return (strings[lang] || strings.en)[key] || strings.en[key] || key;
}
