import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export const setToken = (token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

export const getToken = () => localStorage.getItem('token');

export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export const severityColor = (severity) => ({
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}[severity] || 'bg-gray-500');

export const categoryLabel = (cat) =>
  ({ pothole: 'Pothole', water_leakage: 'Water', streetlight: 'Streetlight', waste: 'Waste', road_damage: 'Road Damage', other: 'Other' }[cat] || cat);

export const statusSteps = ['open', 'verified', 'in_progress', 'resolved'];

const FRONTEND_CATEGORY_IMAGES = {
  pothole: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  water_leakage: 'https://images.unsplash.com/photo-1542013936693-8c463f88e0b0?auto=format&fit=crop&w=800&q=80',
  streetlight: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  waste: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
  road_damage: 'https://images.unsplash.com/photo-1584463623578-3b3b44b82fc6?auto=format&fit=crop&w=800&q=80',
  other: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=800&q=80',
};

export const getIssueImage = (photoUrl, category) => {
  if (!photoUrl || photoUrl.includes('picsum.photos') || photoUrl.includes('localhost') || photoUrl.includes('uploads')) {
    return FRONTEND_CATEGORY_IMAGES[category] || FRONTEND_CATEGORY_IMAGES.other;
  }
  return photoUrl;
};

export const handleImageError = (e, category) => {
  const fallback = FRONTEND_CATEGORY_IMAGES[category] || FRONTEND_CATEGORY_IMAGES.other;
  if (e.target.src !== fallback) {
    e.target.src = fallback;
  }
};
