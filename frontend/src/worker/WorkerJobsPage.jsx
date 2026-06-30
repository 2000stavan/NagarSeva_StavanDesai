import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getIssueImage, handleImageError } from '../api/client';
import { useTranslation } from '../context/LanguageContext';
import { MapPin, AlertTriangle } from 'lucide-react';

const priorityColor = { urgent: 'bg-red-500', high: 'bg-orange-500', normal: 'bg-blue-500', low: 'bg-slate-400' };

export default function WorkerJobsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('status') || searchParams.get('filter') || 'all';
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const query = filter && filter !== 'all' ? `?status=${filter}` : '';
    api.get(`/worker/jobs${query}`).then((r) => setJobs(r.data)).catch(() => {});
  }, [filter]);

  return (
    <div className="p-4 space-y-3 pb-20">
      <h1 className="text-xl font-bold text-slate-800">
        {filter === 'in_progress' || filter === 'active' ? t('active') :
         filter === 'completed' || filter === 'done' ? t('done') :
         t('myJobs')}
      </h1>
      {jobs.length === 0 ? (
        <p className="text-center text-slate-500 py-12">{t('noJobs')}</p>
      ) : (
        jobs.map((job) => (
          <Link key={job.id} to={`/worker/jobs/${job.id}`} className="block bg-white rounded-xl border overflow-hidden shadow-sm">
            <div className="flex gap-3 p-3">
              <img
                src={getIssueImage(job.photo_url, job.category)}
                onError={(e) => handleImageError(e, job.category)}
                alt=""
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${priorityColor[job.priority] || priorityColor.normal}`} />
                  <span className="text-xs uppercase text-slate-500">{job.category?.replace('_', ' ')}</span>
                  {job.sos_triggered && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </div>
                <p className="font-semibold truncate">{job.title}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location_name}</p>
                <p className="text-xs text-orange-700 mt-1">
                  {job.steps_done || 0} / {job.total_steps || '?'} {t('steps').toLowerCase()} · {job.status}
                </p>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
