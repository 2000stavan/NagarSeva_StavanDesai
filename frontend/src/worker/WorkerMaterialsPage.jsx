import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useTranslation } from '../context/LanguageContext';

export default function WorkerMaterialsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get(`/worker/jobs/${id}`).then((r) => {
      setJob(r.data);
      const needed = r.data.step_plan?.materials_needed || [];
      setItems(needed.map((m) => ({ material_name: m, quantity: 0, unit: 'units' })));
    });
  }, [id]);

  const save = async () => {
    const used = items.filter((i) => i.quantity > 0);
    await api.post(`/worker/jobs/${id}/materials`, { materials: used });
    navigate(`/worker/jobs/${id}/active`);
  };

  if (!job) return null;

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold">{t('materialsUsed')}</h1>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center bg-white border rounded-xl p-3">
          <span className="flex-1 text-sm">{item.material_name}</span>
          <input type="number" min="0" value={item.quantity} onChange={(e) => {
            const next = [...items];
            next[i].quantity = parseFloat(e.target.value) || 0;
            setItems(next);
          }} className="w-20 border rounded-lg px-2 py-1 text-center" />
        </div>
      ))}
      <button onClick={save} className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold">{t('saveMaterials')}</button>
    </div>
  );
}
