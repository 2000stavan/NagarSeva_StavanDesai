import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api, { getIssueImage, handleImageError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { isAuthority, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (t) => navigate(t === 'overview' ? '/dashboard' : `/dashboard?tab=${t}`);
  const [stats, setStats] = useState(null);
  const [seasonal, setSeasonal] = useState(null);
  const [aging, setAging] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [liveJobs, setLiveJobs] = useState([]);
  const [pending, setPending] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [assignForm, setAssignForm] = useState({ worker_id: '', scheduled_date: '', priority: 'normal', estimated_duration_hours: 2 });

  const load = () => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/dashboard/aging').then((r) => setAging(r.data)).catch(() => {});
    api.get('/supervisor/workers').then((r) => setWorkers(r.data)).catch(() => {});
    api.get('/supervisor/live').then((r) => setLiveJobs(r.data)).catch(() => {});
    api.get('/supervisor/pending').then((r) => setPending(r.data)).catch(() => {});
    api.get('/supervisor/sos').then((r) => setSosAlerts(r.data)).catch(() => {});
    api.get('/dashboard/seasonal').then((r) => setSeasonal(r.data)).catch(() => {});
  };

  useEffect(() => {
    if (!isAuthority && user?.role !== 'ngo' && user?.role !== 'journalist') return;
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [isAuthority, user]);

  const assignWorker = async () => {
    await api.post('/supervisor/assign', { issue_id: assignModal, ...assignForm });
    setAssignModal(null);
    load();
  };

  const approveJob = async (jobId) => {
    try {
      await api.post(`/supervisor/jobs/${jobId}/approve`);
      load();
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const rejectJob = async (jobId) => {
    const notes = prompt('Rejection reason:');
    if (notes) {
      try {
        await api.post(`/supervisor/jobs/${jobId}/reject`, { notes });
        load();
      } catch (err) {
        alert('Rejection failed: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  if (!user) return <div className="p-8 text-center"><Link to="/login" className="text-emerald-700">Login required</Link></div>;
  if (!isAuthority && user.role !== 'ngo' && user.role !== 'journalist') {
    return <div className="p-8 text-center text-slate-600">Authority access required</div>;
  }
  if (!stats) return <div className="text-center py-12 text-slate-500">Loading dashboard...</div>;

  const kpis = [
    { label: 'Open Issues', value: stats.open_count, color: 'text-orange-600' },
    { label: 'Avg Resolution', value: `${stats.avg_resolution_days || 0}d`, color: 'text-blue-600' },
    { label: 'Escalated', value: stats.escalated_count, color: 'text-red-600' },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      {sosAlerts.length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-xl animate-pulse font-medium">
          ⚠ SOS Alert — {sosAlerts[0].worker_name} at {sosAlerts[0].location_name}
        </div>
      )}

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl p-3 border shadow-sm">
                <p className="text-[10px] text-slate-500">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.by_category}>
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {seasonal?.patterns?.slice(0, 2).map((p, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <p className="font-medium capitalize">{p.category?.replace('_', ' ')} spikes in {p.peak_months?.join('-')}</p>
              <p className="text-amber-800">{p.recommendation}</p>
            </div>
          ))}
        </>
      )}

      {tab === 'workers' && (
        <div className="space-y-2">
          {workers.map((w) => (
            <div key={w.id} className="bg-white border rounded-xl p-3 text-sm">
              <p className="font-semibold">{w.name} <span className="text-slate-400 font-normal">({w.department})</span></p>
              <p className="text-xs text-slate-500">{w.jobs_completed}/{w.jobs_assigned} jobs · Score: {Math.round(w.performance_score || 0)}</p>
              <p className="text-xs capitalize text-orange-700">{w.current_status || 'idle'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'live' && (
        <div className="space-y-2">
          {liveJobs.length === 0 ? <p className="text-slate-500 text-sm">No active jobs</p> : liveJobs.map((j) => (
            <div key={j.id} className="bg-white border rounded-xl p-3">
              <p className="font-semibold text-sm">{j.title}</p>
              <p className="text-xs text-slate-500">{j.worker_name} · {j.location_name}</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${((j.steps_done || 0) / 5) * 100}%` }} />
              </div>
              {j.last_photo && (
                <img
                  src={getIssueImage(j.last_photo, j.category)}
                  onError={(e) => handleImageError(e, j.category)}
                  alt=""
                  className="w-16 h-12 object-cover rounded mt-2"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'approvals' && (
        <div className="space-y-3">
          {pending.length === 0 ? <p className="text-slate-500 text-sm">No pending approvals</p> : pending.map((j) => (
            <div key={j.id} className="bg-white border rounded-xl p-3">
              <p className="font-semibold">{j.title}</p>
              <p className="text-xs text-slate-500">{j.worker_name} · {j.step_count} steps · {j.actual_duration_hours ? `${parseFloat(j.actual_duration_hours).toFixed(1)}h` : '—'}</p>
              <div className="flex gap-3 mt-3 relative z-10">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); approveJob(j.id); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  ✓ Approve Work
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); rejectJob(j.id); }}
                  className="flex-1 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border border-red-200 py-2.5 px-4 rounded-xl font-bold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 border">
        <h2 className="font-semibold mb-2 text-sm">Assign Worker to Issue</h2>
        <p className="text-xs text-slate-500 mb-2">Enter issue ID from the issues list</p>
        <div className="flex gap-2">
          <input placeholder="Issue UUID" onChange={(e) => setAssignModal(e.target.value)} className="flex-1 border rounded-lg px-2 py-2 text-xs" />
          <select value={assignForm.worker_id} onChange={(e) => setAssignForm({ ...assignForm, worker_id: e.target.value })} className="border rounded-lg px-2 text-xs">
            <option value="">Worker</option>
            {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={() => assignModal && assignForm.worker_id && assignWorker()} className="bg-emerald-600 text-white px-3 rounded-lg text-xs">Assign</button>
        </div>
      </div>

      {aging?.buckets?.['90+']?.slice(0, 3).map((issue) => (
        <div key={issue.id} className="flex justify-between items-center text-sm">
          <Link to={`/issues/${issue.id}`} className="text-red-700 truncate flex-1">{issue.title}</Link>
          <button onClick={() => { setAssignModal(issue.id); setTab('overview'); }} className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded ml-2">Assign</button>
        </div>
      ))}
    </div>
  );
}
