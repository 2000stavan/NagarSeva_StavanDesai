import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import api, { formatINR, categoryLabel } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Camera, MapPin, Loader2, AlertTriangle } from 'lucide-react';

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function ReportPage({ anonymous = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ai, setAi] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [position, setPosition] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', severity: '', isAnonymous: anonymous });
  const [duplicate, setDuplicate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setPosition([19.076, 72.877])
      );
    }
  }, []);

  const handlePhoto = async (file) => {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setClassifying(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data } = await api.post('/issues/classify', fd);
      setAi(data.ai);
      setPhotoUrl(data.photo_url);
      setForm((f) => ({
        ...f,
        title: data.ai.title,
        description: data.ai.description,
        category: data.ai.category,
        severity: data.ai.severity,
      }));
    } catch (err) {
      alert(err.response?.data?.error || 'AI classification failed. Check your API key and try again.');
      setClassifying(false);
      return;
    }
    setClassifying(false);
    setStep(2);
  };

  const submit = async (mergeWith = null, skipDuplicate = false) => {
    if (!photo || !position) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append('photo', photo);
    fd.append('latitude', position[0]);
    fd.append('longitude', position[1]);
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('severity', form.severity);
    fd.append('estimated_cost', ai?.estimated_cost_inr || 5000);
    if (mergeWith) fd.append('merge_with', mergeWith);
    if (skipDuplicate) fd.append('skip_duplicate_check', 'true');

    try {
      const endpoint = anonymous ? '/issues/anonymous' : '/issues';
      const { data, status } = await api.post(endpoint, fd);
      if (status === 409 && data.duplicate) {
        setDuplicate(data);
        setSubmitting(false);
        return;
      }
      navigate(`/issues/${data.issue?.id || data.issue.id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setDuplicate(err.response.data);
      } else {
        alert(err.response?.data?.error || 'Failed to submit');
      }
    }
    setSubmitting(false);
  };

  if (anonymous) {
    return (
      <div className="max-w-lg mx-auto p-4 pb-6">
        <div className="bg-purple-100 text-purple-800 p-4 rounded-xl mb-4 text-center font-medium">
          🔒 Your identity is protected — anonymous reporting enabled
        </div>
        <ReportContent {...{ step, setStep, photo, preview, ai, classifying, position, setPosition, form, setForm, duplicate, setDuplicate, submitting, submit, handlePhoto, fileRef, photoUrl }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <p className="text-slate-600 mb-4">Please log in to report an issue.</p>
        <a href="/login" className="text-emerald-700 font-semibold">Login →</a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Report an Issue</h1>
      <ReportContent {...{ step, setStep, photo, preview, ai, classifying, position, setPosition, form, setForm, duplicate, setDuplicate, submitting, submit, handlePhoto, fileRef, photoUrl }} />
    </div>
  );
}

function ReportContent({ step, setStep, preview, ai, classifying, position, setPosition, form, setForm, duplicate, setDuplicate, submitting, submit, handlePhoto, fileRef }) {
  return (
    <>
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-slate-600">Step 1: Upload a photo of the issue</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files[0] && handlePhoto(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-emerald-300 rounded-xl p-12 flex flex-col items-center gap-3 hover:bg-emerald-50"
          >
            <Camera className="w-12 h-12 text-emerald-600" />
            <span className="font-medium text-emerald-700">Take or upload photo</span>
          </button>
          {classifying && (
            <div className="flex items-center gap-2 text-emerald-700">
              <Loader2 className="w-5 h-5 animate-spin" /> AI analyzing image...
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-slate-600">Step 2: Review AI classification</p>
          {preview && <img src={preview} alt="" className="rounded-xl w-full h-48 object-cover" />}
          {ai && (
            <div className="border rounded-xl p-4 space-y-3 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-emerald-800">
                  🤖 AI Classification
                </p>
                <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">Verify & Edit</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={form.category || ai.category || 'other'}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pothole">Pothole</option>
                    <option value="waste">Waste / Garbage</option>
                    <option value="water_leakage">Water Leakage</option>
                    <option value="streetlight">Streetlight</option>
                    <option value="road_damage">Road Damage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Severity</label>
                  <select
                    value={form.severity || ai.severity || 'medium'}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-sm font-medium text-slate-800 capitalize focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <p className="text-sm pt-1">Est. cost: <strong>{formatINR(ai.estimated_cost_inr)}</strong></p>
              <p className="text-xs text-slate-600">{ai.cost_reasoning}</p>
            </div>
          )}
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Title"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            placeholder="Description"
          />
          <button onClick={() => setStep(3)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold">
            Continue to location
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-slate-600 flex items-center gap-2"><MapPin className="w-4 h-4" /> Step 3: Confirm location (tap map to adjust)</p>
          <div className="h-64 rounded-xl overflow-hidden border">
            {position && (
              <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker position={position} setPosition={setPosition} />
              </MapContainer>
            )}
          </div>
          <button onClick={() => setStep(4)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold">
            Review & submit
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-slate-600">Step 4: Submit report</p>
          <div className="bg-white border rounded-xl p-4 space-y-2">
            <p><strong>{form.title}</strong></p>
            <p className="text-sm text-slate-600">{form.description}</p>
            <p className="text-sm">{categoryLabel(form.category)} · {form.severity}</p>
          </div>
          <button
            onClick={() => submit()}
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report (+10 pts)'}
          </button>
        </div>
      )}

      {duplicate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="text-center font-medium">{duplicate.message}</p>
            <p className="text-sm text-slate-600 text-center">"{duplicate.original?.title}"</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setDuplicate(null); submit(duplicate.original.id); }}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg"
              >
                Yes, add to it
              </button>
              <button
                onClick={() => { setDuplicate(null); submit(null, true); }}
                className="flex-1 border py-2 rounded-lg"
              >
                No, new issue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
