import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import MobileShell from './MobileShell';
import LanguagePicker from './LanguagePicker';
import { Map, PlusCircle, Rss, Trophy, User, LogOut, Shield } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const isMapPage = location.pathname === '/';

  const nav = [
    { to: '/', icon: Map, label: t('map') },
    { to: '/feed', icon: Rss, label: t('feed') },
    { to: '/report', icon: PlusCircle, label: t('report') },
    { to: '/leaderboard', icon: Trophy, label: t('board') },
    { to: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <MobileShell>
      <header className="shrink-0 bg-emerald-700 text-white shadow-lg z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-base shrink-0">
            <Shield className="w-5 h-5" />
            {t('appName')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguagePicker compact />
            {user ? (
              <>
                <span className="text-xs text-emerald-100">{user.civic_score} {t('pts')}</span>
                <button onClick={logout} className="p-1.5 hover:bg-emerald-600 rounded-lg" title={t('logout')}>
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link to="/login?portal=citizen" className="text-xs bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-500">
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 min-h-0 overflow-hidden relative ${isMapPage ? '' : 'overflow-y-auto'}`}>
        {children}
      </main>

      <nav className="shrink-0 bg-white border-t border-slate-200 z-50">
        <div className="flex justify-around py-1.5 px-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] flex-1 max-w-[4.5rem] ${
                location.pathname === to ? 'text-emerald-700 font-semibold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate w-full text-center">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </MobileShell>
  );
}
