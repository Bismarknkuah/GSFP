import { useState } from 'react';
import { Settings, Trash2, AlertTriangle, RefreshCw, Shield, CheckCircle2, Database, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { fmtDateTime } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

const RESET_OPTIONS = [
  { id:'reports',          label:'Reports Only',        desc:'Delete all feeding reports only. Users, schools, payments are kept.', color:'amber', icon:'📋' },
  { id:'payments',         label:'Payments Only',        desc:'Delete all payment records only. Users, schools, reports are kept.', color:'amber', icon:'💰' },
  { id:'reports_payments', label:'Reports & Payments',   desc:'Delete all reports and payments. Users and schools kept intact.',    color:'rust',  icon:'🗃️' },
  { id:'all',              label:'Full System Reset',    desc:'Delete ALL data — reports, payments, users, schools, regions. Returns to a completely empty state.', color:'rust', icon:'⚠️' },
];

export default function SystemConfig() {
  const { user } = useAuth();
  const [resetModal,   setResetModal]   = useState(null);
  const [confirmText,  setConfirmText]  = useState('');
  const [busy,         setBusy]         = useState(false);
  const [ok,           setOk]           = useState(null);
  const [err,          setErr]          = useState(null);
  const [actionLog,    setActionLog]    = useState([]);

  if (user.role !== 'super_admin') return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Lock className="w-12 h-12 text-stone-300"/>
      <p className="font-semibold text-stone-500">Super Admin access required</p>
      <p className="text-sm text-stone-400">Only the Super Administrator can access system configuration.</p>
    </div>
  );

  const authHeader = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` };

  const doReset = async () => {
    if (confirmText !== 'RESET CONFIRMED') { setErr('Type exactly: RESET CONFIRMED'); return; }
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/system/reset`, { method:'POST', headers:authHeader, body:JSON.stringify({ scope:resetModal.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Reset failed');
      const summary = data.deleted ? Object.entries(data.deleted).map(([k,v])=>`${v} ${k}`).join(', ')+' deleted.' : 'Complete.';
      setOk(`✓ ${resetModal.label} completed. ${summary}`);
      setActionLog(l=>[{ action:`Reset: ${resetModal.label}`, by:user.name, at:new Date().toISOString() },...l.slice(0,9)]);
      setResetModal(null); setConfirmText('');
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doReseed = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const res  = await fetch(`${BASE}/api/system/reseed`, { method:'POST', headers:authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Reseed failed');
      setOk(`✓ Demo data loaded: ${data.summary||'34 users, 8 schools, 30 days of reports, payments'}`);
      setActionLog(l=>[{ action:'Reseed with demo data', by:user.name, at:new Date().toISOString() },...l.slice(0,9)]);
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#0d1117 0%,#1F2937 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><Settings className="w-4 h-4 text-amber"/><span className="text-[10px] font-bold tracking-widest text-amber/70 uppercase">System Administration</span></div>
          <h1 className="font-serif text-2xl font-bold text-white">System Configuration</h1>
          <p className="text-white/50 text-sm mt-1">{user.name} · Super Administrator</p>
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0"/>{err}</div>}

      <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rust flex-shrink-0 mt-0.5"/>
        <div><p className="font-bold text-rust">Danger Zone — Irreversible Actions</p>
          <p className="text-sm text-stone-600 mt-0.5">These operations permanently delete data from the production database. There is no undo. Ensure you have a backup before proceeding.</p>
        </div>
      </div>

      <Card>
        <h3 className="font-semibold text-ink mb-1 flex items-center gap-2"><Trash2 className="w-4 h-4 text-rust"/>Data Reset Options</h3>
        <p className="text-xs text-stone-400 mb-4">Select what to delete. All require typing a confirmation phrase.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {RESET_OPTIONS.map(opt=>(
            <div key={opt.id} className={`p-4 rounded-xl border-2 ${opt.color==='rust'?'border-rust/20 bg-rust/5':'border-amber/20 bg-amber/5'}`}>
              <div className="flex items-start justify-between gap-3">
                <div><div className="flex items-center gap-2 mb-1"><span className="text-xl">{opt.icon}</span><span className="font-bold text-ink">{opt.label}</span></div>
                  <p className="text-xs text-stone-500">{opt.desc}</p></div>
                <button onClick={()=>{ setResetModal(opt); setConfirmText(''); setErr(null); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold ${opt.color==='rust'?'bg-rust text-white hover:bg-rust/90':'bg-amber/90 text-white hover:bg-amber'}`}>
                  Reset</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-ink mb-1 flex items-center gap-2"><Database className="w-4 h-4 text-forest"/>Load Demo Data</h3>
        <p className="text-xs text-stone-400 mb-4">Wipe current data and reload fresh demo data — 34 users, 8 schools, 30 days of reports, payments, disbursements, FAQs.</p>
        <div className="flex items-center justify-between p-4 bg-forest/5 border border-forest/20 rounded-xl">
          <div><div className="font-semibold text-ink">Reseed Production Database</div>
            <div className="text-xs text-stone-400 mt-0.5">All current data will be replaced with demo data</div></div>
          <Button icon={RefreshCw} onClick={doReseed} disabled={busy} variant="secondary">{busy?'Loading...':'Load Demo Data'}</Button>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-ink mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-navy"/>System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['System','GSFP v2'],['Backend','Node.js + Express'],['Database','MongoDB Atlas'],['Frontend','React 18 + Vite']].map(([l,v])=>(
            <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink text-sm">{v}</div></div>
          ))}
        </div>
      </Card>

      {actionLog.length>0&&(
        <Card><h3 className="font-semibold text-ink mb-3">Recent Admin Actions</h3>
          <div className="space-y-2">
            {actionLog.map((l,i)=>(
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-stone-50 last:border-0">
                <span className="text-stone-600">{l.action}</span>
                <span className="text-xs text-stone-400">{l.by} · {fmtDateTime(l.at)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!resetModal} onClose={()=>{ setResetModal(null); setConfirmText(''); setErr(null); }} title={`Confirm: ${resetModal?.label}`} size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        {resetModal&&(
          <div className="space-y-4">
            <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-rust"/><span className="font-bold text-rust">This action CANNOT be undone</span></div>
              <p className="text-sm text-stone-600">{resetModal.desc}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-2">Type <strong className="font-mono text-rust">RESET CONFIRMED</strong> to proceed:</label>
              <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="RESET CONFIRMED"
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:border-rust tracking-wider"/>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>{ setResetModal(null); setConfirmText(''); }} disabled={busy}>Cancel</Button>
              <button onClick={doReset} disabled={busy||confirmText!=='RESET CONFIRMED'}
                className="px-4 py-2 bg-rust text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-rust/90 transition-all">
                {busy?'Resetting...':'Confirm Reset'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
