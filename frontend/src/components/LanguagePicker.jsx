import { LANGS } from '../i18n/languages';
import { useTranslation } from '../context/LanguageContext';

export default function LanguagePicker({ compact = false, className = '' }) {
  const { lang, setLang, loading } = useTranslation();

  if (compact) {
    return (
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        disabled={loading}
        className={`text-xs bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-inherit ${className}`}
        aria-label="Language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="text-slate-800">
            {l.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          disabled={loading}
          className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
            lang === l.code
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
