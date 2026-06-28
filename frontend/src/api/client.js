import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

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
