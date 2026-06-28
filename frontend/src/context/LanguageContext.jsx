import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/client';
import { STRINGS_EN, I18N_CACHE_VERSION } from '../i18n/strings.en';
import { BUNDLED } from '../i18n/languages';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'app_lang';

function readStoredLang() {
  return localStorage.getItem(STORAGE_KEY) || localStorage.getItem('worker_lang') || 'hi';
}

function cacheKey(lang) {
  return `i18n_cache_${I18N_CACHE_VERSION}_${lang}`;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);
  const [strings, setStrings] = useState(() => ({
    ...STRINGS_EN,
    ...(BUNDLED[readStoredLang()] || {}),
  }));
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('bundled');

  useEffect(() => {
    if (lang === 'en') {
      setStrings(STRINGS_EN);
      setSource('english');
      return;
    }

    const cached = localStorage.getItem(cacheKey(lang));
    if (cached) {
      try {
        setStrings(JSON.parse(cached));
        setSource('cache');
        return;
      } catch {
        localStorage.removeItem(cacheKey(lang));
      }
    }

    setStrings({ ...STRINGS_EN, ...(BUNDLED[lang] || {}) });
    setSource(BUNDLED[lang] ? 'bundled' : 'english');

    let cancelled = false;
    setLoading(true);

    api.post('/i18n/translate', { lang, strings: STRINGS_EN })
      .then(({ data }) => {
        if (cancelled) return;
        const merged = { ...STRINGS_EN, ...data.translations };
        setStrings(merged);
        setSource(data.source || 'sarvam');
        localStorage.setItem(cacheKey(lang), JSON.stringify(merged));
      })
      .catch(() => {
        if (!cancelled) setSource('fallback');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lang]);

  const setLang = useCallback((code) => {
    localStorage.setItem(STORAGE_KEY, code);
    localStorage.setItem('worker_lang', code);
    setLangState(code);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let text = strings[key] || STRINGS_EN[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, v);
        });
      }
      return text;
    },
    [strings],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, strings, loading, source }),
    [lang, setLang, t, strings, loading, source],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}

/** Backward-compatible helpers for modules that used worker/i18n.js */
export function getLang() {
  return readStoredLang();
}

export function setLang(code) {
  localStorage.setItem(STORAGE_KEY, code);
  localStorage.setItem('worker_lang', code);
}
