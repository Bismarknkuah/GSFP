import { useEffect, useState, useCallback } from 'react';
import { Building2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, FileText, Users, Bell } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { fmtNum, fmtDate, fmtDateTime } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function DCEDashboard() {
  const { user }   = useAuth();
  const [reports,  setRep]  = useState([]);
  const [schReqs,  setSchReqs]= useState([]);
  const [selRep,   setSelRep] = useState(null);
  const [selSch,   setSelSch] = useState(null);
  const [schComment,setSchCmt]= useState('');
  const [busy,     setBusy]  = useState(false);
  const [ok,       setOk]    = useState(null);
  const [err,      setErr]   = useState(null);
  const [tab,      setTab]   = useState('reports');

  const authH = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` };

  const load = useCallback(async()=>{
    const [r, sr] = await Promise.allSettled([
      api.reports.list({ limit:200 }),
      fetch(`${BASE}/api/school-requests?status=pending`, { headers:authH }).then(r=>r.json()),
    ]);
    if(r.status==='fulfilled')  setRep((r.value?.reports||[]).filter(rep=>rep.status==='pending'));
    if(sr.status==='fulfilled') setSchReqs(sr.value?.requests||[]);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const doReportReview = async (action, comment) => {
    if (!selRep) return;
    if (action==='rejected' && !comment?.trim()) { setErr('Comment required'); return; }
    setBusy(true); setErr(null);
    try {
      await api.reports.review(selRep._id||selRep.id, { action, comment });
      setOk(`Report ${action}`);
      setSelRep(null); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doSchoolReview = async (action) => {
    if (action==='rejected' && !schComment.trim()) { setErr('Comment required for rejection'); return; }
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/school-requests/${selSch._id||selSch.id}/review`, { method:'POST', headers:authH, body:JSON.stringify({ action, comment:schComment }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Failed');
      setOk(action==='approved'?`School "${selSch.name}" approved and created in the system!`:`School request rejected.`);
      setSelSch(null); setSchCmt(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#15493B 0%,#0f3329 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1"><Building2 className="w-4 h-4 text-emerald/70"/><span className="text-[10px] font-bold tracking-widest text-emerald/60 uppercase">DCE Dashboard</span></div>
          <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
          <p className="text-white/50 text-sm">District Chief Executive · Approval & Oversight</p>
        </div>
        <div className="relative z-10 mt-3 space-y-2">
          {reports.length>0&&<div className="flex items-center gap-2 bg-amber/20 border border-amber/30 rounded-xl px-3 py-2"><Clock className="w-4 h-4 text-amber"/><span className="text-sm text-amber font-medium">{reports.length} caterer report{reports.length!==1?'s':''} pending review</span></div>}
          {schReqs.length>0&&<div className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-xl px-3 py-2"><Bell className="w-4 h-4 text-blue-300"/><span className="text-sm text-blue-200 font-medium">{schReqs.length} new school request{schReqs.length!==1?'s':''} awaiting your approval</span></div>}
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm">{err}</div>}

      <div className="grid grid-cols-3 gap-3">
        <KPI label="Pending Reports"  value={fmtNum(reports.length)}   icon={Clock}      tone={reports.length>0?'amber':'emerald'}/>
        <KPI label="School Requests"  value={fmtNum(schReqs.length)}   icon={Building2}  tone={schReqs.length>0?'amber':'emerald'}/>
        <KPI label="Role"             value="DCE"                       icon={Users}      tone="forest"/>
      </div>

      <div className="flex gap-2">
        {[['reports',`Caterer Reports (${reports.length})`],['schools',`School Requests (${schReqs.length})`]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#15493B] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {tab==='reports'&&(
        reports.length===0?
          <Card><div className="flex flex-col items-center py-10 gap-3"><CheckCircle2 className="w-10 h-10 text-emerald opacity-50"/><p className="font-semibold text-stone-500">No pending reports</p></div></Card>
          : <div className="space-y-3">
            {reports.map(r=>(
              <Card key={r._id||r.id} className="border-2 border-amber/20 bg-amber/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-ink">{r.caterer?.name||'Caterer'}</div>
                    <div className="text-sm text-stone-500">{fmtDate(r.date)} · {r.food_type}</div>
                    <div className="text-sm font-bold text-forest mt-1">{fmtNum(r.students_fed)} pupils fed</div>
                  </div>
                  <button onClick={()=>{ setSelRep(r); setErr(null); }}
                    className="px-4 py-2 bg-forest text-white text-sm rounded-xl font-bold hover:bg-forest/90">Review</button>
                </div>
              </Card>
            ))}
          </div>
      )}

      {tab==='schools'&&(
        schReqs.length===0?
          <Card><div className="flex flex-col items-center py-10 gap-3"><CheckCircle2 className="w-10 h-10 text-emerald opacity-50"/><p className="font-semibold text-stone-500">No school requests pending</p></div></Card>
          : <div className="space-y-3">
            {schReqs.map(r=>(
              <Card key={r._id||r.id} className="border-2 border-blue-200 bg-blue-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold text-ink text-lg">{r.name}</div>
                    <div className="text-sm text-stone-500">{r.town} · {fmtNum(r.enrolled)} pupils enrolled</div>
                    <div className="text-xs text-stone-400 mt-1">Submitted by: {r.submitted_by_name} · {fmtDate(r.created_at)}</div>
                    {r.reason&&<div className="text-xs italic text-stone-500 mt-1">"{r.reason}"</div>}
                  </div>
                  <button onClick={()=>{ setSelSch(r); setSchCmt(''); setErr(null); }}
                    className="px-4 py-2 bg-navy text-white text-sm rounded-xl font-bold hover:bg-navy/90">Review</button>
                </div>
              </Card>
            ))}
          </div>
      )}

      {/* Report review modal */}
      <Modal open={!!selRep} onClose={()=>{ setSelRep(null); setErr(null); }} title="Review Caterer Report" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        {selRep&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[['Caterer',selRep.caterer?.name||'—'],['Date',fmtDate(selRep.date)],['Food',selRep.food_type],['Pupils Fed',fmtNum(selRep.students_fed)]].map(([l,v])=>(
                  <div key={l}><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>doReportReview('approved','')} disabled={busy}
                className="py-3.5 bg-emerald text-white rounded-xl font-bold hover:bg-emerald/90 disabled:opacity-50">✓ Approve</button>
              <button onClick={()=>{ const c=prompt('Rejection reason:'); if(c) doReportReview('rejected',c); }} disabled={busy}
                className="py-3.5 bg-rust text-white rounded-xl font-bold hover:bg-rust/90 disabled:opacity-50">✗ Reject</button>
            </div>
          </div>
        )}
      </Modal>

      {/* School request modal */}
      <Modal open={!!selSch} onClose={()=>{ setSelSch(null); setErr(null); }} title="Review School Request" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        {selSch&&(
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <div className="text-xs text-stone-400">School Name</div>
              <div className="text-xl font-bold text-ink">{selSch.name}</div>
              <div className="grid grid-cols-3 gap-3 text-sm mt-2">
                {[['Town',selSch.town||'—'],['Enrolled',fmtNum(selSch.enrolled)],['Submitted by',selSch.submitted_by_name]].map(([l,v])=>(
                  <div key={l}><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
                ))}
              </div>
              {selSch.reason&&<div className="text-sm italic text-stone-600 mt-2">Reason: "{selSch.reason}"</div>}
            </div>
            <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-xs text-amber font-medium">
              ⓘ If approved, this school will be created in the system and the coordinator will be able to assign a headmaster and caterer.
            </div>
            <Textarea label="Comment (required for rejection)" value={schComment}
              onChange={e=>setSchCmt(e.target.value)} rows={2} placeholder="Add your comments..."/>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>doSchoolReview('approved')} disabled={busy}
                className="py-3.5 bg-emerald text-white rounded-xl font-bold hover:bg-emerald/90 disabled:opacity-50">✓ Approve School</button>
              <button onClick={()=>doSchoolReview('rejected')} disabled={busy}
                className="py-3.5 bg-rust text-white rounded-xl font-bold hover:bg-rust/90 disabled:opacity-50">✗ Reject</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
