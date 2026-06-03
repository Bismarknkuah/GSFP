import { useState } from 'react';
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

export default function ForgotPassword({ onBack }) {
  const [username, setUsername] = useState('');
  const [name,     setName]     = useState('');
  const [result,   setResult]   = useState(null);
  const [err,      setErr]      = useState(null);
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(null); setResult(null);
    try { const r = await api.password.forgot(username, name); setResult(r); }
    catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft className="w-4 h-4"/>Back to sign in
      </button>
      <div className="mb-6">
        <div className="w-12 h-12 bg-forest/10 rounded-2xl flex items-center justify-center mb-4"><Lock className="w-6 h-6 text-forest"/></div>
        <h2 className="font-serif text-2xl font-semibold text-ink">Forgot password?</h2>
        <p className="text-stone-500 text-sm mt-1">Enter your username and full name to verify your identity.</p>
      </div>

      {!result ? (
        <form onSubmit={submit} className="space-y-4">
          {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
          <div>
            <label className="text-xs font-medium text-stone-600 mb-1.5 block">Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} required placeholder="Your username"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 bg-white"/>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 mb-1.5 block">Full name (as registered)</label>
            <input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your full name"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 bg-white"/>
          </div>
          <button type="submit" disabled={loading||!username||!name}
            className="w-full py-3 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 disabled:opacity-50 transition-all">
            {loading?'Verifying...':'Verify identity'}
          </button>
        </form>
      ) : (
        <div className="bg-emerald/10 border border-emerald/20 rounded-xl p-5">
          <CheckCircle2 className="w-8 h-8 text-emerald mb-3"/>
          <h3 className="font-semibold text-ink mb-2">Identity Verified</h3>
          <p className="text-sm text-stone-600">Your identity has been confirmed. To reset your password, please contact your:</p>
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-forest"/>District Feeding Coordinator</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-forest"/>Regional Coordinator</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-forest"/>System Administrator</li>
          </ul>
          <p className="mt-3 text-xs text-stone-400">They can reset your password from the User Management panel.</p>
          <button onClick={onBack} className="mt-4 text-sm text-forest font-medium hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3 h-3"/>Return to login
          </button>
        </div>
      )}
    </div>
  );
}
