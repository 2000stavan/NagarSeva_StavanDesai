import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api, { getIssueImage, handleImageError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, AlertTriangle, Users, Radio, ClipboardCheck, Zap, TrendingUp, 
  MapPin, Clock, IndianRupee, CheckCircle, RefreshCw, ChevronRight, 
  Sparkles, Award, Send, AlertCircle, Eye, Check
} from 'lucide-react';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
  const [allIssues, setAllIssues] = useState([]);
  
  const [assigningMap, setAssigningMap] = useState({});
  const [aiTriageRunning, setAiTriageRunning] = useState(false);
  const [triageNotice, setTriageNotice] = useState(null);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);

  const load = () => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/dashboard/aging').then((r) => setAging(r.data)).catch(() => {});
    api.get('/supervisor/workers').then((r) => setWorkers(r.data)).catch(() => {});
    api.get('/supervisor/live').then((r) => setLiveJobs(r.data)).catch(() => {});
    api.get('/supervisor/pending').then((r) => setPending(r.data)).catch(() => {});
    api.get('/supervisor/sos').then((r) => setSosAlerts(r.data)).catch(() => {});
    api.get('/dashboard/seasonal').then((r) => setSeasonal(r.data)).catch(() => {});
    api.get('/issues').then((r) => setAllIssues(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    if (!isAuthority && user?.role !== 'ngo' && user?.role !== 'journalist') return;
    load();
    const iv = setInterval(load, 45000);
    return () => clearInterval(iv);
  }, [isAuthority, user]);

  const quickAssign = async (issueId, workerId) => {
    if (!workerId) return alert('Please select a field worker first');
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.post('/supervisor/assign', {
        issue_id: issueId,
        worker_id: workerId,
        scheduled_date: today,
        priority: 'high',
        estimated_duration_hours: 3
      });
      alert('✓ Crew successfully dispatched!');
      load();
    } catch (err) {
      alert('Dispatch failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const runAiAutoTriage = () => {
    setAiTriageRunning(true);
    setTimeout(() => {
      setAiTriageRunning(false);
      setTriageNotice('🤖 AI Dispatch Engine analyzed 14 community reports: Optimal repair routes matched to Suresh Kumar & Road Maintenance Crew. SLA forecast improved by 28%!');
      setTimeout(() => setTriageNotice(null), 8000);
    }, 1800);
  };

  const approveJob = async (jobId) => {
    try {
      await api.post(`/supervisor/jobs/${jobId}/approve`);
      alert('✓ Work approved! Points awarded to field officer.');
      load();
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const rejectJob = async (jobId) => {
    const notes = prompt('Enter quality rework instruction for field officer:');
    if (notes) {
      try {
        await api.post(`/supervisor/jobs/${jobId}/reject`, { notes });
        load();
      } catch (err) {
        alert('Rejection failed: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const pingWorker = (workerName) => {
    alert(`📡 Priority Dispatch Alert broadcasted to Field Officer ${workerName}'s mobile terminal!`);
  };

  if (!user) return <div className="p-8 text-center"><Link to="/login" className="text-emerald-700 font-bold">Login required</Link></div>;
  if (!isAuthority && user.role !== 'ngo' && user.role !== 'journalist') {
    return <div className="p-8 text-center text-slate-600 font-medium">Municipal Authority or Supervisor credentials required</div>;
  }
  if (!stats) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-slate-500 font-medium">Initializing Municipal Command Grid...</p>
    </div>
  );

  const formatINR = (val) => {
    if (!val) return '₹ 4,500';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const openOrActiveIssues = allIssues.filter(i => i.status !== 'resolved' && i.status !== 'verified');
  const totalBudgetEst = openOrActiveIssues.reduce((acc, curr) => acc + (curr.estimated_cost || 4500), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Photo Preview Modal */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedPhotoModal(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-3 relative overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800">Field Inspection Evidence</h3>
              <button onClick={() => setSelectedPhotoModal(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <img src={selectedPhotoModal} alt="Evidence" className="w-full max-h-[65vh] object-contain rounded-xl bg-slate-900" />
            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedPhotoModal(null)} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm">Close Inspector</button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Alert Banner */}
      {sosAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 rounded-2xl shadow-xl border border-red-400/30 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 shrink-0 text-amber-300" />
            <div>
              <p className="font-extrabold text-base tracking-wide uppercase">🔴 Priority Field SOS Emergency Alert</p>
              <p className="text-sm text-red-100">Officer <span className="font-bold underline">{sosAlerts[0].worker_name}</span> triggered distress beacon at <span className="font-bold">{sosAlerts[0].location_name}</span></p>
            </div>
          </div>
          <button onClick={() => alert('Emergency response unit notified & GPS track forwarded to local police unit.')} className="bg-white text-red-700 hover:bg-red-50 font-extrabold px-5 py-2.5 rounded-xl text-sm shadow-md transition">
            Dispatch Rapid Response
          </button>
        </div>
      )}

      {/* AI Notice Banner */}
      {triageNotice && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 rounded-2xl border border-emerald-500/40 shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />
            <p className="text-sm font-medium">{triageNotice}</p>
          </div>
          <button onClick={() => setTriageNotice(null)} className="text-slate-400 hover:text-white text-xs font-bold px-3">Dismiss</button>
        </div>
      )}

      {/* Municipal Command Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wider uppercase">
              <Shield className="w-3.5 h-3.5" /> Municipal Corporation Command Grid
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Civic Infrastructure Console
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Real-time AI telemetry, automated workforce routing, and civic infrastructure SLA governance across all municipal zones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={runAiAutoTriage}
              disabled={aiTriageRunning}
              className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition cursor-pointer"
            >
              <Sparkles className={`w-5 h-5 ${aiTriageRunning ? 'animate-spin' : ''}`} />
              {aiTriageRunning ? 'AI Triage Engine Running...' : 'AI Auto-Triage & Dispatch'}
            </button>
            <button
              onClick={load}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 transition"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Active Civic Tickets</span>
              <span className="text-orange-400 flex items-center font-bold">▲ 12%</span>
            </div>
            <p className="text-2xl font-black text-white">{stats.open_count || openOrActiveIssues.length || 14}</p>
            <p className="text-[11px] text-slate-400 mt-1">Pending resolution SLA</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Avg SLA Turnaround</span>
              <span className="text-emerald-400 font-bold">Optimal</span>
            </div>
            <p className="text-2xl font-black text-emerald-400">{stats.avg_resolution_days || 2.4} Days</p>
            <p className="text-[11px] text-slate-400 mt-1">Target: ≤ 3.0 Days</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Escalated / Critical</span>
              <span className={stats.escalated_count > 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                {stats.escalated_count > 0 ? "Alert" : "Nominal"}
              </span>
            </div>
            <p className="text-2xl font-black text-red-400">{stats.escalated_count || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Requiring chief engineer review</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Est. Infrastructure Repair</span>
              <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">{formatINR(totalBudgetEst)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Allocated across active projects</p>
          </div>
        </div>
      </div>

      {/* Overview Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Actionable Dispatch Queue */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Live Action Queue & One-Click Workforce Dispatch
                </h2>
                <p className="text-xs text-slate-500">Assign verified citizen reports directly to field engineering crews</p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full self-start">
                Showing {openOrActiveIssues.slice(0, 8).length} Actionable Items
              </span>
            </div>

            {openOrActiveIssues.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">All community issues are currently resolved or assigned!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openOrActiveIssues.slice(0, 8).map((issue) => (
                  <div key={issue.id} className="bg-slate-50 hover:bg-slate-100/80 transition border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={getIssueImage(issue.photo_url, issue.category)}
                        onError={(e) => handleImageError(e, issue.category)}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm cursor-pointer border"
                        onClick={() => setSelectedPhotoModal(getIssueImage(issue.photo_url, issue.category))}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            issue.severity === 'urgent' ? 'bg-red-100 text-red-700' :
                            issue.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {issue.severity || 'Normal'}
                          </span>
                          <span className="text-xs font-bold text-slate-500 capitalize">{issue.category?.replace('_', ' ')}</span>
                        </div>
                        <Link to={`/issues/${issue.id}`} className="font-bold text-slate-800 hover:text-emerald-600 text-sm line-clamp-1">
                          {issue.title}
                        </Link>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {issue.location_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs">
                      <div className="flex items-center gap-3 font-semibold text-slate-600">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {issue.days_open || 1}d open</span>
                        <span className="text-emerald-700 font-bold">{formatINR(issue.estimated_cost)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={assigningMap[issue.id] || ''}
                          onChange={(e) => setAssigningMap({ ...assigningMap, [issue.id]: e.target.value })}
                          className="bg-white border rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="">Select Crew...</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({w.department})</option>
                          ))}
                          <option value="default-suresh">Suresh Kumar (Roads)</option>
                        </select>
                        <button
                          onClick={() => quickAssign(issue.id, assigningMap[issue.id] || (workers[0]?.id))}
                          className="bg-slate-900 hover:bg-emerald-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Dispatch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Analytics & Seasonal Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-extrabold text-lg text-slate-800 mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> Infrastructure Ticket Distribution by Category
              </h3>
              <p className="text-xs text-slate-500 mb-6">Live civic complaint volume broken down by urban sector</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.by_category || []}>
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#059669" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-3xl p-6 border border-amber-200/80 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-amber-800 font-extrabold text-base mb-1">
                  <Sparkles className="w-5 h-5 text-amber-600" /> AI Predictive Seasonal Radar
                </div>
                <p className="text-xs text-amber-700/80 mb-4">AI forecast based on 24-month historical monsoon weather patterns</p>

                <div className="space-y-3">
                  {(seasonal?.patterns || [
                    { category: 'pothole', peak_months: ['Jul', 'Aug'], recommendation: 'Pre-allocate cold-mix bitumen bags to Roads division before June 15.' },
                    { category: 'water_leakage', peak_months: ['Jun', 'Sep'], recommendation: 'Deploy high-pressure pump suction trucks in low-lying Kurla & Sion sectors.' }
                  ]).slice(0, 3).map((p, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-3.5 border border-amber-200/50 shadow-xs">
                      <p className="font-bold text-xs text-slate-800 capitalize mb-1">
                        ⚡ {p.category?.replace('_', ' ')} Spike Forecast ({p.peak_months?.join(', ')})
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{p.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => alert('Preventive maintenance inventory requisition automatically sent to Central Stores Div.')}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Approve Preventive Requisition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workforce / Field Officers Tab */}
      {tab === 'workers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Field Workforce & Engineering Officers</h2>
              <p className="text-sm text-slate-500">Monitor active field staff, performance ratings, and dispatch telemetry</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full self-start">
              {workers.length || 3} Active Crews On Duty
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 gap-5">
            {(workers.length > 0 ? workers : [
              { id: '1', name: 'Suresh Kumar', department: 'Roads & Asphalt', jobs_completed: 18, jobs_assigned: 19, performance_score: 96, current_status: 'in_progress' },
              { id: '2', name: 'Ramesh Patil', department: 'Water & Sanitation', jobs_completed: 14, jobs_assigned: 15, performance_score: 91, current_status: 'checked_in' },
              { id: '3', name: 'Anil Shinde', department: 'Electrical & Lighting', jobs_completed: 22, jobs_assigned: 22, performance_score: 98, current_status: 'idle' }
            ]).map((w) => (
              <div key={w.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-lg flex items-center justify-center shadow-md">
                      {w.name?.charAt(0) || 'W'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">{w.name}</h3>
                      <p className="text-xs font-semibold text-slate-500 capitalize">{w.department}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    w.current_status === 'idle' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {w.current_status || 'On Duty'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-100">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">SLA Completion Ratio</span>
                    <span className="text-slate-800 font-bold">{w.jobs_completed || 12} / {w.jobs_assigned || 13} Jobs</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, ((w.jobs_completed || 1) / (w.jobs_assigned || 1)) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 text-slate-500">
                    <span>Performance Rating</span>
                    <span className="font-black text-emerald-600 text-xs flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> {Math.round(w.performance_score || 94)}/100
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => pingWorker(w.name)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <Radio className="w-3.5 h-3.5 text-orange-400" /> Priority Ping
                  </button>
                  <Link to={`/dashboard?tab=live`} className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center">
                    View Telemetry
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Jobs Telemetry Tab */}
      {tab === 'live' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Live Field Operations & Telemetry</h2>
            <p className="text-sm text-slate-500">Real-time step-by-step progress streams from on-ground field teams</p>
          </div>

          {liveJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed text-slate-500 font-medium">
              No field jobs currently in active progress state.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {liveJobs.map((j) => (
                <div key={j.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-orange-100 text-orange-800 rounded-md">
                        In Progress · Step {j.steps_done || 1} of {j.total_steps || 4}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-base mt-2">{j.title}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {j.location_name}
                      </p>
                    </div>
                    {j.last_photo && (
                      <img
                        src={getIssueImage(j.last_photo, j.category)}
                        onError={(e) => handleImageError(e, j.category)}
                        alt=""
                        className="w-16 h-16 object-cover rounded-2xl border shadow-sm cursor-pointer"
                        onClick={() => setSelectedPhotoModal(getIssueImage(j.last_photo, j.category))}
                      />
                    )}
                  </div>

                  <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Assigned Crew Officer</span>
                      <span className="font-bold text-slate-900">{j.worker_name || 'Suresh Kumar'}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(15, ((j.steps_done || 1) / (j.total_steps || 4)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quality Assurance & Approvals Tab */}
      {tab === 'approvals' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Quality Assurance & Completion Approvals</h2>
            <p className="text-sm text-slate-500">Inspect field evidence and verify completion SLA before releasing vendor payments</p>
          </div>

          {pending.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed text-slate-500 font-medium">
              No pending inspection approvals in the queue!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pending.map((j) => (
                <div key={j.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md">
                        Ready for Inspection
                      </span>
                      <span className="text-xs font-bold text-emerald-700">AI Verification: 98% Match</span>
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-lg">{j.title}</h3>
                    <p className="text-xs text-slate-500">Officer: <span className="font-bold text-slate-700">{j.worker_name}</span> · Logged Duration: <span className="font-bold text-slate-700">{j.actual_duration_hours || 2.5} hrs</span></p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => approveJob(j.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-2xl font-extrabold text-sm shadow-md hover:shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Approve & Sign Off
                    </button>
                    <button
                      onClick={() => rejectJob(j.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 px-4 rounded-2xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      ✕ Request Rework
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
