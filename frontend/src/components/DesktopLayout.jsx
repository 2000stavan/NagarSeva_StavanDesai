import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Radio, ClipboardCheck, LogOut, Shield, Bell } from 'lucide-react';

const sidebar = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', tab: 'overview' },
  { to: '/dashboard?tab=workers', icon: Users, label: 'Workers', tab: 'workers' },
  { to: '/dashboard?tab=live', icon: Radio, label: 'Live Jobs', tab: 'live' },
  { to: '/dashboard?tab=approvals', icon: ClipboardCheck, label: 'Approvals', tab: 'approvals' },
];

export default function DesktopLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'overview';

  useEffect(() => {
    document.body.classList.add('desktop-mode');
    return () => document.body.classList.remove('desktop-mode');
  }, []);

  return (
    <div className="desktop-viewport min-h-dvh flex bg-slate-100">
      <aside className="w-56 shrink-0 bg-slate-900 text-white flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="w-6 h-6 text-emerald-400" />
            NagarSeva
          </Link>
          <p className="text-xs text-slate-400 mt-1">Authority Console</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebar.map(({ to, icon: Icon, label, tab }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === tab ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.department || user?.role}</p>
          <button
            onClick={() => { logout(); navigate('/login?portal=authority'); }}
            className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Authority Dashboard</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Notifications">
              <Bell className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-600">{user?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
