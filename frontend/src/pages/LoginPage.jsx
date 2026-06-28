import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleRedirects = {
  citizen: '/',
  authority: '/dashboard',
  supervisor: '/dashboard',
  worker: '/worker/jobs',
  ngo: '/dashboard',
  school_reporter: '/',
  admin: '/dashboard',
};

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let user;
      if (mode === 'login') {
        user = await login(form.email, form.password);
      } else {
        user = await register(form);
      }
      navigate(roleRedirects[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 pb-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{mode === 'login' ? 'Login' : 'Register'}</h1>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="w-full border rounded-lg px-4 py-3"
            required
          />
        )}
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
          className="w-full border rounded-lg px-4 py-3"
          required
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Password"
          className="w-full border rounded-lg px-4 py-3"
          required
        />
        {mode === 'register' && (
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded-lg px-4 py-3"
          >
            <option value="citizen">Citizen</option>
            <option value="authority">Authority</option>
            <option value="school_reporter">School Reporter</option>
            <option value="ngo">NGO</option>
          </select>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold">
          {mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-4 text-emerald-700 text-sm">
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
      </button>

      <div className="mt-8 p-4 bg-slate-100 rounded-xl text-sm text-slate-600">
        <p className="font-semibold mb-2">Demo accounts (password: password123)</p>
        <p>demo@communityhero.in — Citizen</p>
        <p>roads@mumbai.gov.in — Authority (Roads)</p>
        <p>worker.roads@nagarseva.in — Worker</p>
      </div>

      <Link to="/worker/login" className="block text-center mt-3 text-orange-700 text-sm font-medium">
        Worker login →
      </Link>

      <Link to="/report/anonymous" className="block text-center mt-2 text-purple-700 text-sm">
        Report anonymously without login →
      </Link>
    </div>
  );
}
