import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { Trophy, Award } from 'lucide-react';

const BADGE_ICONS = {
  first_reporter: '📝',
  verified_citizen: '✅',
  community_guardian: '🛡️',
  problem_solver: '🔧',
  civic_champion: '🏆',
  whistleblower: '🔒',
  top_contributor: '👑',
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/leaderboard').then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="max-w-lg mx-auto p-4 pb-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Trophy className="w-7 h-7 text-yellow-500" /> {t('civicLeaderboard')}
      </h1>

      {data.current_user_rank && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          {t('yourRank')}: <strong>#{data.current_user_rank}</strong>
        </div>
      )}

      <div className="space-y-2">
        {data.leaderboard?.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 bg-white rounded-xl p-4 border ${
              user?.id === entry.id ? 'ring-2 ring-emerald-500' : ''
            }`}
          >
            <span className="text-2xl font-bold text-slate-300 w-8">#{entry.rank}</span>
            <div className="flex-1">
              <p className="font-semibold">{entry.name}</p>
              <p className="text-sm text-slate-500">{entry.report_count} {t('reportsCount')} · {entry.resolved_count} {t('resolvedCount')}</p>
              <div className="flex gap-1 mt-1">
                {entry.badges?.map((b) => (
                  <span key={b.badge_key} title={b.badge_label}>{BADGE_ICONS[b.badge_key] || '🎖️'}</span>
                ))}
              </div>
            </div>
            <span className="font-bold text-emerald-700">{entry.civic_score} {t('pts')}</span>
          </div>
        ))}
      </div>

      {data.school_leaderboard?.length > 0 && (
        <div>
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Award className="w-5 h-5" /> School Reporters</h2>
          {data.school_leaderboard.map((s, i) => (
            <div key={s.id} className="flex justify-between bg-white rounded-lg p-3 border mb-2">
              <span>#{i + 1} {s.name}</span>
              <span className="text-emerald-700">{s.community_service_hours}h service</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
