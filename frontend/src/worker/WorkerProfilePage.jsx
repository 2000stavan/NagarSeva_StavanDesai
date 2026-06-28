import { useState, useEffect } from 'react';
import api from '../api/client';
import { useTranslation } from '../context/LanguageContext';

export default function WorkerProfilePage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/worker/performance').then((r) => setData(r.data));
  }, []);

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold">{t('profile')}</h1>
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{data.stats?.completed || 0}</p>
              <p className="text-xs text-slate-500">{t('jobsDone')}</p>
            </div>
            <div className="bg-white border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{data.stats?.total || 0}</p>
              <p className="text-xs text-slate-500">{t('totalAssigned')}</p>
            </div>
          </div>
          {data.history?.[0] && (
            <div className="bg-white border rounded-xl p-4">
              <p className="font-semibold">{t('performanceScore')}</p>
              <p className="text-3xl font-bold text-green-600">{Math.round(data.history[0].performance_score || 0)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
