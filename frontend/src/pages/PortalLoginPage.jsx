import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { PORTALS, roleRedirects } from '../utils/auth';
import LanguagePicker from '../components/LanguagePicker';
import { Users, HardHat, Building2, MapPin } from 'lucide-react';

const portalIcons = {
  citizen: Users,
  worker: HardHat,
  authority: Building2,
};

const portalStyles = {
  citizen: {
    ring: 'ring-emerald-500',
    bg: 'bg-emerald-600',
    light: 'bg-emerald-50 border-emerald-300',
    text: 'text-emerald-700',
  },
  worker: {
    ring: 'ring-orange-500',
    bg: 'bg-orange-600',
    light: 'bg-orange-50 border-orange-300',
    text: 'text-orange-700',
  },
  authority: {
    ring: 'ring-slate-600',
    bg: 'bg-slate-800',
    light: 'bg-slate-100 border-slate-400',
    text: 'text-slate-800',
  },
};

const PORTAL_TITLE_KEYS = {
  citizen: 'citizenPortal',
  worker: 'workerPortal',
  authority: 'authorityPortal',
};

const PORTAL_SUBTITLE_KEYS = {
  citizen: 'citizenSubtitle',
  worker: 'workerSubtitle',
  authority: 'authoritySubtitle',
};

export default function PortalLoginPage() {
  const { login, logout, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPortal, setLoadingPortal] = useState(null);
  const [error, setError] = useState('');

  const handleSelectPortal = async (p) => {
    setLoadingPortal(p.id);
    setError('');
    try {
      if (logout) logout();
      const loggedIn = await login(p.demo.email, 'password123');
      navigate(roleRedirects[loggedIn.role] || '/home');
    } catch (err) {
      setError(err.response?.data?.error || t('loginFailed'));
      setLoadingPortal(null);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">NagarSeva</h1>
          <p className="text-slate-600 text-lg mt-3 font-medium">{t('choosePortal')}</p>
          <div className="mt-5 flex justify-center">
            <LanguagePicker />
          </div>
        </div>

        {user && (
          <div className="max-w-xl mx-auto mb-8 bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-900 shadow-sm">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold">Currently logged in as {user.name || user.email}</p>
              <p className="text-xs text-emerald-700">Role: <span className="capitalize font-medium">{user.role}</span></p>
            </div>
            <button
              onClick={() => navigate(roleRedirects[user.role] || '/home')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition whitespace-nowrap"
            >
              Continue to Dashboard →
            </button>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {Object.values(PORTALS).map((p) => {
            const Icon = portalIcons[p.id];
            const s = portalStyles[p.id];
            const isLoading = loadingPortal === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={Boolean(loadingPortal)}
                onClick={() => handleSelectPortal(p)}
                className={`text-left p-7 rounded-3xl border-2 transition-all bg-white hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between cursor-pointer ${
                  isLoading ? `${s.light} ring-4 ${s.ring} shadow-xl scale-[1.02] animate-pulse` : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div>
                  <div className={`w-14 h-14 rounded-2xl ${s.bg} text-white flex items-center justify-center mb-5 shadow-md`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-2xl text-slate-800">{t(PORTAL_TITLE_KEYS[p.id])}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{t(PORTAL_SUBTITLE_KEYS[p.id])}</p>
                </div>
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-base font-bold ${s.text} flex items-center gap-1`}>
                    {isLoading ? 'Entering...' : 'Enter Portal →'}
                  </span>
                  {p.id === 'authority' && (
                    <span className="text-[11px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">{t('desktopView')}</span>
                  )}
                  {(p.id === 'citizen' || p.id === 'worker') && (
                    <span className="text-[11px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">{t('mobileView')}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-4">
          <Link
            to="/report/anonymous"
            className="inline-flex items-center gap-2 text-purple-700 text-sm font-semibold hover:underline bg-white px-5 py-2.5 rounded-full shadow border border-purple-200 transition hover:bg-purple-50"
          >
            <MapPin className="w-4 h-4" /> {t('reportAnonymously')}
          </Link>
        </div>
      </div>
    </div>
  );
}
