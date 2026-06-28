import { Link } from 'react-router-dom';
import { categoryLabel, severityColor, formatINR } from '../api/client';
import { ThumbsUp, Users, Clock } from 'lucide-react';

export default function IssueCard({ issue }) {
  return (
    <Link
      to={`/issues/${issue.id}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="flex gap-3 p-3">
        {issue.photo_url && (
          <img src={issue.photo_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${severityColor(issue.severity)}`} />
            <span className="text-xs font-medium text-slate-500">{categoryLabel(issue.category)}</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded capitalize">{issue.status}</span>
          </div>
          <h3 className="font-semibold text-slate-800 truncate">{issue.title}</h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{issue.days_open ?? 0}d open</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{issue.upvotes}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{issue.affected_count} affected</span>
          </div>
          {issue.estimated_cost && (
            <p className="text-xs text-emerald-700 mt-1">{formatINR(issue.estimated_cost)} est.</p>
          )}
        </div>
      </div>
    </Link>
  );
}
