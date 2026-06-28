import { useState, useEffect } from 'react';
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
    light: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    btn: 'bg-emerald-600 hover:bg-emerald-500',
  },
  worker: {
    ring: 'ring-orange-500',
    bg: 'bg-orange-600',
    light: 'bg-orange-50 border-orange-200',
    text: 'text-orange-700',
    btn: 'bg-orange-600 hover:bg-orange-500',
  },
  authority: {
    ring: 'ring-slate-600',
    bg: 'bg-slate-800',
    light: 'bg-slate-100 border-slate-300',
    text: 'text-slate-800',
    btn: 'bg-slate-800 hover:bg-slate-700',
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
  const { login, register, user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPortal = searchParams.get('portal') || 'citizen';
  const [portal, setPortal] = useState(initialPortal);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const p = searchParams.get('portal');
    if (p && PORTALS[p]) setPortal(p);
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      const expected = PORTALS[portal]?.roles || [];
      if (expected.includes(user.role)) {
        navigate(roleRedirects[user.role] || '/');
      }
    }
  }, [user, portal, navigate]);

  const styles = portalStyles[portal] || portalStyles.citizen;
  const config = PORTALS[portal];

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let loggedIn;
      if (authMode === 'login') {
        loggedIn = await login(form.email, form.password);
      } else {
        if (portal !== 'citizen') {
          setError(t('registrationCitizenOnly'));
          return;
        }
        loggedIn = await register({ ...form, role: 'citizen' });
      }

      if (!config.roles.includes(loggedIn.role)) {
        logout();
        setError(t('wrongPortal', { portal: t(PORTAL_TITLE_KEYS[portal]) }));
        return;
      }
      navigate(roleRedirects[loggedIn.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || t('loginFailed'));
    }
  };

  const fillDemo = () => {
    setForm({ ...form, email: config.demo.email, password: 'password123' });
  };

  return (
    <div className="portal-login-page min-h-dvh flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">NagarSeva</h1>
          <p className="text-slate-600 mt-2">{t('choosePortal')}</p>
          <div className="mt-4 flex justify-center">
            <LanguagePicker />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {Object.values(PORTALS).map((p) => {
            const Icon = portalIcons[p.id];
            const s = portalStyles[p.id];
            const selected = portal === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPortal(p.id); setError(''); navigate(`/login?portal=${p.id}`, { replace: true }); }}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  selected ? `${s.light} ring-2 ${s.ring} shadow-lg scale-[1.02]` : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl ${s.bg} text-white flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className={`font-bold text-lg ${selected ? s.text : 'text-slate-800'}`}>{t(PORTAL_TITLE_KEYS[p.id])}</p>
                <p className="text-sm text-slate-500 mt-1">{t(PORTAL_SUBTITLE_KEYS[p.id])}</p>
                {p.id === 'authority' && (
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wide bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{t('desktopView')}</span>
                )}
                {(p.id === 'citizen' || p.id === 'worker') && (
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wide bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{t('mobileView')}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 max-w-md mx-auto">
          <h2 className={`text-xl font-bold mb-1 ${styles.text}`}>{t(PORTAL_TITLE_KEYS[portal])} {t('login')}</h2>
          <p className="text-sm text-slate-500 mb-6">{t('signInToContinue')}</p>

          <form onSubmit={submit} className="space-y-4">
            {authMode === 'register' && portal === 'citizen' && (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('fullName')}
                className="w-full border border-slate-200 rounded-xl px-4 py-3"
                required
              />
            )}
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t('email')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t('password')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3"
              required
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className={`w-full text-white py-3.5 rounded-xl font-semibold ${styles.btn}`}>
              {authMode === 'login' ? t('signIn') : t('createAccount')}
            </button>
          </form>

          {portal === 'citizen' && (
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full mt-4 text-emerald-700 text-sm"
            >
              {authMode === 'login' ? t('newCitizenRegister') : t('alreadyHaveAccount')}
            </button>
          )}

          <button type="button" onClick={fillDemo} className="w-full mt-3 text-xs text-slate-500 hover:text-slate-700">
            {t('useDemo')}: {config.demo.label}
          </button>
        </div>

        {portal === 'citizen' && (
          <Link
            to="/report/anonymous"
            className="flex items-center justify-center gap-2 mt-6 text-purple-700 text-sm font-medium hover:underline"
          >
            <MapPin className="w-4 h-4" /> {t('reportAnonymously')}
          </Link>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">{t('demoPasswordHint')}</p>
      </div>
    </div>
  );
}
