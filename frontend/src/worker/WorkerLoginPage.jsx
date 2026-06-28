import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LANGS, setLang, getLang, t } from '../worker/i18n';

export default function WorkerLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [lang, setLangState] = useState(getLang());
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(form.email, form.password);
      if (user.role !== 'worker') {
        setError('Worker account required');
        return;
      }
      navigate('/worker/jobs');
    } catch {
      setError('Login failed');
    }
  };

  return (
    <div className="min-h-full bg-orange-50 p-6 flex flex-col justify-center">
      <h1 className="text-2xl font-bold text-orange-800 text-center mb-2">NagarSeva Worker</h1>
      <p className="text-center text-slate-600 mb-6 text-sm">Field worker login</p>

      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => { setLang(l.code); setLangState(l.code); }}
            className={`px-3 py-2 rounded-lg text-sm ${lang === l.code ? 'bg-orange-600 text-white' : 'bg-white border'}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4 max-w-sm mx-auto w-full">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded-xl px-4 py-4 text-lg"
          required
        />
        <input
          type="password"
          placeholder={t(lang, 'password')}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded-xl px-4 py-4 text-lg"
          required
        />
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-xl text-lg font-bold">
          {t(lang, 'login')}
        </button>
      </form>

      <p className="text-xs text-center text-slate-500 mt-6">
        Demo: worker.roads1@nagarseva.in / password123
      </p>
    </div>
  );
}
