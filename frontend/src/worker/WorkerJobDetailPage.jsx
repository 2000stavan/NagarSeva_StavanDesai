import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import api, { getIssueImage, handleImageError } from '../api/client';
import { useTranslation } from '../context/LanguageContext';
import { MapPin, Navigation, Shield, Wrench } from 'lucide-react';

export default function WorkerJobDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    api.get(`/worker/jobs/${id}`).then((r) => setJob(r.data));
  }, [id]);

  const checkIn = () => {
    setCheckingIn(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post(`/worker/jobs/${id}/checkin`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          navigate(`/worker/jobs/${id}/active`);
        } catch (err) {
          if (err.response?.status === 422) {
            const reason = prompt(`You are ${err.response.data.distance_m}m away. Enter reason to override:`);
            if (reason) {
              await api.post(`/worker/jobs/${id}/checkin`, {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                override_reason: reason,
              });
              navigate(`/worker/jobs/${id}/active`);
            }
          } else alert(err.response?.data?.error || t('checkInFailed'));
        }
        setCheckingIn(false);
      },
      () => { alert(t('gpsRequired')); setCheckingIn(false); }
    );
  };

  if (!job) return <div className="p-8 text-center">{t('loading')}</div>;

  const steps = job.step_plan?.steps || [];
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;

  return (
    <div className="p-4 space-y-4 pb-24">
      <img
        src={getIssueImage(job.photo_url, job.category)}
        onError={(e) => handleImageError(e, job.category)}
        alt=""
        className="w-full h-40 object-cover rounded-xl"
      />
      <div>
        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded capitalize">{job.category?.replace('_', ' ')}</span>
        <h1 className="text-xl font-bold mt-2">{job.title}</h1>
        <p className="text-sm text-slate-600 mt-1">{job.description}</p>
        <p className="text-sm flex items-center gap-1 mt-2 text-slate-500"><MapPin className="w-4 h-4" />{job.location_name}</p>
      </div>

      <div className="h-36 rounded-xl overflow-hidden">
        <MapContainer center={[job.latitude, job.longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[job.latitude, job.longitude]} />
        </MapContainer>
      </div>

      <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold">
        <Navigation className="w-5 h-5" /> {t('navigate')}
      </a>

      {job.step_plan?.safety_equipment?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="font-semibold text-amber-900 flex items-center gap-2"><Shield className="w-4 h-4" /> {t('safety')}</p>
          <p className="text-sm text-amber-800">{job.step_plan.safety_equipment.join(', ')}</p>
        </div>
      )}

      <div>
        <p className="font-semibold flex items-center gap-2 mb-2"><Wrench className="w-4 h-4" /> {t('steps')} ({steps.length})</p>
        {steps.map((s) => (
          <div key={s.step_number} className="bg-white border rounded-lg p-3 mb-2 text-sm">
            <p className="font-medium">{s.step_number}. {s.label}</p>
            <p className="text-slate-600">{s.instruction}</p>
          </div>
        ))}
      </div>

      {job.status === 'pending_approval' ? (
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-center font-medium">{t('awaitingApproval')}</div>
      ) : job.status === 'in_progress' || job.checkin_time ? (
        <Link to={`/worker/jobs/${id}/active`} className="block bg-orange-600 text-white py-4 rounded-xl text-center text-lg font-bold">
          {t('continueJob')}
        </Link>
      ) : (
        <button onClick={checkIn} disabled={checkingIn} className="w-full bg-orange-600 text-white py-4 rounded-xl text-lg font-bold disabled:opacity-50">
          {checkingIn ? '...' : t('checkIn')}
        </button>
      )}
    </div>
  );
}
