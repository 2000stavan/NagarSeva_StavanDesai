import { useState } from 'react';
import { Link } from 'react-router-dom';
import MapView from '../components/MapView';
import { useTranslation } from '../context/LanguageContext';
import { PlusCircle, Map as MapIcon, Flame } from 'lucide-react';

const CATEGORIES = ['', 'pothole', 'water_leakage', 'streetlight', 'waste', 'road_damage', 'other'];
const STATUSES = ['', 'open', 'verified', 'in_progress'];

export default function HomePage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('standard');
  const [filters, setFilters] = useState({ category: '', status: '' });

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap gap-2 pointer-events-none">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="bg-white rounded-lg px-3 py-2 text-sm shadow border border-slate-200 pointer-events-auto"
        >
          <option value="">{t('allCategories')}</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="bg-white rounded-lg px-3 py-2 text-sm shadow border border-slate-200 pointer-events-auto"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <div className="flex bg-white rounded-lg shadow border border-slate-200 overflow-hidden pointer-events-auto">
          <button
            onClick={() => setViewMode('standard')}
            className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === 'standard' ? 'bg-emerald-100 text-emerald-800' : ''}`}
          >
            <MapIcon className="w-4 h-4" /> {t('standard')}
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === 'heatmap' ? 'bg-red-100 text-red-800' : ''}`}
          >
            <Flame className="w-4 h-4" /> {t('agingHeatmap')}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <MapView viewMode={viewMode} filters={filters} />
      </div>

      <Link
        to="/report"
        className="absolute bottom-4 right-4 z-[1000] bg-emerald-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-emerald-500 font-semibold"
      >
        <PlusCircle className="w-5 h-5" />
        {t('reportIssue')}
      </Link>
    </div>
  );
}
