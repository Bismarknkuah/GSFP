import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Landmark, Shield, Globe, Users, School, MapPin, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const QUICK = [
  { u:'ceo',             p:'ceo123',      label:'CEO',               sub:'Chief Executive Officer',         color:'#1a0a00', border:'rgba(201,136,44,0.5)' },
  { u:'natdirector',     p:'natdir123',   label:'National Director', sub:'Nat. Coordinating Director',      color:'#1a0a00', border:'rgba(201,136,44,0.5)' },
  { u:'superadmin',      p:'super123',    label:'Super Admin',       sub:'System Administrator',            color:'#0d1e3d', border:'rgba(99,130,201,0.35)' },
  { u:'nationaladmin',   p:'natadm123',   label:'National Admin',    sub:'National Administrator',          color:'#0d1e3d', border:'rgba(99,130,201,0.35)' },
  { u:'nationalfin',     p:'natfin123',   label:'National Finance',  sub:'National Finance Officer',        color:'#0d1e3d', border:'rgba(99,130,201,0.35)' },
  { u:'nationalauditor', p:'nataud123',   label:'National Auditor',  sub:'National Auditor',                color:'#0d1e3d', border:'rgba(99,130,201,0.35)' },
  { u:'nationalmon',     p:'natmon123',   label:'National M&E',      sub:'National Monitoring Officer',     color:'#0d1e3d', border:'rgba(99,130,201,0.35)' },
  { u:'regionalmin',     p:'regmin123',   label:'Regional Minister', sub:'Regional Minister',               color:'#1a0d2e', border:'rgba(139,92,246,0.35)' },
  { u:'regionalcoo',     p:'regcoo123',   label:'Regional Coord.',   sub:'Regional Feeding Coordinator',    color:'#1a0d2e', border:'rgba(139,92,246,0.35)' },
  { u:'regionalfin',     p:'regfin123',   label:'Regional Finance',  sub:'Regional Finance Officer',        color:'#1a0d2e', border:'rgba(139,92,246,0.35)' },
  { u:'regionalauditor', p:'regaud123',   label:'Regional Auditor',  sub:'Regional Auditor',                color:'#1a0d2e', border:'rgba(139,92,246,0.35)' },
  { u:'regionalmon',     p:'regmon123',   label:'Regional M&E',      sub:'Regional Monitoring Officer',     color:'#1a0d2e', border:'rgba(139,92,246,0.35)' },
  { u:'director',        p:'dir123',      label:'District Director', sub:'District Director',               color:'#071a0e', border:'rgba(52,211,153,0.3)'  },
  { u:'dce1',            p:'dce123',      label:'DCE',               sub:'District Chief Executive',        color:'#071a0e', border:'rgba(52,211,153,0.3)'  },
  { u:'coordinator',     p:'coord123',    label:'DFC',               sub:'District Feeding Coordinator',    color:'#071a0e', border:'rgba(52,211,153,0.3)'  },
  { u:'financeofficer',  p:'fin123',      label:'Finance Officer',   sub:'Finance Officer',                 color:'#071a0e', border:'rgba(52,211,153,0.3)'  },
  { u:'auditor1',        p:'aud123',      label:'District Auditor',  sub:'District Auditor',                color:'#071a0e', border:'rgba(52,211,153,0.3)'  },
  { u:'distmon1',        p:'distmon123',  label:'District M&E',      sub:'M&E Officer',                     color:'#071a0e', border:'rgba(52,211,153,0.3)'  },
  { u:'head1',           p:'head123',     label:'Headmaster',        sub:'School Headmaster',               color:'#001a1f', border:'rgba(45,212,191,0.3)'  },
  { u:'caterer1',        p:'cat123',      label:'Caterer',           sub:'School Caterer',                  color:'#001a1f', border:'rgba(45,212,191,0.3)'  },
];

const TIERS = [
  { label:'Executive', color:'rgba(201,136,44,1)'  },
  { label:'National',  color:'rgba(99,130,201,1)'  },
  { label:'Regional',  color:'rgba(139,92,246,1)'  },
  { label:'District',  color:'rgba(52,211,153,1)'  },
  { label:'School',    color:'rgba(45,212,191,1)'  },
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
    try   { await login(u || username, p || password); }
    catch (e) { setErr(e.message || 'Invalid credentials — please try again'); }
    finally   { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* ══════════ LEFT — DEEP FOREST GREEN ══════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 overflow-hidden"
        style={{background:'#0d3321'}}>

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{backgroundImage:'radial-gradient(circle at 1.5px 1.5px,#ffffff 1px,transparent 0)',backgroundSize:'30px 30px'}}/>

        {/* Gold glow top-right */}
        <div className="absolute top-[-80px] right-[-60px] w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle,rgba(201,136,44,0.07),transparent 65%)'}}/>
        {/* Green glow bottom-left */}
        <div className="absolute bottom-[-60px] left-[-40px] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle,rgba(34,197,94,0.05),transparent 65%)'}}/>

        {/* Ghana flag stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px] flex z-10">
          <div className="flex-1" style={{background:'#EF3340'}}/>
          <div className="flex-1" style={{background:'#FCD116'}}/>
          <div className="flex-1" style={{background:'#006B3F'}}/>
        </div>

        {/* ── TOP CONTENT ── */}
        <div className="relative z-10">

          {/* Logo row */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{background:'linear-gradient(135deg,#C9882C,#a36820)',boxShadow:'0 0 28px rgba(201,136,44,0.28)'}}>
              <Landmark className="w-7 h-7 text-white"/>
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[0.4em] uppercase mb-0.5"
                style={{color:'rgba(201,136,44,0.7)'}}>Republic of Ghana</div>
              <div className="text-sm font-semibold text-white/90">Ministry of Local Government</div>
              <div className="text-xs text-white/40">& Rural Development</div>
            </div>
          </div>

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 border"
            style={{background:'rgba(255,255,255,0.12)',borderColor:'rgba(255,255,255,0.4)'}}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#ffffff"}}/>
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{color:"#ffffff"}}>Live System</span>
          </div>

          {/* Main title */}
          <div className="mb-6">
            <h1 className="font-serif font-bold leading-[1.08]">
              <span className="block text-5xl" style={{color:'#ffffff'}}>Ghana School</span>
              <span className="block text-5xl font-bold"
                style={{color:'#C9882C', textShadow:'0 0 40px rgba(201,136,44,0.35)'}}>Feeding</span>
              <span className="block text-5xl" style={{color:'#ffffff'}}>Programme</span>
            </h1>
          </div>

          <p className="text-sm leading-relaxed max-w-[400px] mb-2 text-white/40">
            National District Management System v2 — connecting caterers, headmasters,
            district coordinators, regional officials, and national administrators across
            all <span style={{color:'#C9882C', fontWeight:600}}>16 regions</span> of Ghana.
          </p>

          {/* Gold divider */}
          <div className="flex items-center gap-3 my-8">
            <div className="h-px flex-1"
              style={{background:'linear-gradient(90deg,transparent,rgba(201,136,44,0.45),transparent)'}}/>
            <div className="w-1.5 h-1.5 rounded-full" style={{background:'#C9882C'}}/>
            <div className="h-px flex-1"
              style={{background:'linear-gradient(90deg,transparent,rgba(201,136,44,0.45),transparent)'}}/>
          </div>

          {/* Statistics — 4 cards including students */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon:MapPin,        value:'16',       label:'Regions',  sub:'All Ghana' },
              { icon:Users,         value:'261',      label:'Districts',sub:'Nationwide' },
              { icon:School,        value:'45K+',     label:'Schools',  sub:'Enrolled' },
              { icon:GraduationCap, value:'1.2M+',    label:'Students', sub:'Fed Daily' },
            ].map(({icon:Icon,value,label,sub})=>(
              <div key={label} className="rounded-2xl p-4 border flex items-center gap-3"
                style={{background:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.07)'}}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background:'rgba(201,136,44,0.12)'}}>
                  <Icon className="w-4 h-4" style={{color:'#C9882C'}}/>
                </div>
                <div>
                  <div className="text-lg font-bold font-serif leading-none" style={{color:'#C9882C'}}>{value}</div>
                  <div className="text-[11px] font-semibold text-white/80 mt-0.5">{label}</div>
                  <div className="text-[9px] text-white/30">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM ── */}
        <div className="relative z-10">
          <div className="rounded-2xl p-4 mb-5 border"
            style={{background:'rgba(201,136,44,0.07)',borderColor:'rgba(201,136,44,0.18)'}}>
            <div className="text-[10px] font-bold tracking-widest uppercase mb-1.5"
              style={{color:'rgba(201,136,44,0.75)'}}>🔐 Demo Access Available</div>
            <p className="text-xs text-white/35 leading-relaxed">
              Use the Quick Demo panel on the right to sign in as any of the
              <span style={{color:'#C9882C', fontWeight:600}}> 20 user roles</span> — from CEO to School Caterer.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-700"/>
              <span className="text-[10px] text-white/25">256-bit Encrypted</span>
            </div>
            <span className="text-[10px] text-white/20">Desward Technology · GSFP v2.0</span>
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT — CREAM / OFF-WHITE ══════════ */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12 overflow-y-auto"
        style={{background:'#faf7f2'}}>
        <div className="max-w-[400px] w-full mx-auto">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:'linear-gradient(135deg,#C9882C,#a36820)'}}>
              <Landmark className="w-5 h-5 text-white"/>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest" style={{color:'#C9882C'}}>Republic of Ghana</div>
              <div className="text-sm font-bold text-gray-800">School Feeding Programme</div>
            </div>
          </div>

          {/* Coat of arms / seal placeholder */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-4"
              style={{background:'linear-gradient(135deg,#0f3320,#0a2016)',borderColor:'rgba(201,136,44,0.4)',
                boxShadow:'0 4px 20px rgba(201,136,44,0.15)'}}>
              <Landmark className="w-7 h-7" style={{color:'#C9882C'}}/>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold text-gray-800 mb-1">
              Welcome <span style={{color:'#C9882C'}}>back</span>
            </h2>
            <p className="text-sm text-gray-500">Sign in to access your dashboard</p>
          </div>

          {/* Error */}
          {err && (
            <div className="mb-5 p-3.5 rounded-xl flex items-center gap-2.5 text-sm border"
              style={{background:'rgba(192,57,43,0.06)',borderColor:'rgba(192,57,43,0.25)',color:'#c0392b'}}>
              <AlertCircle className="w-4 h-4 flex-shrink-0"/>
              {err}
            </div>
          )}

          {/* Username */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs font-bold tracking-widest uppercase block mb-2 text-gray-500">
                Username
              </label>
              <input value={username} onChange={e=>setU(e.target.value)}
                placeholder="Enter your username"
                onKeyDown={e=>e.key==='Enter'&&doLogin()}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{background:'#ffffff',border:'1.5px solid #e5e0d8',color:'#1a1a1a'}}
                onFocus={e=>{e.target.style.borderColor='#C9882C';e.target.style.boxShadow='0 0 0 3px rgba(201,136,44,0.12)';}}
                onBlur={e=>{e.target.style.borderColor='#e5e0d8';e.target.style.boxShadow='none';}}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold tracking-widest uppercase block mb-2 text-gray-500">
                Password
              </label>
              <div className="relative">
                <input value={password} onChange={e=>setP(e.target.value)}
                  type={show?'text':'password'}
                  placeholder="Enter your password"
                  onKeyDown={e=>e.key==='Enter'&&doLogin()}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                  style={{background:'#ffffff',border:'1.5px solid #e5e0d8',color:'#1a1a1a'}}
                  onFocus={e=>{e.target.style.borderColor='#C9882C';e.target.style.boxShadow='0 0 0 3px rgba(201,136,44,0.12)';}}
                  onBlur={e=>{e.target.style.borderColor='#e5e0d8';e.target.style.boxShadow='none';}}
                />
                <button type="button" onClick={()=>setShow(s=>!s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <a href="#" className="text-xs transition-colors hover:underline"
                  style={{color:'#C9882C'}}>Forgot password?</a>
              </div>
            </div>
          </div>

          {/* Sign in button */}
          <button onClick={()=>doLogin()} disabled={busy||!username||!password}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed mb-6 relative overflow-hidden group"
            style={{background:'linear-gradient(135deg,#0f3320,#15493B)',
              boxShadow:'0 4px 16px rgba(15,51,32,0.3)'}}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{background:'linear-gradient(135deg,#15493B,#1a6b4a)'}}/>
            <span className="relative tracking-wide">
              {busy ? 'Signing in…' : 'Sign in →'}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200"/>
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
              Quick Demo Access
            </span>
            <div className="flex-1 h-px bg-gray-200"/>
          </div>

          {/* Tier legend */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {TIERS.map(t=>(
              <div key={t.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:t.color}}/>
                <span className="text-[10px] text-gray-400">{t.label}</span>
              </div>
            ))}
          </div>

          {/* Quick access buttons */}
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5"
            style={{scrollbarWidth:'thin',scrollbarColor:'#e5e0d8 transparent'}}>
            {QUICK.map(q=>(
              <button key={q.u} onClick={()=>doLogin(q.u,q.p)} disabled={busy}
                className="text-left rounded-xl px-3 py-2.5 transition-all hover:opacity-90 hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-30"
                style={{background:q.color,border:`1px solid ${q.border}`,
                  boxShadow:'0 2px 6px rgba(0,0,0,0.2)'}}>
                <div className="text-[11px] font-bold text-white leading-tight">{q.label}</div>
                <div className="text-[9px] mt-0.5 font-mono" style={{color:'rgba(255,255,255,0.4)'}}>{q.u}</div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-7 pt-5 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              <span className="font-semibold" style={{color:'#C9882C'}}>GSFP</span> National Management System v2.0 ·
              Ministry of Local Government · Republic of Ghana<br/>
              Developed by <span className="font-semibold" style={{color:'#C9882C'}}>Desward Technology</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}