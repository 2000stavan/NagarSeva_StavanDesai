import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useTranslation } from '../context/LanguageContext';
import { speechLocale } from '../i18n/languages';
import { Camera, AlertTriangle, CheckCircle, XCircle, Mic } from 'lucide-react';

export default function WorkerActiveJobPage() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [job, setJob] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [lastAi, setLastAi] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [guidance, setGuidance] = useState('');

  const load = () => api.get(`/worker/jobs/${id}`).then((r) => {
    setJob(r.data);
    const done = r.data.steps?.length || 0;
    setCurrentStep(Math.min(done + 1, r.data.step_plan?.steps?.length || 1));
  });

  useEffect(() => { load(); }, [id]);

  const step = job?.step_plan?.steps?.[currentStep - 1];

  const uploadPhoto = async (file) => {
    if (!step) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('step_number', currentStep);
    fd.append('step_label', step.label);
    try {
      const { data } = await api.post(`/worker/jobs/${id}/steps`, fd);
      setLastAi(data.ai);
      if (data.ai?.is_valid) {
        await load();
        setLastAi(null);
      }
    } catch {
      alert(t('uploadFailed'));
    }
    setUploading(false);
  };

  const overrideSubmit = async () => {
    const reason = prompt('Reason for override:');
    if (!reason || !fileRef.current?.files[0]) return;
    const fd = new FormData();
    fd.append('photo', fileRef.current.files[0]);
    fd.append('step_number', currentStep);
    fd.append('step_label', step.label);
    fd.append('override_reason', reason);
    await api.post(`/worker/jobs/${id}/steps`, fd);
    load();
    setLastAi(null);
  };

  const triggerSos = async () => {
    if (!confirm('Trigger SOS?')) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const reason = prompt('Reason for SOS:') || 'Need help';
      await api.post(`/worker/jobs/${id}/sos`, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        reason,
      });
      alert(t('helpOnWay'));
    });
  };

  const askVoice = async (text) => {
    const { data } = await api.post('/worker/voice', { text, language: lang, job_id: id, current_step: currentStep });
    setGuidance(data.guidance_text);
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(data.guidance_text);
      u.lang = speechLocale(lang);
      speechSynthesis.speak(u);
    }
  };

  const checkout = async () => {
    await api.post(`/worker/jobs/${id}/checkout`, { notes: 'Work completed' });
    navigate(`/worker/jobs/${id}`);
  };

  if (!job || !step) return <div className="p-8 text-center">{t('loading')}</div>;

  const total = job.step_plan?.steps?.length || 1;
  const progress = ((job.steps?.length || 0) / total) * 100;
  const allDone = (job.steps?.length || 0) >= total;

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <p className="font-bold text-orange-800">{t('stepOf')} {currentStep} / {total}</p>
        <button onClick={triggerSos} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" /> {t('sos')}
        </button>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-3">
        <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-white border-2 border-orange-200 rounded-xl p-4">
        <h2 className="text-lg font-bold">{step.label}</h2>
        <p className="text-slate-600 mt-2">{step.instruction}</p>
        <p className="text-sm text-orange-700 mt-2">📷 {step.photo_guidance}</p>
        {step.safety_note && <p className="text-sm text-red-600 mt-2">⚠ {step.safety_note}</p>}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} />

      {!allDone ? (
        <>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full bg-orange-600 text-white py-5 rounded-xl text-lg font-bold flex items-center justify-center gap-2">
            <Camera className="w-6 h-6" /> {uploading ? t('checking') : t('takePhoto')}
          </button>

          {lastAi && (
            <div className={`p-4 rounded-xl ${lastAi.is_valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {lastAi.is_valid ? <CheckCircle className="w-8 h-8 text-green-600 mx-auto" /> : <XCircle className="w-8 h-8 text-red-600 mx-auto" />}
              <p className="text-center mt-2">{lastAi.feedback}</p>
              {!lastAi.is_valid && (
                <button onClick={overrideSubmit} className="w-full mt-3 border py-2 rounded-lg text-sm">Submit anyway</button>
              )}
            </div>
          )}

          <button onClick={() => askVoice(t('imStuck'))} className="w-full border-2 border-orange-300 text-orange-800 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
            <Mic className="w-5 h-5" /> {t('imStuck')}
          </button>
        </>
      ) : (
        <button onClick={checkout} className="w-full bg-green-600 text-white py-5 rounded-xl text-lg font-bold">
          {t('submitApproval')}
        </button>
      )}

      {guidance && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">{guidance}</div>
      )}

      <div className="flex gap-2">
        <input value={voiceText} onChange={(e) => setVoiceText(e.target.value)} placeholder={t('askQuestion')} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => askVoice(voiceText)} className="bg-orange-500 text-white px-4 rounded-lg"><Mic className="w-4 h-4" /></button>
      </div>

      <button onClick={() => navigate(`/worker/jobs/${id}/materials`)} className="w-full border py-3 rounded-xl text-sm">{t('materials')}</button>
    </div>
  );
}
