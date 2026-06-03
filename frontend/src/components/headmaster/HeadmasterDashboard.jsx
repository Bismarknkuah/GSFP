import { useEffect, useState, useCallback } from 'react';
import { ClipboardCheck, BookOpen, CheckCircle2, XCircle, Clock, AlertCircle, School, Users, TrendingUp, Eye, RefreshCw, Download } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import { fmtNum, fmtDate, fmtDateTime, ROLE_LABELS } from '../../utils/format';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function HeadmasterDashboard({ view = 'overview' }) {
  const { user }  = useAuth();
  const [reports, setRep]    = useState([]);
  const [pending, setPend]   = useState([]);
  const [school,  setSch]    = useState(null);
  const [monthly, setMon]    = useState([]);
  const [detail,  setDet]    = useState(null);
  const [actMode, setAct]    = useState(null);
  const [reject,  setRej]    = useState('');
  const [busy,    setBusy]   = useState(false);
  const [ok,      setOk]     = useState(null);
  const [err,     setErr]    = useState(null);
  const [ts,      setTs]     = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.reports.list({ limit:100 }),
      api.reports.listPending(),
      api.schools.get(user.school_id),
      api.analytics.monthly(),
    ]).then(([r,p,s,m])=>{
      if(r.status==='fulfilled') setRep(r.value?.reports||[]);
      if(p.status==='fulfilled') setPend(p.value?.reports||[]);
      if(s.status==='fulfilled') setSch(s.value?.school||null);
      if(m.status==='fulfilled') setMon(m.value?.monthly||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).catch(console.error);
  },[]);

  useEffect(()=>{ load(); },[]);

  const doAction = async (reportId, action, comment='') => {
    setBusy(true); setErr(null);
    try {
      await api.reports.review(reportId, { action, comment });
      setOk(`Report ${action}d successfully`); setAct(null); setRej(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const totReports = reports.length;
  const approved   = reports.filter(r=>r.status==='approved').length;
  const rejected   = reports.filter(r=>r.status==='rejected').length;
  const compRate   = totReports>0?Math.round(approved/totReports*100):0;
  const today      = new Date().toISOString().split('T')[0];
  const todayRep   = reports.find(r=>r.date===today);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#1e3a5f 0%,#142d4c 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><School className="w-4 h-4 text-blue-300"/><span className="text-[10px] font-bold tracking-widest text-blue-300/70 uppercase">Headmaster Dashboard</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{school?.name||'Loading school...'} · {fmtNum(school?.enrolled||0)} pupils</p>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
          </div>
        </div>
        {pending.length>0&&(
          <div className="relative z-10 mt-3 flex items-center gap-2 bg-amber/20 border border-amber/30 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-amber flex-shrink-0"/>
            <span className="text-sm text-amber font-medium">{pending.length} report{pending.length!==1?'s':''} awaiting your review</span>
          </div>
        )}
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm">{err}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Total Reports"    value={fmtNum(totReports)}           icon={BookOpen}      tone="navy"/>
        <KPI label="Approved"         value={fmtNum(approved)}              icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Pending"          value={fmtNum(pending.length)}        icon={Clock}         tone={pending.length>0?'amber':'emerald'}/>
        <KPI label="Rejected"         value={fmtNum(rejected)}              icon={XCircle}       tone={rejected>0?'rust':'emerald'}/>
        <KPI label="Compliance"       value={`${compRate}%`}                icon={TrendingUp}    tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
      </div>

      {/* Today's status */}
      <Card className={todayRep ? (todayRep.status==='approved'?'border-2 border-emerald/30 bg-emerald/5':'border-2 border-amber/30 bg-amber/5') : 'border-2 border-stone-200'}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400 uppercase tracking-wider mb-0.5">Today's Report Status</div>
            {todayRep
              ? <div className={`font-bold text-lg ${todayRep.status==='approved'?'text-emerald':todayRep.status==='rejected'?'text-rust':'text-amber'}`}>
                  {todayRep.status==='approved'?'✓ Approved':todayRep.status==='rejected'?'✗ Rejected':'⏳ Pending Review'}
                </div>
              : <div className="font-bold text-lg text-stone-400">No report submitted today</div>
            }
            {todayRep&&<div className="text-xs text-stone-400 mt-0.5">{todayRep.food_type} · {fmtNum(todayRep.students_fed)} pupils fed</div>}
          </div>
          {todayRep&&<Pill tone={todayRep.status==='approved'?'emerald':todayRep.status==='rejected'?'rust':'amber'}>{todayRep.status}</Pill>}
        </div>
      </Card>

      {/* Pending approvals */}
      {(view==='pending'||view==='overview')&&pending.length>0&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-amber"/>Pending Approvals ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(r=>(
              <div key={r._id||r.id} className="p-4 bg-amber/5 border-2 border-amber/20 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-ink">{r.caterer?.name||'Caterer'}</div>
                    <div className="text-sm text-stone-500 mt-0.5">{fmtDate(r.date)} · {r.food_type}</div>
                    <div className="text-sm font-medium text-forest mt-1">{fmtNum(r.students_fed)} pupils fed · Ready: {r.time_ready||'—'} · Served: {r.time_served||'—'}</div>
                    {r.notes&&<div className="text-xs text-stone-400 mt-1 italic">"{r.notes}"</div>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="secondary" onClick={()=>setDet(r)}>View</Button>
                    <button onClick={()=>{ setAct(r); setErr(null); setRej(''); }} className="px-3 py-1.5 bg-forest text-white text-xs rounded-xl font-semibold hover:bg-forest/90">Review</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trend + history */}
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
          <div className="px-4 py-3 border-b border-stone-100">
            <h3 className="font-semibold text-ink">Recent Reports</h3>
          </div>
          <div className="overflow-y-auto max-h-64">
            {reports.length===0?<p className="p-6 text-center text-stone-300 text-sm">No reports yet</p>:(
              <div className="divide-y divide-stone-50">
                {reports.slice(0,10).map(r=>(
                  <div key={r._id||r.id} className={`flex items-center justify-between px-4 py-3 hover:bg-paper cursor-pointer ${r.status==='rejected'?'bg-rust/5':''}`} onClick={()=>setDet(r)}>
                    <div>
                      <div className="text-sm font-medium text-ink">{fmtDate(r.date)}</div>
                      <div className="text-xs text-stone-400 truncate max-w-[200px]">{r.food_type} · {fmtNum(r.students_fed)} pupils</div>
                    </div>
                    <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Report detail modal */}
      <Modal open={!!detail} onClose={()=>setDet(null)} title="Report Details" size="md">
        {detail&&(
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[['Date',fmtDate(detail.date)],['Caterer',detail.caterer?.name||'—'],['Food Type',detail.food_type],['Pupils Fed',fmtNum(detail.students_fed)],['Time Ready',detail.time_ready||'—'],['Time Served',detail.time_served||'—'],['Submitted',fmtDateTime(detail.submitted_at)],['Status',detail.status]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v||'—'}</div></div>
              ))}
            </div>
            {detail.notes&&<div className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">Notes</div><div className="text-sm text-stone-600 italic">{detail.notes}</div></div>}
            {detail.headmaster_comment&&<div className={`rounded-xl p-3 ${detail.status==='rejected'?'bg-rust/10':'bg-emerald/10'}`}><div className="text-xs text-stone-400">Your Comment</div><div className="text-sm font-medium">{detail.headmaster_comment}</div></div>}
          </div>
        )}
      </Modal>

      {/* Approve/reject modal */}
      <Modal open={!!actMode} onClose={()=>setAct(null)} title="Review Report" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        {actMode&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-3">
              <div className="font-semibold text-ink">{actMode.caterer?.name||'Caterer'}</div>
              <div className="text-sm text-stone-500">{fmtDate(actMode.date)} · {actMode.food_type} · {fmtNum(actMode.students_fed)} pupils</div>
            </div>
            <Textarea label="Comment (optional for approval, required for rejection)" value={reject} onChange={e=>setRej(e.target.value)} rows={3} placeholder="Add your observations or rejection reason..."/>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>doAction(actMode._id||actMode.id,'approve',reject)} disabled={busy}
                className="py-3 bg-emerald text-white rounded-xl font-semibold hover:bg-emerald/90 disabled:opacity-50">
                {busy?'Processing...':'✓ Approve'}
              </button>
              <button onClick={()=>{ if(!reject.trim()){setErr('Rejection reason required');return;} doAction(actMode._id||actMode.id,'reject',reject); }} disabled={busy}
                className="py-3 bg-rust text-white rounded-xl font-semibold hover:bg-rust/90 disabled:opacity-50">
                {busy?'Processing...':'✗ Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
