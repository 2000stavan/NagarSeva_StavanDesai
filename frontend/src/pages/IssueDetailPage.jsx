import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { formatINR, categoryLabel, severityColor, statusSteps } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { ThumbsUp, Flag, Users, Star, IndianRupee, AlertCircle } from 'lucide-react';

export default function IssueDetailPage() {
  const { id } = useParams();
  const { user, isAuthority, refreshUser } = useAuth();
  const [issue, setIssue] = useState(null);
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [sponsorMsg, setSponsorMsg] = useState('');
  const [rating, setRating] = useState(0);
  const [resolveFile, setResolveFile] = useState(null);

  const load = () => api.get(`/issues/${id}`).then((r) => setIssue(r.data));
  useEffect(() => { load(); }, [id]);

  const verify = async (action) => {
    const { data } = await api.post(`/issues/${id}/verify`, { action });
    setIssue((i) => ({ ...i, ...data }));
    refreshUser?.();
  };

  const sponsor = async () => {
    const { data } = await api.post(`/issues/${id}/sponsor`, { amount: parseFloat(sponsorAmount), message: sponsorMsg });
    setIssue((i) => ({ ...i, ...data }));
    setSponsorAmount('');
    refreshUser?.();
  };

  const rate = async (stars) => {
    await api.post(`/issues/${id}/satisfaction`, { rating: stars });
    setRating(stars);
    refreshUser?.();
  };

  const resolve = async () => {
    const fd = new FormData();
    fd.append('photo', resolveFile);
    await api.post(`/issues/${id}/resolve`, fd);
    load();
  };

  const updateStatus = async (status) => {
    const { data } = await api.patch(`/issues/${id}/status`, { status });
    setIssue((i) => ({ ...i, ...data }));
  };

  if (!issue) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const progress = Math.min(100, ((issue.sponsored_amount || 0) / (issue.estimated_cost || 1)) * 100);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-6 space-y-6">
      {issue.status === 'resolved' && issue.resolved_photo_url ? (
        <BeforeAfterSlider before={issue.photo_url} after={issue.resolved_photo_url} />
      ) : (
        <img src={issue.photo_url} alt={issue.title} className="rounded-xl w-full h-64 object-cover" />
      )}

      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`w-3 h-3 rounded-full ${severityColor(issue.severity)}`} />
          <span className="text-sm font-medium bg-slate-100 px-2 py-0.5 rounded">{categoryLabel(issue.category)}</span>
          <span className="text-sm capitalize bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">{issue.status}</span>
          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
            <Users className="w-3 h-3" />{issue.affected_count} people affected
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">{issue.title}</h1>
        <p className="text-slate-600 mt-2">{issue.description}</p>
        <p className="text-sm text-slate-500 mt-2">{issue.location_name} · {issue.days_open} days open · {issue.assigned_department}</p>
        {issue.job && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-sm font-medium text-orange-900">
              Repair in progress — Step {issue.job.steps_done || 0} of {issue.job.total_steps || '?'} complete
            </p>
            <p className="text-xs text-orange-700">Worker assigned · Status: {issue.job.status}</p>
          </div>
        )}
      </div>

      {issue.repair_journey?.length > 0 && (
        <div className="bg-white rounded-xl p-4 border">
          <h3 className="font-semibold mb-3">Repair Journey</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {issue.repair_journey.map((s) => (
              <div key={s.step_number} className="shrink-0 w-28">
                <img src={s.photo_url} alt="" className="w-28 h-20 object-cover rounded-lg" />
                <p className="text-[10px] text-slate-600 mt-1">{s.step_label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status timeline */}
      <div className="flex justify-between items-center bg-white rounded-xl p-4 border">
        {statusSteps.map((s, i) => (
          <div key={s} className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              statusSteps.indexOf(issue.status) >= i ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>{i + 1}</div>
            <span className="text-xs mt-1 capitalize text-slate-600">{s.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Cost & prediction */}
      <div className="bg-white rounded-xl p-4 border space-y-2">
        <p className="font-semibold flex items-center gap-2"><IndianRupee className="w-4 h-4" />Estimated repair: {formatINR(issue.estimated_cost)}</p>
        {issue.prediction?.predicted_days ? (
          <p className="text-sm text-slate-600">
            Estimated resolution: {issue.prediction.range || issue.prediction.predicted_days} days · based on {issue.prediction.based_on} similar issues
          </p>
        ) : (
          <p className="text-sm text-slate-400">Insufficient data for prediction</p>
        )}
      </div>

      {/* Verify */}
      {user && issue.status !== 'resolved' && (
        <div className="flex gap-3">
          <button onClick={() => verify('upvote')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 py-3 rounded-xl font-medium">
            <ThumbsUp className="w-5 h-5" /> Upvote ({issue.upvotes})
          </button>
          <button onClick={() => verify('flag')} className="flex items-center justify-center gap-2 bg-red-100 text-red-800 px-4 py-3 rounded-xl">
            <Flag className="w-5 h-5" /> ({issue.flags})
          </button>
        </div>
      )}

      {/* Sponsor */}
      {user && issue.status !== 'resolved' && (
        <div className="bg-white rounded-xl p-4 border space-y-3">
          <h3 className="font-semibold">Sponsor this fix</h3>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-slate-600">{formatINR(issue.sponsored_amount)} of {formatINR(issue.estimated_cost)} funded</p>
          <div className="flex gap-2">
            <input type="number" value={sponsorAmount} onChange={(e) => setSponsorAmount(e.target.value)} placeholder="Amount (INR)" className="flex-1 border rounded-lg px-3 py-2" />
            <button onClick={sponsor} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Sponsor (+20 pts)</button>
          </div>
        </div>
      )}

      {/* Satisfaction */}
      {issue.status === 'resolved' && user && (
        <div className="bg-white rounded-xl p-4 border">
          <p className="font-semibold mb-2">Rate this resolution</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => rate(s)} className={`p-2 rounded-lg ${rating >= s ? 'text-yellow-500' : 'text-slate-300'}`}>
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Authority actions */}
      {isAuthority && (
        <div className="bg-slate-800 text-white rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Authority Actions</h3>
          <div className="flex flex-wrap gap-2">
            {['verified', 'in_progress', 'rejected'].map((s) => (
              <button key={s} onClick={() => updateStatus(s)} className="bg-slate-700 px-3 py-1.5 rounded-lg capitalize text-sm">{s.replace('_', ' ')}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="file" accept="image/*" onChange={(e) => setResolveFile(e.target.files[0])} className="text-sm" />
            <button onClick={resolve} disabled={!resolveFile} className="bg-emerald-500 px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              Resolve with photo
            </button>
          </div>
        </div>
      )}

      {/* Escalation history */}
      {issue.escalation_logs?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Escalation History</h3>
          {issue.escalation_logs.map((log) => (
            <div key={log.id} className="text-sm text-red-700 mt-2">
              Level {log.escalation_level}: {log.reason} → {log.notified_to}
            </div>
          ))}
        </div>
      )}

      <Link to="/" className="text-emerald-700 font-medium">← Back to map</Link>
    </div>
  );
}
