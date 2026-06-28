import { useState, useEffect } from 'react';
import IssueCard from '../components/IssueCard';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

export default function FeedPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState('all');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ lat: 19.076, lng: 72.877 });

  const TABS = [
    { key: 'all', label: t('all') },
    { key: 'near', label: t('nearMe') },
    { key: 'my_reports', label: t('myReports') },
    { key: 'verified', label: t('verified') },
  ];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ lat: position.lat, lng: position.lng, radius: 2000 });
    if (tab === 'verified') params.set('filter', 'verified');
    if (tab === 'my_reports') params.set('filter', 'my_reports');
    api.get(`/feed?${params}`)
      .then((r) => setIssues(r.data))
      .finally(() => setLoading(false));
  }, [tab, position]);

  return (
    <div className="max-w-lg mx-auto p-4 pb-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">{t('hyperlocalFeed')}</h1>
      <p className="text-sm text-slate-500 mb-4">{t('within2km')}</p>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            disabled={key === 'my_reports' && !user}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              tab === key ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
            } disabled:opacity-40`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-8">{t('loading')}</p>
      ) : issues.length === 0 ? (
        <p className="text-center text-slate-500 py-8">{t('noIssuesNearby')}</p>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
