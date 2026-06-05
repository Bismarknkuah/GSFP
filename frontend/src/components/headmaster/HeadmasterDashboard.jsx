import { useEffect, useState, useCallback } from 'react';
import { ClipboardCheck, BookOpen, CheckCircle2, XCircle, Clock, AlertCircle, School, Users, TrendingUp, RefreshCw, UserPlus, UserMinus, Edit3, ChevronRight, Bell } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import { fmtNum, fmtDate, fmtDateTime, ROLE_LABELS } from '../../utils/format';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function HeadmasterDashboard({ view = 'overview' }) {
  const { user } = useAuth();
  const [reports,  setRep]   = useState([]);
  const [pending,  setPend]  = useState([]);
  const [school,   setSch]   = useState(null);
  const [monthly,  setMon]   = useState([]);
  const [enrReqs,  setEnrReqs]= useState([]);
  const [detail,   setDet]   = useState(null);
  const [actMode,  setAct]   = useState(null);
  const [actForm,  setActForm]= useState({ decision:'', comment:'' });
  const [enrModal, setEnrModal]= useState(false);
  const [enrForm,  setEnrForm] = useState({ requested_enrolled:'', change_type:'admission', reason:'', notes:'' });
  const [busy,     setBusy]  = useState(false);
  const [ok,       setOk]    = useState(null);
  const [err,      setErr]   = useState(null);
  const [ts,       setTs]    = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.reports.list({ limit:100 }),
      api.reports.listPending(),
      api.schools.get(user.school_id),
      api.analytics.monthly(),
      api.enrollment ? api.enrollment.list() : Promise.resolve({ requests:[] }),
    ]).then(([r,p,s,m,enr])=>{
      if(r.status==='fulfilled')   setRep(r.value?.reports||[]);
      if(p.status==='fulfilled')   setPend(p.value?.reports||[]);
      if(s.status==='fulfilled')   setSch(s.value?.school||null);
      if(m.status==='fulfilled')   setMon(m.value?.monthly||[]);
      if(enr.status==='fulfilled') setEnrReqs(enr.value?.requests||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).catch(console.error);
  },[]);

  useEffect(()=>{ load(); },[]);

  const doReview = async () => {
    if (!actForm.decision) { setErr('Select approve or reject'); return; }
    if (actForm.decision==='rejected' && !actForm.comment.trim()) { setErr('Rejection reason required'); return; }
    setBusy(true); setErr(null);
    try {
      await api.reports.review(actMode._id||actMode.id, { action:actForm.decision, comment:actForm.comment });
      setOk(`Report ${actForm.decision}d successfully`);
      setAct(null); setActForm({ decision:'', comment:'' }); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doEnrollment = async () => {
    if (!enrForm.requested_enrolled||!enrForm.reason) { setErr('All fields required'); return; }
    setBusy(true); setErr(null);
    try {
      const n = Number(enrForm.requested_enrolled);
      if (isNaN(n)||n<1) { setErr('Enter a valid number of students'); setBusy(false); return; }
      await fetch((import.meta.env.VITE_BACKEND_URL||'')+'/api/enrollment', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('gsfp.token')},
        body: JSON.stringify({ school_id: user.school_id||school?._id, requested_enrolled:n, ...enrForm }),
      });
      setOk('Enrollment update submitted! Awaiting District Director approval.');
      setEnrModal(false); setEnrForm({ requested_enrolled:'', change_type:'admission', reason:'', notes:'' }); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const totReports = reports.length;
  const approved   = reports.filter(r=>r.status==='approved').length;
  const rejected   = reports.filter(r=>r.status==='rejected').length;
  const compRate   = totReports>0?Math.round(approved/totReports*100):0;
  const today      = new Date().toISOString().split('T')[0];
  const todayRep   = reports.find(r=>r.date===today);
  const pendingEnr = enrReqs.filter(r=>r.status==='pending');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#1e3a5f 0%,#142d4c 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><School className="w-4 h-4 text-blue-300"/><span className="text-[10px] font-bold tracking-widest text-blue-300/70 uppercase">Headmaster Dashboard</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{school?.name||'Loading...'} · <strong className="text-blue-200">{fmtNum(school?.enrolled||0)} pupils enrolled</strong></p>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Edit3} size="sm" onClick={()=>{ setEnrModal(true); setErr(null); }}>Update Enrollment</Button>
          </div>
        </div>
        {/* Alerts row */}
        <div className="relative z-10 mt-3 space-y-2">
          {pending.length>0&&(
            <div className="flex items-center gap-2 bg-amber/20 border border-amber/30 rounded-xl px-3 py-2">
              <Clock className="w-4 h-4 text-amber flex-shrink-0"/>
              <span className="text-sm text-amber font-medium">{pending.length} caterer report{pending.length!==1?'s':''} awaiting your review</span>
            </div>
          )}
          {pendingEnr.length>0&&(
            <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-xl px-3 py-2">
              <Bell className="w-4 h-4 text-blue-300 flex-shrink-0"/>
              <span className="text-sm text-blue-200 font-medium">{pendingEnr.length} enrollment request{pendingEnr.length!==1?'s':''} pending District Director approval</span>
            </div>
          )}
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Total Reports"   value={fmtNum(totReports)}          icon={BookOpen}      tone="navy"/>
        <KPI label="Approved"        value={fmtNum(approved)}             icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Pending Review"  value={fmtNum(pending.length)}       icon={Clock}         tone={pending.length>0?'amber':'emerald'}/>
        <KPI label="Rejected"        value={fmtNum(rejected)}             icon={XCircle}       tone={rejected>0?'rust':'emerald'}/>
        <KPI label="Compliance"      value={`${compRate}%`}               icon={TrendingUp}    tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
      </div>

      {/* Today's status */}
      <Card className={todayRep?(todayRep.status==='approved'?'border-2 border-emerald/30 bg-emerald/5':'border-2 border-amber/30 bg-amber/5'):'border-2 border-stone-200'}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-wider mb-0.5">Today's Report Status</div>
            {todayRep
              ? <div className={`font-bold text-lg ${todayRep.status==='approved'?'text-emerald':todayRep.status==='rejected'?'text-rust':'text-amber'}`}>
                  {todayRep.status==='approved'?'✓ Approved':todayRep.status==='rejected'?'✗ Rejected':'⏳ Pending Review'}
                </div>
              : <div className="font-bold text-lg text-stone-400">No caterer report submitted today</div>}
            {todayRep&&<div className="text-xs text-stone-400 mt-0.5">{todayRep.food_type} · {fmtNum(todayRep.students_fed)} pupils fed</div>}
          </div>
          {todayRep&&<Pill tone={todayRep.status==='approved'?'emerald':todayRep.status==='rejected'?'rust':'amber'}>{todayRep.status}</Pill>}
        </div>
      </Card>

      {/* Pending approvals */}
      {pending.length>0&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-amber"/>Pending Caterer Reports — Awaiting Your Approval ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(r=>(
              <div key={r._id||r.id} className="p-4 bg-amber/5 border-2 border-amber/20 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{r.caterer?.name||'Caterer'}</div>
                    <div className="text-sm text-stone-500 mt-0.5">{fmtDate(r.date)} · {r.food_type}</div>
                    <div className="text-sm font-medium text-forest mt-1">
                      {fmtNum(r.students_fed)} pupils fed
                      {school?.enrolled&&<span className={`ml-2 text-xs ${r.students_fed>school.enrolled?'text-rust font-bold':'text-stone-400'}`}>
                        (max: {fmtNum(school.enrolled)}{r.students_fed>school.enrolled?' ⚠ EXCEEDS ENROLLMENT':''})
                      </span>}
                    </div>
                    {r.time_ready&&<div className="text-xs text-stone-400 mt-0.5">Ready: {r.time_ready} · Served: {r.time_served||'—'}</div>}
                    {r.notes&&<div className="text-xs text-stone-500 mt-1 italic">"{r.notes}"</div>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={()=>setDet(r)} className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs rounded-xl hover:bg-stone-50">View</button>
                    <button onClick={()=>{ setAct(r); setActForm({decision:'',comment:''}); setErr(null); }}
                      className="px-3 py-1.5 bg-forest text-white text-xs rounded-xl font-semibold hover:bg-forest/90">Review</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enrollment requests history */}
      {enrReqs.length>0&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-navy"/>Enrollment Update Requests</h3>
          <div className="space-y-2">
            {enrReqs.map(r=>(
              <div key={r._id||r.id} className={`flex items-center justify-between p-3 rounded-xl border ${r.status==='approved'?'border-emerald/20 bg-emerald/5':r.status==='rejected'?'border-rust/20 bg-rust/5':'border-amber/20 bg-amber/5'}`}>
                <div>
                  <div className="text-sm font-medium text-ink">{r.current_enrolled} → <strong>{r.requested_enrolled}</strong> pupils ({r.change_type})</div>
                  <div className="text-xs text-stone-400">{r.reason} · {fmtDate(r.created_at)}</div>
                  {r.reviewer_comment&&<div className="text-xs text-stone-500 italic mt-0.5">"{r.reviewer_comment}"</div>}
                </div>
                <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Charts + recent reports */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-ink mb-4">Monthly Feeding Trend</h3>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly}>
                <defs><linearGradient id="hmGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.3}/><stop offset="95%" stopColor="#1E3A5F" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Area type="monotone" dataKey="meals" stroke="#1E3A5F" fill="url(#hmGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ):<p className="text-stone-300 text-sm text-center py-16">No data yet</p>}
        </Card>
        <Card noPadding>
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-ink">Recent Reports</h3>
            <span className="text-xs text-stone-400">{reports.length} total</span>
          </div>
          <div className="overflow-y-auto max-h-56 divide-y divide-stone-50">
            {reports.length===0?<p className="p-6 text-center text-stone-300 text-sm">No reports yet</p>
            :reports.slice(0,10).map(r=>(
              <div key={r._id||r.id} className={`flex items-center justify-between px-4 py-3 hover:bg-paper cursor-pointer ${r.status==='rejected'?'bg-rust/5':''}`} onClick={()=>setDet(r)}>
                <div>
                  <div className="text-sm font-medium text-ink">{fmtDate(r.date)}</div>
                  <div className="text-xs text-stone-400 truncate max-w-[200px]">{r.food_type} · {fmtNum(r.students_fed)} pupils</div>
                  {r.headmaster_comment&&<div className="text-xs text-stone-400 italic truncate">"{r.headmaster_comment}"</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-300"/>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Review Modal ── */}
      <Modal open={!!actMode} onClose={()=>setAct(null)} title="Review Caterer Report" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        {actMode&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="font-semibold text-ink">{actMode.caterer?.name||'Caterer'}</div>
              <div className="text-sm text-stone-500 mt-0.5">{fmtDate(actMode.date)} · {actMode.food_type}</div>
              <div className="text-base font-bold text-forest mt-1">{fmtNum(actMode.students_fed)} pupils fed</div>
              {school?.enrolled&&(
                <div className={`text-xs mt-1 ${actMode.students_fed>school.enrolled?'text-rust font-bold':'text-stone-400'}`}>
                  School enrollment: {fmtNum(school.enrolled)}{actMode.students_fed>school.enrolled?' ⚠ Exceeds enrollment!':''}
                </div>
              )}
              {actMode.time_ready&&<div className="text-xs text-stone-400 mt-1">Ready: {actMode.time_ready} · Served: {actMode.time_served||'—'}</div>}
              {actMode.notes&&<div className="text-xs text-stone-500 italic mt-1">"{actMode.notes}"</div>}
            </div>
            <Textarea label="Comment (required for rejection, optional for approval)" value={actForm.comment}
              onChange={e=>setActForm(f=>({...f,comment:e.target.value}))} rows={3}
              placeholder="Add your observations or rejection reason..."/>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setActForm(f=>({...f,decision:'approved'}))}
                className={`py-3.5 rounded-xl font-bold text-sm transition-all border-2 ${actForm.decision==='approved'?'border-emerald bg-emerald text-white':'border-stone-200 text-stone-600 hover:border-emerald/50'}`}>
                ✓ Approve Report
              </button>
              <button onClick={()=>setActForm(f=>({...f,decision:'rejected'}))}
                className={`py-3.5 rounded-xl font-bold text-sm transition-all border-2 ${actForm.decision==='rejected'?'border-rust bg-rust text-white':'border-stone-200 text-stone-600 hover:border-rust/50'}`}>
                ✗ Reject Report
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>setAct(null)} disabled={busy}>Cancel</Button>
              <Button onClick={doReview} disabled={busy||!actForm.decision}>{busy?'Processing...':'Submit Decision'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal open={!!detail} onClose={()=>setDet(null)} title="Report Details" size="md">
        {detail&&(
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[['Date',fmtDate(detail.date)],['Caterer',detail.caterer?.name||'—'],['Food Type',detail.food_type],['Pupils Fed',fmtNum(detail.students_fed)],['Time Ready',detail.time_ready||'—'],['Time Served',detail.time_served||'—'],['Status',detail.status],['Submitted',fmtDateTime(detail.submitted_at)]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v||'—'}</div></div>
              ))}
            </div>
            {detail.notes&&<div className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">Notes</div><div className="text-sm text-stone-600 italic">{detail.notes}</div></div>}
            {detail.headmaster_comment&&<div className={`rounded-xl p-3 ${detail.status==='rejected'?'bg-rust/10':'bg-emerald/10'}`}><div className="text-xs text-stone-400">Your Comment</div><div className="text-sm font-medium">{detail.headmaster_comment}</div></div>}
          </div>
        )}
      </Modal>

      {/* ── Enrollment Update Modal ── */}
      <Modal open={enrModal} onClose={()=>setEnrModal(false)} title="Update School Enrollment" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-4">
          <div className="bg-navy/5 border border-navy/15 rounded-xl p-4">
            <div className="text-xs text-stone-400">Current Enrollment</div>
            <div className="text-2xl font-bold font-serif text-navy">{fmtNum(school?.enrolled||0)} pupils</div>
            <div className="text-xs text-stone-400 mt-1">{school?.name}</div>
          </div>
          <Select label="Type of change *"
            value={enrForm.change_type} onChange={e=>setEnrForm(f=>({...f,change_type:e.target.value}))}
            options={[
              {value:'admission', label:'New Admissions — students joining'},
              {value:'withdrawal',label:'Student Withdrawal — students leaving'},
              {value:'correction',label:'Correction — fixing an error'},
            ]}/>
          <Input label="New total enrollment number *" type="number" min="1"
            value={enrForm.requested_enrolled} onChange={e=>setEnrForm(f=>({...f,requested_enrolled:e.target.value}))}
            placeholder={`Current: ${fmtNum(school?.enrolled||0)}`}/>
          {enrForm.requested_enrolled&&school?.enrolled&&(
            <div className={`text-sm font-medium p-2 rounded-lg ${Number(enrForm.requested_enrolled)>school.enrolled?'bg-emerald/10 text-emerald':'Number(enrForm.requested_enrolled)<school.enrolled?bg-amber/10 text-amber':'bg-stone-50 text-stone-600'}`}>
              Change: {school.enrolled} → {enrForm.requested_enrolled} ({Number(enrForm.requested_enrolled)-school.enrolled>0?'+':''}{Number(enrForm.requested_enrolled)-school.enrolled} pupils)
            </div>
          )}
          <Textarea label="Reason for change *" value={enrForm.reason}
            onChange={e=>setEnrForm(f=>({...f,reason:e.target.value}))} rows={2}
            placeholder="e.g. New pupils admitted for 2025/2026 academic year..."/>
          <Textarea label="Additional notes (optional)" value={enrForm.notes}
            onChange={e=>setEnrForm(f=>({...f,notes:e.target.value}))} rows={2}
            placeholder="Any additional details..."/>
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-xs text-amber">
            <strong>Note:</strong> This request will be sent to the District Director for approval. Once approved, the new enrollment figure becomes the maximum number of pupils the caterer can report feeding.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setEnrModal(false)} disabled={busy}>Cancel</Button>
            <Button onClick={doEnrollment} disabled={busy||!enrForm.requested_enrolled||!enrForm.reason} icon={Users}>
              {busy?'Submitting...':'Submit Enrollment Update'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
