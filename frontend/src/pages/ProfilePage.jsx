import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import IssueCard from '../components/IssueCard';

const BADGE_ICONS = {
  first_reporter: '📝',
  verified_citizen: '✅',
  community_guardian: '🛡️',
  problem_solver: '🔧',
  civic_champion: '🏆',
  whistleblower: '🔒',
  top_contributor: '👑',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [score, setScore] = useState(null);
  const [badges, setBadges] = useState([]);
  const [issues, setIssues] = useState([]);
  const [serviceHours, setServiceHours] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get(`/users/${user.id}/score`).then((r) => setScore(r.data));
    api.get(`/users/${user.id}/badges`).then((r) => setBadges(r.data));
    api.get(`/users/${user.id}/issues`).then((r) => setIssues(r.data));
    if (user.role === 'school_reporter') {
      api.get(`/users/${user.id}/service-hours`).then((r) => setServiceHours(r.data));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center space-y-4">
        <p className="text-slate-600">{t('logInToViewProfile')}</p>
        <Link to="/login?portal=citizen" className="text-emerald-700 font-semibold">{t('login')} →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-6 space-y-6">
      <div className="bg-emerald-700 text-white rounded-xl p-6 text-center">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-emerald-200 capitalize">{user.role?.replace('_', ' ')}</p>
        <p className="text-4xl font-bold mt-2">{score?.civic_score ?? user.civic_score} {t('pts')}</p>
      </div>

      {badges.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">{t('badgesEarned')}</h2>
          <div className="grid grid-cols-4 gap-3">
            {badges.map((b) => (
              <div key={b.badge_key} className="bg-white border rounded-xl p-3 text-center">
                <span className="text-2xl">{BADGE_ICONS[b.badge_key] || '🎖️'}</span>
                <p className="text-xs mt-1 text-slate-600">{b.badge_label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {serviceHours && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="font-semibold">{t('communityService')}</p>
          <p className="text-2xl font-bold text-blue-800">{serviceHours.community_service_hours} {t('hours')}</p>
          <p className="text-sm text-blue-600">{serviceHours.verified_reports} {t('verifiedReports')}</p>
        </div>
      )}

      {score?.transactions?.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">{t('scoreHistory')}</h2>
          <div className="space-y-2">
            {score.transactions.slice(0, 10).map((tx) => (
              <div key={tx.created_at + tx.reason} className="flex justify-between bg-white rounded-lg p-3 border text-sm">
                <span>{tx.reason}</span>
                <span className={tx.points > 0 ? 'text-emerald-600' : 'text-red-600'}>{tx.points > 0 ? '+' : ''}{tx.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">{t('myReports')}</h2>
        {issues.length === 0 ? (
          <p className="text-slate-500 text-sm">{t('noReportsYet')} <Link to="/report" className="text-emerald-700">{t('reportOne')} →</Link></p>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
          </div>
        )}
      </div>
    </div>
  );
}
