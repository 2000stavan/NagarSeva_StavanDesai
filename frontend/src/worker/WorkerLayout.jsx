import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguagePicker from '../components/LanguagePicker';
import { Briefcase, Play, CheckCircle, User, Mic, LogOut } from 'lucide-react';

export default function WorkerLayout({ children }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { to: '/worker/jobs', icon: Briefcase, label: t('myJobs') },
    { to: '/worker/jobs?status=in_progress', icon: Play, label: t('active') },
    { to: '/worker/jobs?status=completed', icon: CheckCircle, label: t('done') },
    { to: '/worker/profile', icon: User, label: t('profile') },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <header className="shrink-0 bg-orange-600 text-white px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-lg truncate">{t('workerAppName')}</p>
          {user && <p className="text-xs text-orange-100 truncate">{user.name} · {user.department}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LanguagePicker compact />
          <button onClick={() => { logout(); navigate('/login?portal=worker'); }} className="p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto relative">{children}</main>

      <Link
        to="/worker/voice"
        className="absolute bottom-16 right-3 z-50 bg-orange-500 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
        title={t('voiceHelp')}
      >
        <Mic className="w-6 h-6" />
      </Link>

      <nav className="shrink-0 bg-white border-t flex justify-around py-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center text-[10px] px-2 flex-1 ${
              location.pathname + location.search === to ||
              (to.startsWith('/worker/jobs') && location.pathname.startsWith('/worker/jobs') && !location.pathname.includes('profile') && to.includes(location.search))
                ? 'text-orange-600 font-semibold' : 'text-slate-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
