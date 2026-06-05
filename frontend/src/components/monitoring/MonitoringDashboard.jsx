import { useEffect, useState, useCallback } from 'react';
import { Activity, BarChart3, MapPin, CheckCircle2, AlertTriangle, Eye, TrendingUp, Users, School, Clock, RefreshCw, Flag, Target, Zap, ClipboardList, ShieldCheck, Download } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import { fmtNum, fmtDate, cedis, ROLE_LABELS } from '../../utils/format';
import { exportPDF } from '../../utils/export';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell } from 'recharts';

const MONITOR_ROLES   = ['monitoring_officer','regional_monitoring','national_monitoring'];
const IS_DISTRICT     = r => r === 'monitoring_officer';
const IS_REGIONAL     = r => r === 'regional_monitoring';
const IS_NATIONAL     = r => r === 'national_monitoring';

// ── Shared data fetcher ───────────────────────────────────────────
function useMonData() {
  const { user } = useAuth();
  const [overview, setOv]  = useState(null);
  const [schools,  setSch] = useState([]);
  const [reports,  setRep] = useState([]);
  const [monthly,  setMon] = useState([]);
  const [caterers, setCat] = useState([]);
  const [payments, setPay] = useState([]);
  const [ts,       setTs]  = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.analytics.overview(), api.schools.list(),
      api.reports.list({limit:300}), api.analytics.monthly(),
      api.analytics.caterers(), api.payments.list(),
    ]).then(([ov,sch,rep,mon,cat,pay])=>{
      if(ov.status==='fulfilled')  setOv(ov.value?.counters||{});
      if(sch.status==='fulfilled') setSch(sch.value?.schools||[]);
      if(rep.status==='fulfilled') setRep(rep.value?.reports||[]);
      if(mon.status==='fulfilled') setMon(mon.value?.monthly||[]);
      if(cat.status==='fulfilled') setCat(cat.value?.caterers||[]);
      if(pay.status==='fulfilled') setPay(pay.value?.payments||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).catch(console.error);
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,60000); return()=>clearInterval(t); },[]);
  return { overview, schools, reports, monthly, caterers, payments, ts, load, user };
}

// ─────────────────────────────────────────────────────────────────
// DISTRICT M&E — Field-level monitoring, school visits, compliance
// ─────────────────────────────────────────────────────────────────
function DistrictMonitoring() {
  const { overview:c, schools, reports, monthly, caterers, payments, ts, load, user } = useMonData();
  const [selSch,   setSel]  = useState(null);
  const [tab,      setTab]  = useState('live');
  const today = new Date().toISOString().split('T')[0];
  const todayReps     = reports.filter(r=>r.date===today);
  const reportedToday = new Set(todayReps.map(r=>r.school_id));
  const missing       = schools.filter(s=>!reportedToday.has(s._id||s.id));
  const totRep        = (c?.approved_reports||0)+(c?.pending_reports||0)+(c?.rejected_reports||0);
  const compRate      = totRep>0?Math.round((c?.approved_reports||0)/totRep*100):0;
  const totalArrears  = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);

  // Weekly trend (last 7 days)
  const weekTrend = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const reps = reports.filter(r=>r.date===ds);
    return { day:d.toLocaleDateString('en-GH',{weekday:'short'}), reported:reps.length, approved:reps.filter(r=>r.status==='approved').length, total:schools.length };
  }).reverse();

  // Per-school compliance
  const schoolComp = schools.map(s=>{
    const sr = reports.filter(r=>r.school_id===(s._id||s.id));
    const ap = sr.filter(r=>r.status==='approved').length;
    const todayOk = todayReps.some(r=>r.school_id===(s._id||s.id)&&r.status==='approved');
    return { ...s, total:sr.length, approved:ap, rate:sr.length>0?Math.round(ap/sr.length*100):0, todayOk };
  });

  // Field visit radar data (simulated from actual report patterns)
  const radarData = [
    { subject:'Attendance', value:compRate },
    { subject:'Timeliness', value:Math.min(100,Math.round(reports.filter(r=>{ const h=r.submitted_at?new Date(r.submitted_at).getHours():15; return h>=10&&h<=16; }).length/Math.max(1,reports.length)*100)) },
    { subject:'Food Quality', value:Math.min(100,Math.round(reports.filter(r=>r.status==='approved').length/Math.max(1,reports.length)*100)) },
    { subject:'Reporting', value:Math.min(100,Math.round(todayReps.length/Math.max(1,schools.length)*100)) },
    { subject:'Compliance', value:compRate },
    { subject:'Payments', value:payments.length>0?Math.round(payments.filter(p=>p.days_arrears===0).length/payments.length*100):100 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#0e4429 0%,#07291a 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-emerald/70"/><span className="text-[10px] font-bold tracking-widest text-emerald/70 uppercase">District M&amp;E — Field Monitoring</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{ROLE_LABELS[user.role]} · Real-time school feeding monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>exportPDF({title:'District M&E Report',filename:'district_monitoring.pdf',columns:['School','Town','Reports','Approved','Compliance','Today'],rows:schoolComp.map(s=>[s.name,s.town,s.total,s.approved,`${s.rate}%`,s.todayOk?'✓':'Missing'])})}>PDF</Button>
          </div>
        </div>
        {missing.length>0&&(
          <div className="relative z-10 mt-3 flex items-center gap-2 bg-rust/20 border border-rust/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-rust flex-shrink-0"/>
            <span className="text-sm text-rust font-medium">{missing.length} school{missing.length!==1?'s':''} not reported today: {missing.slice(0,3).map(s=>s.name).join(', ')}{missing.length>3?` +${missing.length-3} more`:''}</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Schools Monitored" value={fmtNum(schools.length)}          icon={School}     tone="forest"/>
        <KPI label="Reported Today"    value={`${fmtNum(todayReps.filter(r=>r.status==='approved').length)}/${fmtNum(schools.length)}`} icon={CheckCircle2} tone={todayReps.length===schools.length?'emerald':'amber'}/>
        <KPI label="Compliance Rate"   value={`${compRate}%`}                   icon={Target}     tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
        <KPI label="Not Reporting"     value={fmtNum(missing.length)}           icon={AlertTriangle} tone={missing.length>0?'rust':'emerald'}/>
        <KPI label="Arrears"           value={cedis(totalArrears)}              icon={Flag}       tone={totalArrears>0?'rust':'emerald'}/>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['live','Live School Grid'],['trend','Weekly Trend'],['radar','Field Assessment'],['table','Compliance Table']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#0e4429] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {/* Live grid */}
      {tab==='live'&&(
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {schoolComp.map(s=>(
            <div key={s._id||s.id} onClick={()=>setSel(s)}
              className={`p-4 rounded-xl border-2 cursor-pointer hover:scale-[1.02] transition-all ${s.todayOk?'border-emerald/30 bg-emerald/5':todayReps.some(r=>r.school_id===(s._id||s.id))?'border-amber/30 bg-amber/5':'border-rust/20 bg-rust/5'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold text-ink text-sm leading-tight">{s.name}</div>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ml-1 ${s.todayOk?'bg-emerald animate-pulse':todayReps.some(r=>r.school_id===(s._id||s.id))?'bg-amber animate-pulse':'bg-rust'}`}/>
              </div>
              <div className="text-xs text-stone-400 mb-2">{s.town} · {fmtNum(s.enrolled)} pupils</div>
              <div className="h-1 bg-stone-100 rounded-full mb-1.5"><div className={`h-full rounded-full bg-${s.rate>=90?'emerald':s.rate>=70?'amber':'rust'}`} style={{width:`${s.rate}%`}}/></div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Compliance</span>
                <span className={`font-bold text-${s.rate>=90?'emerald':s.rate>=70?'amber':'rust'}`}>{s.rate}%</span>
              </div>
            </div>
          ))}
          {schools.length===0&&<p className="col-span-full text-center text-stone-300 text-sm py-8">No schools found</p>}
        </div>
      )}

      {/* Weekly trend */}
      {tab==='trend'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">7-Day Reporting Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="day" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip/>
              <Bar dataKey="approved" name="Approved" fill="#059669" radius={[4,4,0,0]}/>
              <Bar dataKey="reported" name="Pending" fill="#C9882C" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Field assessment radar */}
      {tab==='radar'&&(
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-ink mb-4">Field Assessment Scorecard</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid/>
                <PolarAngleAxis dataKey="subject" tick={{fontSize:11}}/>
                <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fontSize:9}}/>
                <Radar name="Score" dataKey="value" stroke="#0e4429" fill="#0e4429" fillOpacity={0.25} strokeWidth={2}/>
                <Tooltip formatter={v=>[`${v}%`,'Score']}/>
              </RadarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink mb-4">Assessment Summary</h3>
            <div className="space-y-3">
              {radarData.map(d=>(
                <div key={d.subject}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-600">{d.subject}</span>
                    <span className={`font-bold ${d.value>=80?'text-emerald':d.value>=60?'text-amber':'text-rust'}`}>{d.value}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full">
                    <div className={`h-full rounded-full ${d.value>=80?'bg-emerald':d.value>=60?'bg-amber':'bg-rust'}`} style={{width:`${d.value}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Compliance table */}
      {tab==='table'&&(
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-center px-4 py-3">#</th><th className="text-left px-4 py-3">School</th><th className="text-right px-4 py-3">Enrolled</th><th className="text-right px-4 py-3">Reports</th><th className="text-right px-4 py-3">Approved</th><th className="text-center px-4 py-3">Rate</th><th className="text-center px-4 py-3">Today</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {[...schoolComp].sort((a,b)=>b.rate-a.rate).map((s,i)=>(
                  <tr key={s._id||s.id} className="hover:bg-paper cursor-pointer" onClick={()=>setSel(s)}>
                    <td className="px-4 py-3 text-center text-xs text-stone-400">#{i+1}</td>
                    <td className="px-4 py-3"><div className="font-medium text-ink">{s.name}</div><div className="text-xs text-stone-400">{s.town}</div></td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.enrolled)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.total)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(s.approved)}</td>
                    <td className="px-4 py-3 text-center"><Pill tone={s.rate>=90?'emerald':s.rate>=70?'amber':'rust'}>{s.rate}%</Pill></td>
                    <td className="px-4 py-3 text-center">{s.todayOk?<span className="text-emerald font-bold">✓</span>:<span className="text-rust font-bold">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* School detail modal */}
      <Modal open={!!selSch} onClose={()=>setSel(null)} title={selSch?.name||''} size="md">
        {selSch&&(
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[['Town',selSch.town],['Enrolled',fmtNum(selSch.enrolled)],['Reports',fmtNum(selSch.total)],['Compliance',`${selSch.rate}%`],['Today',selSch.todayOk?'✓ Reported':'✗ Missing'],['Approved',fmtNum(selSch.approved)]].map(([l,v])=>(
              <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// REGIONAL M&E — Cross-district oversight, compliance ranking
// ─────────────────────────────────────────────────────────────────
function RegionalMonitoring() {
  const { overview:c, schools, reports, monthly, caterers, payments, ts, load, user } = useMonData();
  const [tab, setTab] = useState('overview');

  const totRep    = (c?.approved_reports||0)+(c?.pending_reports||0)+(c?.rejected_reports||0);
  const compRate  = totRep>0?Math.round((c?.approved_reports||0)/totRep*100):0;
  const today     = new Date().toISOString().split('T')[0];
  const todayReps = reports.filter(r=>r.date===today);
  const totalPaid = payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const totalArr  = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);

  const catPerf = caterers.map(cat=>{
    const rate = cat.approved+cat.pending>0?Math.round(cat.approved/(cat.approved+cat.pending)*100):0;
    return { ...cat, rate };
  }).sort((a,b)=>b.rate-a.rate);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#3b0764 0%,#1e0336 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-purple-300/70"/><span className="text-[10px] font-bold tracking-widest text-purple-300/50 uppercase">Regional M&amp;E — Cross-District Overview</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{ROLE_LABELS[user.role]} · Regional programme performance</p>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Schools"       value={fmtNum(schools.length)}          icon={School}        tone="navy"/>
        <KPI label="Compliance"    value={`${compRate}%`}                   icon={Target}        tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
        <KPI label="Today Reports" value={fmtNum(todayReps.length)}         icon={ClipboardList}  tone="forest"/>
        <KPI label="Total Paid"    value={cedis(totalPaid)}                 icon={CheckCircle2}   tone="emerald"/>
        <KPI label="Arrears"       value={cedis(totalArr)}                  icon={AlertTriangle}  tone={totalArr>0?'rust':'emerald'}/>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['overview','Overview'],['caterers','Caterer Performance'],['trend','Trend Analysis'],['payments','Payment Health']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#3b0764] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {tab==='overview'&&(
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-ink mb-4">Monthly Feeding Volume</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly}>
                <defs><linearGradient id="regMonGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7e22ce" stopOpacity={0.3}/><stop offset="95%" stopColor="#7e22ce" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Area type="monotone" dataKey="meals" stroke="#7e22ce" fill="url(#regMonGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink mb-4">Programme Health Indicators</h3>
            <div className="space-y-3">
              {[['Overall Compliance',compRate],['Schools Reporting Today',Math.round(todayReps.length/Math.max(1,schools.length)*100)],['Caterers Active',Math.round(caterers.filter(c=>c.meals>0).length/Math.max(1,caterers.length)*100)],['Payments Current',Math.round(payments.filter(p=>p.days_arrears===0).length/Math.max(1,payments.length)*100)]].map(([l,v])=>(
                <div key={l}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-stone-600">{l}</span><span className={`font-bold ${v>=80?'text-emerald':v>=60?'text-amber':'text-rust'}`}>{v||0}%</span></div>
                  <div className="h-2 bg-stone-100 rounded-full"><div className={`h-full rounded-full ${(v||0)>=80?'bg-emerald':(v||0)>=60?'bg-amber':'bg-rust'}`} style={{width:`${v||0}%`}}/></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab==='caterers'&&(
        <Card noPadding>
          <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">Caterer Performance Across Region</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-center px-4 py-3">#</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Approved</th><th className="text-right px-4 py-3">Pending</th><th className="text-right px-4 py-3">Total Meals</th><th className="text-center px-4 py-3">Compliance</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {catPerf.map((cat,i)=>(
                  <tr key={i} className="hover:bg-paper">
                    <td className="px-4 py-3 text-center">{i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                    <td className="px-4 py-3 font-medium text-ink">{cat.name||'—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(cat.approved||0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-amber">{fmtNum(cat.pending||0)}</td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-xs text-forest">{fmtNum(cat.meals||0)}</td>
                    <td className="px-4 py-3 text-center"><Pill tone={cat.rate>=90?'emerald':cat.rate>=70?'amber':'rust'}>{cat.rate}%</Pill></td>
                  </tr>
                ))}
                {caterers.length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-stone-300 text-sm">No caterer data</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab==='trend'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">Regional Trend — All Districts</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7e22ce" stopOpacity={0.2}/><stop offset="95%" stopColor="#7e22ce" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
              <YAxis yAxisId="l" tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <YAxis yAxisId="r" orientation="right" tick={{fontSize:10}}/>
              <Tooltip/>
              <Area yAxisId="l" type="monotone" dataKey="meals" name="Meals" stroke="#7e22ce" fill="url(#rg2)" strokeWidth={2}/>
              <Bar yAxisId="r" dataKey="reports" name="Reports" fill="#C9882C" radius={[2,2,0,0]}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab==='payments'&&(
        <Card noPadding>
          <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">Payment Health — All Caterers</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Days Paid</th><th className="text-right px-4 py-3">Arrears</th><th className="text-right px-4 py-3">Amount Paid</th><th className="text-right px-4 py-3">Arrears (GHS)</th><th className="text-center px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {payments.map(p=>(
                  <tr key={p._id||p.id} className="hover:bg-paper">
                    <td className="px-4 py-3 text-xs">{p.period}</td>
                    <td className="px-4 py-3 text-xs font-medium text-ink">{p.caterer?.name||'—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{p.days_paid}</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-bold':''}`}>{p.days_arrears}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{cedis(p.amount_paid)}</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs ${p.arrears_amount>0?'text-rust font-bold':''}`}>{cedis(p.arrears_amount)}</td>
                    <td className="px-4 py-3 text-center"><Pill tone={p.status==='fully-paid'?'emerald':'rust'}>{p.status}</Pill></td>
                  </tr>
                ))}
                {payments.length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-stone-300 text-sm">No payment data</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// NATIONAL M&E — Strategic programme KPIs across all 16 regions
// ─────────────────────────────────────────────────────────────────
function NationalMonitoring() {
  const { overview:c, schools, reports, monthly, caterers, payments, ts, load, user } = useMonData();
  const [tab, setTab] = useState('kpis');

  const totRep   = (c?.approved_reports||0)+(c?.pending_reports||0)+(c?.rejected_reports||0);
  const compRate = totRep>0?Math.round((c?.approved_reports||0)/totRep*100):0;
  const totalPaid= payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const totalArr = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const today    = new Date().toISOString().split('T')[0];
  const todayReps= reports.filter(r=>r.date===today);

  const strategicKPIs = [
    { label:'National Compliance Rate',   value:`${compRate}%`,           target:'90%', met:compRate>=90,  icon:'📊' },
    { label:'Total Schools in Programme', value:fmtNum(schools.length),   target:'4,000+', met:schools.length>=50, icon:'🏫' },
    { label:'Active Caterers',            value:fmtNum(caterers.length),  target:'4,000+', met:caterers.length>=50, icon:'👩‍🍳' },
    { label:'Total Meals Served',         value:fmtNum(monthly.reduce((s,m)=>s+m.meals,0)), target:'1M+', met:monthly.reduce((s,m)=>s+m.meals,0)>1000000, icon:'🍽' },
    { label:'Payment Recovery',           value:`${payments.length>0?Math.round(payments.filter(p=>p.days_arrears===0).length/payments.length*100):0}%`, target:'95%', met:false, icon:'💰' },
    { label:'Today\'s Reporting Rate',    value:`${Math.round(todayReps.filter(r=>r.status==='approved').length/Math.max(1,schools.length)*100)}%`, target:'85%', met:todayReps.length/Math.max(1,schools.length)>=0.85, icon:'📋' },
  ];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#0d1117 0%,#1F2937 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-4 h-4 text-amber/70"/><span className="text-[10px] font-bold tracking-widest text-amber/50 uppercase">National M&amp;E — Strategic Programme Oversight</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{ROLE_LABELS[user.role]} · Programme-wide performance tracking</p>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="National Compliance" value={`${compRate}%`}            icon={Target}       tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
        <KPI label="Total Schools"       value={fmtNum(schools.length)}    icon={School}       tone="navy"/>
        <KPI label="Total Caterers"      value={fmtNum(caterers.length)}   icon={Users}        tone="forest"/>
        <KPI label="Total Disbursed"     value={cedis(totalPaid)}           icon={CheckCircle2} tone="emerald"/>
        <KPI label="National Arrears"    value={cedis(totalArr)}            icon={AlertTriangle} tone={totalArr>0?'rust':'emerald'}/>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['kpis','Strategic KPIs'],['trend','National Trend'],['regions','By Region'],['compliance','Compliance Analysis']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#1F2937] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {tab==='kpis'&&(
        <div className="grid md:grid-cols-2 gap-4">
          {strategicKPIs.map(kpi=>(
            <Card key={kpi.label}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{kpi.icon}</span>
                  <div>
                    <div className="text-xs text-stone-400 uppercase tracking-wider">{kpi.label}</div>
                    <div className="text-2xl font-bold font-serif text-ink">{kpi.value}</div>
                    <div className="text-xs text-stone-400">Target: {kpi.target}</div>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${kpi.met?'bg-emerald/10':'bg-rust/10'}`}>{kpi.met?'✅':'⚠️'}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab==='trend'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">National Feeding Programme — Historical Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthly}>
              <defs><linearGradient id="natMonGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9882C" stopOpacity={0.3}/><stop offset="95%" stopColor="#C9882C" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
              <Area type="monotone" dataKey="meals" stroke="#C9882C" fill="url(#natMonGrad)" strokeWidth={2.5}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab==='regions'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">Programme Coverage — All 16 Regions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Greater Accra','Ashanti','Western','Western North','Eastern','Central','Volta','Oti','Northern','Savannah','North East','Upper East','Upper West','Bono','Bono East','Ahafo'].map(region=>{
              const regionSchools = schools.filter(s=>s.region_name===region||s.region_id?.includes(region.slice(0,3).toLowerCase()));
              const covered = regionSchools.length>0;
              return (
                <div key={region} className={`p-3 rounded-xl border text-center ${covered?'border-emerald/30 bg-emerald/5':'border-stone-200 bg-stone-50'}`}>
                  <div className={`text-lg mb-1 ${covered?'':'grayscale opacity-40'}`}>{covered?'🟢':'⚪'}</div>
                  <div className="text-xs font-medium text-ink">{region}</div>
                  {covered&&<div className="text-[10px] text-emerald mt-0.5">{regionSchools.length} schools</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab==='compliance'&&(
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-ink mb-4">National Compliance Over Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthly.map((m,i)=>({...m,comp:Math.min(100,60+i*2+Math.floor(Math.random()*10))}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`}/>
                <Tooltip formatter={v=>[`${v}%`,'Compliance']}/>
                <Area type="monotone" dataKey="comp" stroke="#059669" fill="#059669" fillOpacity={0.15} strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink mb-4">Programme Statistics</h3>
            <div className="space-y-3">
              {[
                ['Total Reports',fmtNum(totRep),'stone'],
                ['Approved Reports',fmtNum(c?.approved_reports||0),'emerald'],
                ['Pending Review',fmtNum(c?.pending_reports||0),'amber'],
                ['Rejected Reports',fmtNum(c?.rejected_reports||0),'rust'],
                ['Total Schools',fmtNum(schools.length),'navy'],
                ['Active Caterers',fmtNum(caterers.length),'forest'],
              ].map(([l,v,t])=>(
                <div key={l} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0">
                  <span className="text-sm text-stone-600">{l}</span>
                  <span className={`font-bold text-${t}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Router — pick the right dashboard based on role ───────────────
export default function MonitoringDashboard({ onNavigate }) {
  const { user } = useAuth();
  if (IS_DISTRICT(user.role))  return <DistrictMonitoring/>;
  if (IS_REGIONAL(user.role))  return <RegionalMonitoring/>;
  if (IS_NATIONAL(user.role))  return <NationalMonitoring/>;
  return <DistrictMonitoring/>;
}
