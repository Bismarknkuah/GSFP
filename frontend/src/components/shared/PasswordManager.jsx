import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Key, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PageHeader from '../ui/PageHeader';

export default function PasswordManager() {
  const { user } = useAuth();
  const [cur,  setCur]   = useState('');
  const [nw,   setNw]    = useState('');
  const [conf, setConf]  = useState('');
  const [show, setShow]  = useState({cur:false,nw:false,conf:false});
  const [err,  setErr]   = useState(null);
  const [ok,   setOk]    = useState(null);
  const [busy, setBusy]  = useState(false);

  const toggle = k => setShow(s=>({...s,[k]:!s[k]}));

  const submit = async (e) => {
    e.preventDefault();
    if (nw.length < 6) { setErr('New password must be at least 6 characters'); return; }
    if (nw !== conf)   { setErr('New passwords do not match'); return; }
    setBusy(true); setErr(null);
    try {
      await api.password.change(cur, nw);
      setOk('Password changed successfully!');
      setCur(''); setNw(''); setConf('');
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const strength = (p) => {
    let s = 0;
    if (p.length >= 6)  s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p))s++;
    if (/[0-9]/.test(p))s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const pw_strength = strength(nw);
  const strengthLabel = ['','Weak','Fair','Good','Strong','Very Strong'][pw_strength];
  const strengthColor = ['','rust','amber','amber','emerald','emerald'][pw_strength];

  return (
    <>
      <PageHeader title="Change Password" subtitle="Keep your account secure by updating your password regularly."/>
      <div className="max-w-md">
        <Card>
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 bg-forest/10 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-forest"/>
            </div>
            <div>
              <div className="font-semibold text-ink">{user.name}</div>
              <div className="text-xs text-stone-400">@{user.username}</div>
            </div>
          </div>

          {ok && <div className="mb-4 p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
          {err && <div className="mb-4 p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">Current password <span className="text-rust">*</span></label>
              <div className="relative">
                <input type={show.cur?'text':'password'} value={cur} onChange={e=>setCur(e.target.value)} required
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-stone-300 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"/>
                <button type="button" onClick={()=>toggle('cur')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">{show.cur?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">New password <span className="text-rust">*</span></label>
              <div className="relative">
                <input type={show.nw?'text':'password'} value={nw} onChange={e=>setNw(e.target.value)} required
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-stone-300 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"/>
                <button type="button" onClick={()=>toggle('nw')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">{show.nw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
              </div>
              {nw.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i=><div key={i} className={`flex-1 h-1 rounded-full ${i<=pw_strength?`bg-${strengthColor}`:'bg-stone-200'}`}/>)}
                  </div>
                  <p className={`text-xs text-${strengthColor}`}>{strengthLabel}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">Confirm new password <span className="text-rust">*</span></label>
              <div className="relative">
                <input type={show.conf?'text':'password'} value={conf} onChange={e=>setConf(e.target.value)} required
                  className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-sm focus:outline-none focus:ring-2 ${conf&&conf!==nw?'border-rust focus:border-rust focus:ring-rust/15':'border-stone-300 focus:border-forest focus:ring-forest/15'}`}/>
                <button type="button" onClick={()=>toggle('conf')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">{show.conf?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
              </div>
              {conf && conf!==nw && <p className="text-xs text-rust mt-1">Passwords do not match</p>}
              {conf && conf===nw && nw.length>=6 && <p className="text-xs text-emerald mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Passwords match</p>}
            </div>

            <div className="bg-cream rounded-xl p-3 text-xs text-stone-500 space-y-1">
              <p className="font-medium text-stone-600">Password requirements:</p>
              {[['At least 6 characters',nw.length>=6],['One uppercase letter',/[A-Z]/.test(nw)],['One number',/[0-9]/.test(nw)]].map(([l,met])=>(
                <p key={l} className={`flex items-center gap-1.5 ${met?'text-emerald':'text-stone-400'}`}>
                  <CheckCircle2 className="w-3 h-3"/>{l}
                </p>
              ))}
            </div>

            <Button type="submit" disabled={busy||!cur||nw.length<6||nw!==conf} className="w-full" icon={Lock}>
              {busy?'Changing password...':'Change password'}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
