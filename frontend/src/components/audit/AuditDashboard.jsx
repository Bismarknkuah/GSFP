import { useEffect, useState, useCallback, useMemo } from 'react';
import { ShieldCheck, AlertTriangle, TrendingDown, DollarSign, FileText, Search, Download, Eye, BarChart3, CheckCircle2, Flag, RefreshCw, Activity, Lock, Zap, Target, AlertCircle, TrendingUp, Award, Clock, Filter } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import { fmtNum, fmtDate, fmtDateTime, cedis, ROLE_LABELS } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, ComposedChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis } from 'recharts';

const TIER_LABEL = { auditor:'District Audit', regional_auditor:'Regional Audit', national_auditor:'National Audit' };

// ── Advanced anomaly engine ──────────────────────────────────────────
const ANOMALY_TYPES = {
  over_count:    { label:'Over-count',          color:'#C0392B', icon:'🔴', score:30 },
  low_count:     { label:'Low count',            color:'#C9882C', icon:'🟡', score:10 },
  odd_time:      { label:'Odd-hours submission', color:'#7C3AED', icon:'🟣', score:15 },
  weekend:       { label:'Weekend submission',   color:'#0E7490', icon:'🔵', score:10 },
  consecutive_max:{ label:'Consecutive max days',color:'#C0392B', icon:'🔴', score:25 },
  rapid_resubmit:{ label:'Rapid resubmission',   color:'#C9882C', icon:'🟡', score:15 },
  arrears_critical:{ label:'Critical arrears',   color:'#C0392B', icon:'🔴', score:35 },
  arrears_warn:  { label:'High arrears',         color:'#C9882C', icon:'🟡', score:15 },
};

function detectAnomalies(reports, schools, payments) {
  const flags = [];
  const schoolMap = Object.fromEntries(schools.map(s=>[(s._id||s.id),s]));

  // Group reports by caterer
  const byCaterer = {};
  reports.forEach(r=>{ const k = r.caterer_id||r.caterer?._id; if(k){ byCaterer[k]=byCaterer[k]||[]; byCaterer[k].push(r); } });

  reports.forEach(r=>{
    const school = schoolMap[r.school_id];
    // Over-count
    if (school?.enrolled && r.students_fed > school.enrolled * 1.1) {
      flags.push({ type:'over_count', report:r, school, severity:'critical',
        detail:`Fed ${fmtNum(r.students_fed)} but enrolled is ${fmtNum(school.enrolled)} — ${Math.round((r.students_fed/school.enrolled-1)*100)}% over-reporting` });
    }
    // Low count
    if (r.students_fed < 20 && school) {
      flags.push({ type:'low_count', report:r, school, severity:'warning',
        detail:`Only ${r.students_fed} pupils fed — suspiciously low for ${school.name} (${school.enrolled} enrolled)` });
    }
    // Odd hours
    const hour = r.submitted_at ? new Date(r.submitted_at).getHours() : null;
    if (hour !== null && (hour < 6 || hour > 21)) {
      flags.push({ type:'odd_time', report:r, school, severity:'warning',
        detail:`Submitted at ${hour}:00 hrs — outside normal operating hours (6am–9pm)` });
    }
    // Weekend submission
    const dayOfWeek = r.date ? new Date(r.date+'T12:00:00').getDay() : null;
    if (dayOfWeek !== null && (dayOfWeek===0||dayOfWeek===6)) {
      flags.push({ type:'weekend', report:r, school, severity:'warning',
        detail:`Report submitted for a ${dayOfWeek===0?'Sunday':'Saturday'} — schools are typically closed on weekends` });
    }
  });

  // Consecutive max-count reports (same caterer reports max enrollment 5 days in a row)
  Object.entries(byCaterer).forEach(([catererId, reps])=>{
    const sorted = [...reps].sort((a,b)=>new Date(a.date)-new Date(b.date));
    let streak = 0;
    for (let i=0; i<sorted.length; i++) {
      const school = schoolMap[sorted[i].school_id];
      if (school && sorted[i].students_fed >= school.enrolled * 0.99) { streak++; }
      else streak = 0;
      if (streak >= 5) {
        flags.push({ type:'consecutive_max', report:sorted[i], school, severity:'critical',
          detail:`${sorted[i].caterer?.name||'Caterer'} reported full enrolment for ${streak} consecutive days — statistically improbable` });
        streak = 0;
      }
    }
    // Rapid resubmission
    for (let i=1; i<sorted.length; i++) {
      if (sorted[i].date===sorted[i-1].date && sorted[i].is_resubmission) {
        const gap = sorted[i].submitted_at && sorted[i-1].submitted_at
          ? Math.round((new Date(sorted[i].submitted_at)-new Date(sorted[i-1].submitted_at))/60000) : null;
        if (gap && gap < 5) {
          flags.push({ type:'rapid_resubmit', report:sorted[i], school:schoolMap[sorted[i].school_id], severity:'warning',
            detail:`Resubmission ${gap} min after rejection — insufficient time to correct underlying issues` });
        }
      }
    }
  });

  // Payment anomalies
  payments.forEach(p=>{
    if (p.days_arrears > 60) {
      flags.push({ type:'arrears_critical', payment:p, severity:'critical',
        detail:`${p.days_arrears} days unpaid — ${cedis(p.arrears_amount)} owed to ${p.caterer?.name||'caterer'} (severe)` });
    } else if (p.days_arrears > 30) {
      flags.push({ type:'arrears_warn', payment:p, severity:'warning',
        detail:`${p.days_arrears} days arrears — ${cedis(p.arrears_amount)} owed to ${p.caterer?.name||'caterer'}` });
    }
  });

  return flags;
}

// ── Risk score per caterer ───────────────────────────────────────────
function calcRiskScores(caterers, anomalies, payments) {
  return caterers.map(cat=>{
    const catAnom = anomalies.filter(a=>
      a.report?.caterer?.name===cat.name||a.payment?.caterer?.name===cat.name
    );
    const payRec = payments.find(p=>(p.caterer?.name||'')===cat.name);
    let score = 0;
    catAnom.forEach(a=>{ score += ANOMALY_TYPES[a.type]?.score||10; });
    if (payRec?.days_arrears>30) score += 20;
    const compRate = cat.approved+cat.pending>0?cat.approved/(cat.approved+cat.pending):1;
    if (compRate < 0.7) score += 25;
    return { ...cat, riskScore:score, riskLevel:score>=50?'High':score>=25?'Medium':'Low', anomalyCount:catAnom.length, compRate:Math.round(compRate*100) };
  }).sort((a,b)=>b.riskScore-a.riskScore);
}

// ── Aging buckets ───────────────────────────────────────────────────
function calcAging(payments) {
  const buckets = { 'Current (0-30d)':0, '31-60 days':0, '61-90 days':0, '91-120 days':0, '120+ days':0 };
  payments.forEach(p=>{
    const d = p.days_arrears||0;
    if(d===0) return;
    if(d<=30) buckets['Current (0-30d)']+=p.arrears_amount||0;
    else if(d<=60) buckets['31-60 days']+=p.arrears_amount||0;
    else if(d<=90) buckets['61-90 days']+=p.arrears_amount||0;
    else if(d<=120) buckets['91-120 days']+=p.arrears_amount||0;
    else buckets['120+ days']+=p.arrears_amount||0;
  });
  return Object.entries(buckets).map(([name,value])=>({name,value})).filter(b=>b.value>0);
}

export default function AuditDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [payments,  setPay]  = useState([]);
  const [reports,   setRep]  = useState([]);
  const [schools,   setSch]  = useState([]);
  const [overview,  setOv]   = useState(null);
  const [monthly,   setMon]  = useState([]);
  const [caterers,  setCat]  = useState([]);
  const [auditLog,  setALog] = useState([]);
  const [anomalies, setAnom] = useState([]);
  const [tab,       setTab]  = useState('overview');
  const [search,    setSrch] = useState('');
  const [sevFilter, setSev]  = useState('');
  const [typeFilter,setType] = useState('');
  const [detail,    setDet]  = useState(null);
  const [loading,   setLoad] = useState(true);
  const [ts,        setTs]   = useState(null);

  const load = useCallback(()=>{
    setLoad(true);
    Promise.allSettled([
      api.analytics.overview(), api.payments.list(),
      api.reports.list({limit:500}), api.schools.list(),
      api.analytics.monthly(), api.analytics.caterers(),
      api.audit.list({limit:100}),
    ]).then(([ov,pay,rep,sch,mon,cat,al])=>{
      const c=ov.status==='fulfilled'?ov.value?.counters||{}:{};
      const p=pay.status==='fulfilled'?pay.value?.payments||[]:[];
      const r=rep.status==='fulfilled'?rep.value?.reports||[]:[];
      const s=sch.status==='fulfilled'?sch.value?.schools||[]:[];
      setOv(c); setPay(p); setRep(r); setSch(s);
      if(mon.status==='fulfilled') setMon(mon.value?.monthly||[]);
      if(cat.status==='fulfilled') setCat(cat.value?.caterers||[]);
      if(al.status==='fulfilled')  setALog(al.value?.entries||[]);
      setAnom(detectAnomalies(r,s,p));
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).finally(()=>setLoad(false));
  },[]);

  useEffect(()=>{ load(); },[]);

  const c = overview||{};
  const totalArrears = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const totalPaid    = payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const totReports   = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const compRate     = totReports>0?Math.round((c.approved_reports||0)/totReports*100):0;
  const criticalFlags= anomalies.filter(a=>a.severity==='critical');
  const warningFlags = anomalies.filter(a=>a.severity==='warning');

  const riskScores   = useMemo(()=>calcRiskScores(caterers,anomalies,payments),[caterers,anomalies,payments]);
  const agingData    = useMemo(()=>calcAging(payments),[payments]);

  const arrearsChart = [...payments].filter(p=>p.days_arrears>0).sort((a,b)=>b.arrears_amount-a.arrears_amount).slice(0,8)
    .map(p=>({name:(p.caterer?.name||'—').split(' ').slice(0,2).join(' '),arrears:p.arrears_amount,days:p.days_arrears}));

  const statusPie = [{name:'Approved',value:c.approved_reports||0},{name:'Pending',value:c.pending_reports||0},{name:'Rejected',value:c.rejected_reports||0}].filter(p=>p.value>0);

  const visibleAnom = anomalies.filter(a=>{
    if(sevFilter && a.severity!==sevFilter) return false;
    if(typeFilter && a.type!==typeFilter) return false;
    if(search){ const q=search.toLowerCase(); const n=a.school?.name||a.payment?.caterer?.name||''; if(!n.toLowerCase().includes(q)&&!(a.detail||'').toLowerCase().includes(q)) return false; }
    return true;
  });

  const visiblePay = payments.filter(p=>{
    if(!search) return true;
    return (p.caterer?.name||'').toLowerCase().includes(search.toLowerCase())||(p.period||'').toLowerCase().includes(search.toLowerCase());
  });

  const doExport = (type) => {
    const opts = {
      title:`${TIER_LABEL[user.role]||'Audit'} — Full Audit Package`, subtitle:`Auditor: ${user.name} · ${new Date().toLocaleString('en-GH')}`,
      columns:['Period','Caterer','School','Days Covered','Days Paid','Arrears Days','Amount Paid','Arrears Amount','Status'],
      rows:payments.map(p=>[p.period,p.caterer?.name||'—',p.school?.name||'—',p.days_covered,p.days_paid,p.days_arrears,cedis(p.amount_paid),cedis(p.arrears_amount),p.status]),
      summaryRows:[{label:'Total Paid',value:cedis(totalPaid)},{label:'Total Arrears',value:cedis(totalArrears)},{label:'Anomalies',value:`${anomalies.length} (${criticalFlags.length} critical)`},{label:'Compliance',value:`${compRate}%`}],
      filename:`GSFP_Audit_${new Date().toISOString().slice(0,10)}`,
    };
    if(type==='pdf') exportPDF({...opts,filename:opts.filename+'.pdf',orientation:'landscape'});
    else exportExcel({filename:opts.filename+'.xlsx',sheets:[
      {name:'Financial Audit',columns:opts.columns,rows:opts.rows,summaryRows:opts.summaryRows},
      {name:'Risk Scores',columns:['Caterer','Risk Level','Risk Score','Anomalies','Compliance %'],rows:riskScores.map(r=>[r.name||'—',r.riskLevel,r.riskScore,r.anomalyCount,`${r.compRate}%`])},
      {name:'Anomalies',columns:['Type','Severity','School/Caterer','Details','Date'],rows:anomalies.map(a=>[ANOMALY_TYPES[a.type]?.label||a.type,a.severity,a.school?.name||a.payment?.caterer?.name||'—',a.detail,fmtDate(a.report?.date||'')])},
      {name:'Arrears Aging',columns:['Bucket','Amount (GHS)'],rows:agingData.map(a=>[a.name,a.value.toFixed(2)])},
      {name:'Audit Trail',columns:['Timestamp','User','Role','Action','Details'],rows:auditLog.map(a=>[fmtDateTime(a.timestamp),a.user_name,a.user_role,a.action,a.details||'—'])},
    ]});
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{background:'linear-gradient(135deg,#0d1117 0%,#1F2937 100%)'}}>
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-amber"/><span className="text-xs font-bold tracking-widest text-amber/70 uppercase">Audit & Compliance Intelligence</span></div>
            <h1 className="font-serif text-2xl font-bold text-white">{TIER_LABEL[user.role]||'Audit Dashboard'}</h1>
            <p className="text-white/50 text-sm mt-1">{user.name} · {ROLE_LABELS[user.role]}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {ts&&<span className="text-xs text-white/20">Updated: {ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('pdf')}>PDF</Button>
            <Button icon={Download} size="sm" onClick={()=>doExport('excel')}>Full Export (5 sheets)</Button>
          </div>
        </div>
        {/* Alert banners */}
        <div className="relative z-10 mt-4 space-y-2">
          {criticalFlags.length>0&&(
            <div className="flex items-center gap-3 bg-rust/15 border border-rust/30 rounded-xl px-4 py-2.5">
              <Flag className="w-4 h-4 text-rust flex-shrink-0"/>
              <span className="text-sm text-rust font-medium">{criticalFlags.length} critical anomaly{criticalFlags.length!==1?'ies':''} detected — immediate action required</span>
              <button onClick={()=>setTab('anomalies')} className="ml-auto text-xs text-rust/70 underline">Review all</button>
            </div>
          )}
          {riskScores.filter(r=>r.riskLevel==='High').length>0&&(
            <div className="flex items-center gap-3 bg-amber/10 border border-amber/20 rounded-xl px-4 py-2">
              <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0"/>
              <span className="text-sm text-amber font-medium">{riskScores.filter(r=>r.riskLevel==='High').length} high-risk caterer{riskScores.filter(r=>r.riskLevel==='High').length!==1?'s':''} identified</span>
              <button onClick={()=>setTab('risk')} className="ml-auto text-xs text-amber/70 underline">View risk matrix</button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KPI label="Total Paid"     value={cedis(totalPaid)}             icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Total Arrears"  value={cedis(totalArrears)}          icon={TrendingDown}  tone={totalArrears>0?'rust':'emerald'}/>
        <KPI label="Compliance"     value={`${compRate}%`}               icon={ShieldCheck}   tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
        <KPI label="Critical Flags" value={fmtNum(criticalFlags.length)} icon={Flag}          tone={criticalFlags.length>0?'rust':'emerald'}/>
        <KPI label="High-Risk"      value={fmtNum(riskScores.filter(r=>r.riskLevel==='High').length)} icon={AlertTriangle} tone={riskScores.some(r=>r.riskLevel==='High')?'rust':'emerald'}/>
        <KPI label="Payments"       value={fmtNum(payments.length)}      icon={DollarSign}    tone="navy"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['overview','Overview'],['financial',`Financial (${payments.length})`],['risk',`Risk Matrix (${riskScores.length})`],['anomalies',`Anomalies (${anomalies.length})`],['aging','Arrears Aging'],['compliance','Compliance'],['trail','Audit Trail']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#1F2937] text-white shadow-sm':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview'&&(
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <h3 className="font-semibold text-ink mb-4">Arrears by Caterer — Top 8</h3>
              {arrearsChart.length>0?(
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={arrearsChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>cedis(v).replace('GHS ','')}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={90}/>
                    <Tooltip formatter={(v,n)=>[n==='arrears'?cedis(v):v,n==='arrears'?'Arrears':'Days']}/>
                    <Bar dataKey="arrears" name="arrears" fill="#C0392B" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ):<p className="text-stone-300 text-sm text-center py-12">No arrears — all caterers fully paid 🎉</p>}
            </Card>
            <Card>
              <h3 className="font-semibold text-ink mb-4">Monthly Meals Trend</h3>
              {monthly.length>0?(
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={monthly}>
                    <defs><linearGradient id="audGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                    <YAxis yAxisId="l" tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <YAxis yAxisId="r" orientation="right" tick={{fontSize:10}}/>
                    <Tooltip formatter={(v,n)=>[fmtNum(v),n==='meals'?'Meals':'Reports']}/>
                    <Area yAxisId="l" type="monotone" dataKey="meals" stroke="#15493B" fill="url(#audGrad)" strokeWidth={2}/>
                    <Bar yAxisId="r" dataKey="reports" fill="#C9882C" radius={[2,2,0,0]} opacity={0.7}/>
                  </ComposedChart>
                </ResponsiveContainer>
              ):<p className="text-stone-300 text-sm text-center py-8">No data</p>}
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-ink mb-3 text-sm">Report Status</h3>
              {statusPie.length>0?(
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart><Pie data={statusPie} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({name,percent})=>`${(percent*100).toFixed(0)}%`} fontSize={9}>
                    {statusPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}
                  </Pie><Tooltip/></PieChart>
                </ResponsiveContainer>
              ):<p className="text-stone-300 text-sm text-center py-8">No data</p>}
              <div className="space-y-1 mt-2">
                {statusPie.map((p,i)=>(
                  <div key={p.name} className="flex justify-between text-xs">
                    <span className="text-stone-500">{p.name}</span>
                    <span className="font-bold" style={{color:['#059669','#C9882C','#C0392B'][i]}}>{fmtNum(p.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-ink mb-3 text-sm">Anomaly Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(ANOMALY_TYPES).map(([type,cfg])=>{
                  const count = anomalies.filter(a=>a.type===type).length;
                  if (!count) return null;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-stone-600">{cfg.icon} {cfg.label}</span>
                      <span className="text-xs font-bold" style={{color:cfg.color}}>{count}</span>
                    </div>
                  );
                })}
                {anomalies.length===0&&<p className="text-stone-300 text-xs text-center py-2">✓ No anomalies detected</p>}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-ink mb-3 text-sm">Risk Summary</h3>
              {['High','Medium','Low'].map(level=>{
                const count = riskScores.filter(r=>r.riskLevel===level).length;
                const tone  = level==='High'?'rust':level==='Medium'?'amber':'emerald';
                return (
                  <div key={level} className={`flex items-center justify-between p-2 rounded-lg bg-${tone}/5 mb-1.5`}>
                    <span className="text-xs text-stone-600">{level} Risk</span>
                    <span className={`text-xs font-bold text-${tone}`}>{count} caterer{count!==1?'s':''}</span>
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      )}

      {/* ── FINANCIAL AUDIT ── */}
      {tab==='financial'&&(
        <>
          <div className="flex gap-3 mb-4 flex-wrap">
            <Input icon={Search} placeholder="Search caterer or period..." value={search} onChange={e=>setSrch(e.target.value)} className="flex-1"/>
          </div>
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Caterer</th><th className="text-left px-4 py-3">School</th><th className="text-right px-4 py-3">Covered</th><th className="text-right px-4 py-3">Paid</th><th className="text-right px-4 py-3">Arrears</th><th className="text-right px-4 py-3">Paid (GHS)</th><th className="text-right px-4 py-3">Arrears (GHS)</th><th className="text-center px-4 py-3">Status</th><th className="text-center px-4 py-3">Flags</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {visiblePay.map(p=>{
                    const flags = anomalies.filter(a=>a.payment?._id===p._id||a.payment?.id===p.id);
                    return (
                      <tr key={p._id||p.id} className={`hover:bg-paper cursor-pointer ${flags.length>0?'bg-amber/5':''}`} onClick={()=>setDet(p)}>
                        <td className="px-4 py-2.5 text-xs">{p.period}</td>
                        <td className="px-4 py-2.5 font-medium text-xs text-ink">{p.caterer?.name||'—'}</td>
                        <td className="px-4 py-2.5 text-xs text-stone-500">{p.school?.name||'—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{p.days_covered}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald">{p.days_paid}</td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-bold':''}`}>{p.days_arrears}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-xs">{cedis(p.amount_paid)}</td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${p.arrears_amount>0?'text-rust font-bold':''}`}>{cedis(p.arrears_amount)}</td>
                        <td className="px-4 py-2.5 text-center"><Pill tone={p.status==='fully-paid'?'emerald':'rust'}>{p.status}</Pill></td>
                        <td className="px-4 py-2.5 text-center">{flags.length>0?<span className="text-amber text-xs font-bold">⚠ {flags.length}</span>:<span className="text-emerald text-xs">✓</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-stone-50">
                  <tr><td colSpan={6} className="px-4 py-3 font-bold text-stone-500 text-xs">TOTALS</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald text-xs">{cedis(totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-bold text-rust text-xs">{cedis(totalArrears)}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
              {visiblePay.length===0&&<div className="p-8 text-center text-stone-300 text-sm">No records</div>}
            </div>
          </Card>
        </>
      )}

      {/* ── RISK MATRIX ── */}
      {tab==='risk'&&(
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-ink mb-1">Risk Scoring Matrix</h3>
            <p className="text-xs text-stone-400 mb-4">Each caterer scored on anomaly flags, arrears, and compliance rate. High risk = score ≥ 50.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-center px-4 py-3">Rank</th><th className="text-left px-4 py-3">Caterer</th><th className="text-center px-4 py-3">Risk Level</th><th className="text-right px-4 py-3">Risk Score</th><th className="text-right px-4 py-3">Anomalies</th><th className="text-right px-4 py-3">Compliance</th><th className="text-right px-4 py-3">Total Meals</th><th className="text-center px-4 py-3">Recommendation</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {riskScores.map((cat,i)=>{
                    const tone = cat.riskLevel==='High'?'rust':cat.riskLevel==='Medium'?'amber':'emerald';
                    const rec  = cat.riskLevel==='High'?'Audit immediately':cat.riskLevel==='Medium'?'Monitor closely':'No action needed';
                    return (
                      <tr key={i} className={`hover:bg-paper ${cat.riskLevel==='High'?'bg-rust/5':cat.riskLevel==='Medium'?'bg-amber/5':''}`}>
                        <td className="px-4 py-3 text-center text-xs text-stone-400">#{i+1}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{cat.name||'—'}</td>
                        <td className="px-4 py-3 text-center"><Pill tone={tone}>{cat.riskLevel}</Pill></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 bg-stone-100 rounded-full"><div className="h-full rounded-full" style={{width:`${Math.min(cat.riskScore,100)}%`,backgroundColor:cat.riskLevel==='High'?'#C0392B':cat.riskLevel==='Medium'?'#C9882C':'#059669'}}/></div>
                            <span className={`text-xs font-bold text-${tone}`}>{cat.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono">{cat.anomalyCount}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono">{cat.compRate}%</td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-forest">{fmtNum(cat.meals||0)}</td>
                        <td className="px-4 py-3 text-center text-xs text-stone-500 italic">{rec}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {riskScores.length===0&&<div className="p-8 text-center text-stone-300 text-sm">No caterer data</div>}
            </div>
          </Card>
        </div>
      )}

      {/* ── ANOMALIES ── */}
      {tab==='anomalies'&&(
        <>
          <div className="flex gap-3 mb-4 flex-wrap">
            <Input icon={Search} placeholder="Search school or caterer..." value={search} onChange={e=>setSrch(e.target.value)} className="flex-1"/>
            <Select value={sevFilter} onChange={e=>setSev(e.target.value)} className="w-40"
              options={[{value:'',label:'All severity'},{value:'critical',label:'🔴 Critical'},{value:'warning',label:'🟡 Warning'}]}/>
            <Select value={typeFilter} onChange={e=>setType(e.target.value)} className="w-52"
              options={[{value:'',label:'All types'},...Object.entries(ANOMALY_TYPES).map(([v,cfg])=>({value:v,label:`${cfg.icon} ${cfg.label}`}))]}/>
          </div>
          <div className="flex items-center gap-4 mb-3 text-xs text-stone-400">
            <span>Showing {visibleAnom.length} of {anomalies.length} anomalies</span>
            <span className="text-rust font-medium">{criticalFlags.length} critical</span>
            <span className="text-amber font-medium">{warningFlags.length} warnings</span>
          </div>
          {visibleAnom.length===0
            ? <Card><div className="flex flex-col items-center gap-3 py-10"><ShieldCheck className="w-10 h-10 text-emerald opacity-50"/><p className="font-semibold text-ink">No anomalies match your filters</p><p className="text-sm text-stone-400">All records within expected parameters</p></div></Card>
            : <div className="space-y-3">
                {visibleAnom.map((a,i)=>{
                  const cfg=ANOMALY_TYPES[a.type]||{label:a.type,icon:'⚪',color:'#374151',score:0};
                  return (
                    <Card key={i} className={`${a.severity==='critical'?'border-2 border-rust/30 bg-rust/5':'border border-amber/30 bg-amber/5'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="text-2xl flex-shrink-0">{cfg.icon}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-ink">{cfg.label}</span>
                              <Pill tone={a.severity==='critical'?'rust':'amber'}>{a.severity}</Pill>
                              <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-mono">risk +{cfg.score}</span>
                              {a.report&&<span className="text-xs text-stone-400">{fmtDate(a.report.date)}</span>}
                            </div>
                            <p className="text-sm text-stone-700 font-medium">{a.detail}</p>
                            <div className="flex gap-3 mt-1.5 flex-wrap">
                              {a.school&&<span className="text-xs text-stone-400">📍 {a.school.name}</span>}
                              {a.report&&<span className="text-xs text-stone-400">🍽 {a.report.food_type}</span>}
                              {a.report&&<span className="text-xs text-stone-400">Status: <strong>{a.report.status}</strong></span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={()=>setDet(a.report||a.payment)} className="p-2 hover:bg-white rounded-xl flex-shrink-0 transition-all"><Eye className="w-4 h-4 text-forest"/></button>
                      </div>
                    </Card>
                  );
                })}
              </div>
          }
        </>
      )}

      {/* ── ARREARS AGING ── */}
      {tab==='aging'&&(
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <h3 className="font-semibold text-ink mb-4">Arrears Aging Schedule</h3>
              {agingData.length===0?<p className="text-stone-300 text-sm text-center py-12">No arrears to analyse</p>:(
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={agingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="name" tick={{fontSize:9}}/>
                    <YAxis tick={{fontSize:10}} tickFormatter={v=>cedis(v).replace('GHS ','')}/>
                    <Tooltip formatter={v=>[cedis(v),'Arrears Amount']}/>
                    <Bar dataKey="value" radius={[4,4,0,0]}>
                      {agingData.map((_,i)=>(<Cell key={i} fill={['#15493B','#C9882C','#C0392B','#7C2D2D','#4A0000'][i]||'#C0392B'}/>))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold text-ink mb-4">Aging Breakdown</h3>
              {agingData.length===0?<p className="text-stone-300 text-sm text-center py-12">No arrears detected</p>:(
                <div className="space-y-3">
                  {agingData.map((b,i)=>{
                    const total = agingData.reduce((s,x)=>s+x.value,0);
                    const pct   = total>0?Math.round(b.value/total*100):0;
                    const colors = ['#15493B','#C9882C','#C0392B','#7C2D2D','#4A0000'];
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-600">{b.name}</span>
                          <span className="font-bold" style={{color:colors[i]||'#C0392B'}}>{cedis(b.value)} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full"><div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:colors[i]||'#C0392B'}}/></div>
                      </div>
                    );
                  })}
                  <div className="mt-4 pt-3 border-t border-stone-100">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-stone-600">Total Arrears</span>
                      <span className="text-rust">{cedis(totalArrears)}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
          {/* Arrears table */}
          <Card noPadding>
            <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">All Arrears Detail</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-left px-4 py-3">Caterer</th><th className="text-left px-4 py-3">Period</th><th className="text-right px-4 py-3">Days Arrears</th><th className="text-right px-4 py-3">Amount</th><th className="text-center px-4 py-3">Urgency</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {[...payments].filter(p=>p.days_arrears>0).sort((a,b)=>b.days_arrears-a.days_arrears).map(p=>(
                    <tr key={p._id||p.id} className="hover:bg-paper">
                      <td className="px-4 py-2.5 font-medium text-ink text-xs">{p.caterer?.name||'—'}</td>
                      <td className="px-4 py-2.5 text-xs text-stone-500">{p.period}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rust text-xs">{p.days_arrears}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rust text-xs">{cedis(p.arrears_amount)}</td>
                      <td className="px-4 py-2.5 text-center"><Pill tone={p.days_arrears>60?'rust':p.days_arrears>30?'amber':'stone'}>{p.days_arrears>60?'Critical':p.days_arrears>30?'High':'Moderate'}</Pill></td>
                    </tr>
                  ))}
                  {payments.filter(p=>p.days_arrears>0).length===0&&<tr><td colSpan={5} className="px-4 py-6 text-center text-stone-300 text-sm">No arrears — all caterers fully paid 🎉</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── COMPLIANCE ── */}
      {tab==='compliance'&&(
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-ink mb-4">Caterer Compliance Ranking</h3>
            {caterers.length===0?<p className="text-stone-300 text-sm text-center py-6">No caterer data</p>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                    <tr><th className="text-center px-4 py-3">#</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Approved</th><th className="text-right px-4 py-3">Pending</th><th className="text-right px-4 py-3">Meals</th><th className="text-center px-4 py-3">Compliance</th><th className="text-center px-4 py-3">Risk</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {riskScores.sort((a,b)=>b.compRate-a.compRate).map((cat,i)=>{
                      const tone=cat.compRate>=90?'emerald':cat.compRate>=70?'amber':'rust';
                      return (
                        <tr key={i} className="hover:bg-paper">
                          <td className="px-4 py-2.5 text-center">{i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                          <td className="px-4 py-2.5 font-medium text-ink">{cat.name||'—'}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald text-xs">{fmtNum(cat.approved||0)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-amber text-xs">{fmtNum(cat.pending||0)}</td>
                          <td className="px-4 py-2.5 text-right font-bold font-mono text-forest text-xs">{fmtNum(cat.meals||0)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 h-1.5 bg-stone-100 rounded-full"><div className={`h-full bg-${tone} rounded-full`} style={{width:`${cat.compRate}%`}}/></div>
                              <span className={`text-xs font-bold text-${tone}`}>{cat.compRate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center"><Pill tone={cat.riskLevel==='High'?'rust':cat.riskLevel==='Medium'?'amber':'emerald'}>{cat.riskLevel}</Pill></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── AUDIT TRAIL ── */}
      {tab==='trail'&&(
        <Card noPadding>
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-ink flex items-center gap-2"><Activity className="w-4 h-4 text-forest"/>System Audit Trail ({auditLog.length} entries)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-left px-4 py-3">Timestamp</th><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Action</th><th className="text-left px-4 py-3">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {auditLog.map((a,i)=>(
                  <tr key={i} className="hover:bg-paper">
                    <td className="px-4 py-2.5 text-xs text-stone-400 whitespace-nowrap">{fmtDateTime(a.timestamp)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-ink">{a.user_name}</td>
                    <td className="px-4 py-2.5 text-xs text-stone-500">{ROLE_LABELS[a.user_role]||a.user_role}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-forest bg-forest/10 px-1.5 py-0.5 rounded">{a.action}</span></td>
                    <td className="px-4 py-2.5 text-xs text-stone-500 max-w-xs truncate">{a.details||'—'}</td>
                  </tr>
                ))}
                {auditLog.length===0&&<tr><td colSpan={5} className="px-4 py-8 text-center text-stone-300 text-sm">No audit entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail modal */}
      <Modal open={!!detail} onClose={()=>setDet(null)} title="Record Detail" size="md">
        {detail&&(
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(detail).filter(([k])=>!['_id','id'].includes(k)&&typeof detail[k]!=='object'&&detail[k]!=null).slice(0,12).map(([k,v])=>(
                <div key={k} className="bg-stone-50 rounded-xl p-3">
                  <div className="text-xs text-stone-400 capitalize">{k.replace(/_/g,' ')}</div>
                  <div className="font-semibold text-ink text-sm mt-0.5 truncate">{String(v)||'—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
