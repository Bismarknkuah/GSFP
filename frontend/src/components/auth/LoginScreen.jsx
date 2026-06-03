import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Landmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const QUICK = [
  // ── Super Admin ───────────────────────────────────────────────
  { u:'superadmin',      p:'super123',    label:'Super Admin',           color:'bg-[#0f2d5e]' },
  // ── Executive  (Black + Gold) ─────────────────────────────────
  { u:'ceo',             p:'ceo123',      label:'CEO',                   color:'bg-[#1a1200] border-2 border-amber-400' },
  { u:'natdirector',     p:'natdir123',   label:'National Director',     color:'bg-[#1a1200] border-2 border-amber-400' },
  // ── National  (Deep Navy) ─────────────────────────────────────
  { u:'nationaladmin',   p:'natadm123',   label:'National Admin',        color:'bg-[#0f2d5e]' },
  { u:'nationalfin',     p:'natfin123',   label:'National Finance',      color:'bg-[#0f2d5e]' },
  { u:'nationalauditor', p:'nataud123',   label:'National Auditor',      color:'bg-[#0f2d5e]' },
  { u:'nationalmon',     p:'natmon123',   label:'National Monitoring',   color:'bg-[#0f2d5e]' },
  // ── Regional  (Rich Purple) ───────────────────────────────────
  { u:'regionalmin',     p:'regmin123',   label:'Regional Minister',     color:'bg-[#5b1fa8]' },
  { u:'regionalcoo',     p:'regcoo123',   label:'Regional Coord.',       color:'bg-[#5b1fa8]' },
  { u:'regionalauditor', p:'regaud123',   label:'Regional Auditor',      color:'bg-[#5b1fa8]' },
  { u:'regionalmon',     p:'regmon123',   label:'Regional Monitoring',   color:'bg-[#5b1fa8]' },
  // ── District  (Forest Green) ─────────────────────────────────
  { u:'director',        p:'dir123',      label:'District Director',     color:'bg-[#15493B]' },
  { u:'dce1',            p:'dce123',      label:'DCE',                   color:'bg-[#15493B]' },
  { u:'coordinator',     p:'coord123',    label:'DFC',                   color:'bg-[#15493B]' },
  { u:'financeofficer',  p:'fin123',      label:'Finance Officer',       color:'bg-[#15493B]' },
  { u:'auditor1',        p:'aud123',      label:'District Auditor',      color:'bg-[#15493B]' },
  { u:'distmon1',        p:'distmon123',  label:'District Monitoring',   color:'bg-[#15493B]' },
  // ── School  (Ocean Teal) ──────────────────────────────────────
  { u:'head1',           p:'head123',     label:'Headmaster',            color:'bg-[#0e6b7a]' },
  { u:'caterer1',        p:'cat123',      label:'Caterer',               color:'bg-[#0e6b7a]' },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setU]    = useState('');
  const [password, setP]    = useState('');
  const [show,     setShow] = useState(false);
  const [busy,     setBusy] = useState(false);
  const [err,      setErr]  = useState(null);

  const doLogin = async (u, p) => {
    setBusy(true); setErr(null);
    try { await login(u || username, p || password); }
    catch(e) { setErr(e.message || 'Invalid credentials'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12"
        style={{background:'linear-gradient(135deg,#0a2a14 0%,#15493B 50%,#1a6b4a 100%)'}}>
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'28px 28px'}}/>
        {/* Ghana flag stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="flex-1 bg-[#EF3340]"/><div className="flex-1 bg-[#FCD116]"/><div className="flex-1 bg-[#006B3F]"/>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg">
              <Landmark className="w-6 h-6 text-white"/>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-amber-400/70 uppercase">Republic of Ghana</div>
              <div className="text-sm font-bold text-white">Ministry of Local Government</div>
            </div>
          </div>
          <h1 className="font-serif text-5xl font-bold text-white leading-tight mb-4">
            Ghana School<br/>Feeding<br/>Programme
          </h1>
          <p className="text-white/50 text-lg max-w-md leading-relaxed">
            National District Management System — connecting caterers, headmasters, district coordinators, regional officials, and national administrators in one secure platform.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[['16','Regions'],['216+','Districts'],['4,000+','Schools']].map(([n,l])=>(
              <div key={l} className="bg-white/10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold font-serif text-amber-400">{n}</div>
                <div className="text-xs text-white/50 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-white/20 text-xs">
          GSFP National Management System v2.0 · Secured Platform
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center">
              <Landmark className="w-5 h-5 text-white"/>
            </div>
            <div>
              <div className="text-[10px] text-stone-400 uppercase tracking-widest">Republic of Ghana</div>
              <div className="text-sm font-bold text-ink">School Feeding Programme</div>
            </div>
          </div>

          <h2 className="font-serif text-3xl font-bold text-ink mb-1">Sign in</h2>
          <p className="text-stone-400 text-sm mb-6">Use your assigned credentials to access the system.</p>

          {err && (
            <div className="mb-4 p-3 bg-rust/10 border border-rust/20 rounded-xl flex items-center gap-2 text-rust text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0"/>{err}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Username</label>
              <input value={username} onChange={e=>setU(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 bg-white"
                onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Password</label>
              <div className="relative">
                <input value={password} onChange={e=>setP(e.target.value)} type={show?'text':'password'}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 bg-white pr-10"
                  onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
                <button type="button" onClick={()=>setShow(s=>!s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <a href="#" className="text-xs text-forest hover:underline">Forgot password?</a>
              </div>
            </div>
          </div>

          <button onClick={()=>doLogin()} disabled={busy||!username||!password}
            className="w-full py-3.5 bg-forest text-white font-semibold rounded-xl hover:bg-forest/90 disabled:opacity-40 transition-all text-sm mb-6">
            {busy ? 'Signing in...' : 'Sign in'}
          </button>

          {/* Quick demo access */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300 mb-3 text-center">Quick Demo Access</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {QUICK.map(q=>(
                <button key={q.u} onClick={()=>doLogin(q.u, q.p)} disabled={busy}
                  className={`${q.color} text-white rounded-xl px-3 py-2.5 text-left transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-40`}>
                  <div className="text-[11px] font-bold leading-tight">{q.label}</div>
                  <div className="text-[9px] opacity-50 mt-0.5">{q.u}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
