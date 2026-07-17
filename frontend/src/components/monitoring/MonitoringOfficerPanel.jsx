import { useEffect, useState, useCallback } from 'react';
import { Activity, Bell, Send, AlertTriangle, CheckCircle2, School, RefreshCw, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { fmtNum, fmtDate } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function MonitoringOfficerPanel() {
  const { user }   = useAuth();
  const [reports,  setRep]   = useState([]);
  const [schools,  setSch]   = useState([]);
  const [selSch,   setSel]   = useState(null);
  const [remModal, setRemModal] = useState(null);
  const [remMsg,   setRemMsg]   = useState('');
  const [busy,     setBusy]  = useState(false);
  const [ok,       setOk]    = useState(null);
  const [ts,       setTs]    = useState(null);

  const authH = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` };

  const load = useCallback(async()=>{
    const [r,s] = await Promise.allSettled([api.reports.list({limit:200}), api.schools.list()]);
    if(r.status==='fulfilled') setRep(r.value?.reports||[]);
    if(s.status==='fulfilled') setSch(s.value?.schools||[]);
    setTs(new Date().toLocaleTimeString('en-GH'));
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,60000); return()=>clearInterval(t); },[load]);

  const sendReminder = async () => {
    setBusy(true);
    try {
      await fetch(`${BASE}/api/payment-approval/remind`, { method:'POST', headers:authH,
        body:JSON.stringify({ caterer_id:remModal?.caterer_id||'all', message:remMsg||'Please submit your daily feeding report' }) });
      setOk(`Reminder sent to ${remModal?.caterer?.name||'all caterers'}`);
      setRemModal(null); setRemMsg('');
    } catch(e) { console.error(e); } finally { setBusy(false); }
  };

  const today       = new Date().toISOString().split('T')[0];
  const todayReps   = reports.filter(r=>r.date===today);
  const reportedIds = new Set(todayReps.map(r=>r.school_id));
  const missing     = schools.filter(s=>!reportedIds.has(s._id||s.id));
  const pending     = todayReps.filter(r=>r.status==='pending');
  const approved    = todayReps.filter(r=>r.status==='approved');
  const totReports  = reports.length;
  const compRate    = totReports>0?Math.round(reports.filter(r=>r.status==='approved').length/totReports*100):0;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#0e4429 0%,#07291a 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-emerald/70"/><span className="text-[10px] font-bold tracking-widest text-emerald/60 uppercase">District M&E Officer</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">Monitor feeding compliance · Send reminders · No approval authority</p>
          </div>
          <div className="flex gap-2">
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Bell} size="sm" onClick={()=>setRemModal({ caterer_id:'all', caterer:{ name:'All Caterers' } })}>
              Send Reminder
            </Button>
          </div>
        </div>
        {missing.length>0&&(
          <div className="relative z-10 mt-3 flex items-center gap-2 bg-rust/20 border border-rust/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-rust"/>
            <span className="text-sm text-rust font-medium">{missing.length} school{missing.length!==1?'s':''} not reported today</span>
            <button onClick={()=>setRemModal({ caterer_id:'missing', caterer:{ name:'Missing Schools' } })} className="ml-auto text-xs text-rust/70 underline">Send reminder to all</button>
          </div>
        )}
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Schools"         value={fmtNum(schools.length)}   icon={School}       tone="forest"/>
        <KPI label="Reported Today"  value={fmtNum(todayReps.length)} icon={CheckCircle2} tone={todayReps.length===schools.length?'emerald':'amber'}/>
        <KPI label="Not Reported"    value={fmtNum(missing.length)}   icon={AlertTriangle} tone={missing.length>0?'rust':'emerald'}/>
        <KPI label="Compliance"      value={`${compRate}%`}           icon={Activity}     tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
      </div>

      {/* Read-only notice */}
      <div className="p-3 bg-navy/5 border border-navy/15 rounded-xl flex items-center gap-2 text-xs text-navy font-medium">
        ⓘ As M&E Officer you can monitor, view and send reminders — but cannot approve or reject caterer reports. Report approval is done by the Headmaster.
      </div>

      {/* Live school grid */}
      <Card>
        <h3 className="font-semibold text-ink mb-4">Live School Status Today</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {schools.map(s=>{
            const rep = todayReps.find(r=>r.school_id===(s._id||s.id));
            return (
              <div key={s._id||s.id} onClick={()=>setSel(s)}
                className={`p-3 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-all ${rep?.status==='approved'?'border-emerald/30 bg-emerald/5':rep?'border-amber/30 bg-amber/5':'border-rust/20 bg-rust/5'}`}>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-semibold text-ink leading-tight">{s.name}</span>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-1 ${rep?.status==='approved'?'bg-emerald animate-pulse':rep?'bg-amber animate-pulse':'bg-rust'}`}/>
                </div>
                <div className="text-xs text-stone-400 mb-2">{s.town} · {fmtNum(s.enrolled)} pupils</div>
                {rep?<div className={`text-xs font-medium ${rep.status==='approved'?'text-emerald':'text-amber'}`}>{rep.status==='approved'?`✓ ${fmtNum(rep.students_fed)} fed`:'⏳ Pending headmaster'}</div>
                    :<div className="text-xs font-medium text-rust">✗ Not reported</div>}
                {!rep&&(
                  <button onClick={e=>{ e.stopPropagation(); setRemModal({ caterer_id:s.caterer_id, caterer:{ name:s.caterer?.name||'Caterer' } }); }}
                    className="mt-2 w-full text-[10px] bg-amber/10 text-amber rounded-lg px-2 py-1 font-semibold hover:bg-amber/20">
                    <Bell className="w-3 h-3 inline mr-1"/>Send Reminder
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent reports — READ ONLY, no action buttons */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">Recent Reports — Read Only View</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">School</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Pupils Fed</th><th className="text-center px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {reports.slice(0,20).map(r=>(
                <tr key={r._id||r.id} className="hover:bg-paper">
                  <td className="px-4 py-2.5 text-xs text-stone-500">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5 text-xs text-ink">{r.school?.name||'—'}</td>
                  <td className="px-4 py-2.5 text-xs text-stone-500">{r.caterer?.name||'—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(r.students_fed)}</td>
                  <td className="px-4 py-2.5 text-center"><Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill></td>
                </tr>
              ))}
              {reports.length===0&&<tr><td colSpan={5} className="px-4 py-8 text-center text-stone-300">No reports yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reminder Modal */}
      <Modal open={!!remModal} onClose={()=>setRemModal(null)} title="Send Reminder" size="sm">
        <div className="space-y-4">
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-3">
            <div className="text-xs text-stone-400">Sending to</div>
            <div className="font-semibold text-ink">{remModal?.caterer?.name}</div>
          </div>
          <Textarea label="Reminder message" value={remMsg} onChange={e=>setRemMsg(e.target.value)} rows={3}
            placeholder="Please submit your daily feeding report for today..."/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setRemModal(null)} disabled={busy}>Cancel</Button>
            <Button onClick={sendReminder} disabled={busy} icon={Send}>{busy?'Sending...':'Send Reminder'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
