import { useEffect, useState, useCallback } from 'react';
import { Activity, School, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, BarChart3, MapPin, Users, Eye, RefreshCw, Download, Filter, Zap, Target, Award } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import { fmtNum, fmtDate, cedis, ROLE_LABELS } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const TIER_LABEL = {
  monitoring_officer: 'District M&E Dashboard',
  regional_monitoring: 'Regional M&E Dashboard',
  national_monitoring: 'National M&E Dashboard',
};

const COMPLIANCE_LEVELS = [
  { label: 'Excellent', min: 95, color: '#059669', bg: 'bg-emerald/10', text: 'text-emerald' },
  { label: 'Good',      min: 80, color: '#15493B', bg: 'bg-forest/10',  text: 'text-forest'  },
  { label: 'Average',   min: 65, color: '#C9882C', bg: 'bg-amber/10',   text: 'text-amber'   },
  { label: 'Poor',      min: 0,  color: '#C0392B', bg: 'bg-rust/10',    text: 'text-rust'    },
];

function getComplianceLevel(rate) {
  return COMPLIANCE_LEVELS.find(l => rate >= l.min) || COMPLIANCE_LEVELS[3];
}

function ComplianceMeter({ value, label }) {
  const level = getComplianceLevel(value);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f0ece4" strokeWidth="8"/>
          <circle cx="50" cy="50" r="45" fill="none" stroke={level.color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{transition:'stroke-dashoffset 1s ease'}}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-serif" style={{color:level.color}}>{value}%</span>
          <span className="text-[9px] text-stone-400 uppercase tracking-wider">{level.label}</span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-stone-500 text-center">{label}</span>}
    </div>
  );
}

function SchoolStatusCard({ school, report }) {
  const hasReport = !!report;
  const isApproved = report?.status === 'approved';
  return (
    <div className={`p-3 rounded-xl border-2 transition-all ${isApproved ? 'border-emerald/30 bg-emerald/5' : hasReport ? 'border-amber/30 bg-amber/5' : 'border-rust/20 bg-rust/5'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-ink truncate">{school.name}</span>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 ${isApproved ? 'bg-emerald animate-pulse' : hasReport ? 'bg-amber animate-pulse' : 'bg-rust'}`}/>
      </div>
      <div className="text-xs text-stone-400">{school.town} · {fmtNum(school.enrolled)} pupils</div>
      {report ? (
        <div className="mt-1.5 text-xs">
          <span className={isApproved ? 'text-emerald font-medium' : 'text-amber font-medium'}>
            {isApproved ? '✓ Approved' : '⏳ Pending'} — {fmtNum(report.students_fed)} fed
          </span>
        </div>
      ) : (
        <div className="mt-1.5 text-xs text-rust font-medium">✗ No report today</div>
      )}
    </div>
  );
}

export default function MonitoringDashboard({ onNavigate }) {
  const { user }  = useAuth();
  const [overview, setOv]   = useState(null);
  const [schools,  setSch]  = useState([]);
  const [reports,  setRep]  = useState([]);
  const [monthly,  setMon]  = useState([]);
  const [regions,  setReg]  = useState([]);
  const [caterers, setCat]  = useState([]);
  const [loading,  setLoad] = useState(true);
  const [selSchool,setSel]  = useState(null);
  const [period,   setPer]  = useState('30');
  const [ts,       setTs]   = useState(null);

  const isNational = user.role === 'national_monitoring';
  const isRegional = user.role === 'regional_monitoring';

  const load = useCallback(() => {
    setLoad(true);
    Promise.allSettled([
      api.analytics.overview(),
      api.schools.list(),
      api.reports.list({ limit:500 }),
      api.analytics.monthly(),
      api.analytics.caterers(),
      ...(isNational ? [api.regions.list()] : [Promise.resolve({regions:[]})]),
    ]).then(([ov,sch,rep,mon,cat,reg]) => {
      if(ov.status==='fulfilled')  setOv(ov.value?.counters||{});
      if(sch.status==='fulfilled') setSch(sch.value?.schools||[]);
      if(rep.status==='fulfilled') setRep(rep.value?.reports||[]);
      if(mon.status==='fulfilled') setMon(mon.value?.monthly||[]);
      if(cat.status==='fulfilled') setCat(cat.value?.caterers||[]);
      if(reg&&reg.status==='fulfilled') setReg(reg.value?.regions||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).finally(()=>setLoad(false));
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,120000); return()=>clearInterval(t); },[]);

  const today = new Date().toISOString().split('T')[0];
  const todayReports  = reports.filter(r=>r.date===today);
  const reportedToday = new Set(todayReports.map(r=>r.school_id));
  const approvedToday = todayReports.filter(r=>r.status==='approved');
  const pendingToday  = todayReports.filter(r=>r.status==='pending');
  const missingToday  = schools.filter(s=>!reportedToday.has(s._id||s.id));

  const c = overview||{};
  const totalReports = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const compRate = totalReports>0?Math.round((c.approved_reports||0)/totalReports*100):0;
  const todayRate = schools.length>0?Math.round(approvedToday.length/schools.length*100):0;

  // Weekly compliance data
  const weekData = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-i);
    const dateStr = d.toISOString().split('T')[0];
    const dayReps = reports.filter(r=>r.date===dateStr);
    const approved = dayReps.filter(r=>r.status==='approved').length;
    const total = schools.length||1;
    return {
      day: d.toLocaleDateString('en-GH',{weekday:'short'}),
      date: dateStr,
      compliance: Math.round(approved/total*100),
      reports: dayReps.length,
      approved,
      missing: Math.max(0, total - dayReps.length),
    };
  }).reverse();

  // School performance radar
  const schoolPerf = schools.slice(0,6).map(s=>{
    const schReports = reports.filter(r=>r.school_id===(s._id||s.id));
    const approved = schReports.filter(r=>r.status==='approved').length;
    const rate = schReports.length>0?Math.round(approved/schReports.length*100):0;
    return { school: s.name.split(' ').slice(0,2).join(' '), rate };
  });

  // School detail
  const schoolReports = selSchool ? reports.filter(r=>r.school_id===(selSchool._id||selSchool.id)).slice(0,10) : [];

  const doExport = (type) => {
    const opts = {
      title:`${TIER_LABEL[user.role]||'M&E'} — Compliance Report`,
      subtitle:`Period: Last ${period} days · Generated: ${new Date().toLocaleString('en-GH')}`,
      columns:['School','Town','Enrolled','Reports Submitted','Approved','Pending','Rejected','Compliance %'],
      rows: schools.map(s=>{
        const sr = reports.filter(r=>r.school_id===(s._id||s.id));
        const ap = sr.filter(r=>r.status==='approved').length;
        const pe = sr.filter(r=>r.status==='pending').length;
        const re = sr.filter(r=>r.status==='rejected').length;
        const rt = sr.length>0?Math.round(ap/sr.length*100):0;
        return [s.name, s.town, s.enrolled, sr.length, ap, pe, re, `${rt}%`];
      }),
      summaryRows:[
        {label:'Overall Compliance', value:`${compRate}%`},
        {label:'Schools Monitored',  value:schools.length},
        {label:'Total Reports',      value:fmtNum(totalReports)},
        {label:'Missing Today',      value:missingToday.length},
      ],
      filename:`GSFP_ME_Report_${today}`,
    };
    if(type==='pdf') exportPDF({...opts,filename:opts.filename+'.pdf',orientation:'landscape'});
    else exportExcel({filename:opts.filename+'.xlsx',sheets:[{name:'Compliance',columns:opts.columns,rows:opts.rows,summaryRows:opts.summaryRows},{name:'Daily Trend',columns:['Date','Day','Compliance %','Reports','Approved','Missing'],rows:weekData.map(d=>[d.date,d.day,`${d.compliance}%`,d.reports,d.approved,d.missing])}]});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{background:'linear-gradient(135deg,#0d2818 0%,#15493B 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald"/>
              <span className="text-xs font-bold tracking-widest text-emerald/70 uppercase">Monitoring & Evaluation</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-white">{TIER_LABEL[user.role]||'M&E Dashboard'}</h1>
            <p className="text-white/50 text-sm mt-1">{user.name} · {ROLE_LABELS[user.role]}</p>
          </div>
          <div className="flex items-center gap-3">
            {ts&&<div className="text-xs text-white/30">Updated: {ts}</div>}
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald animate-pulse"/><span className="text-xs text-emerald">Live</span></div>
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Export</Button>
          </div>
        </div>
      </div>

      {/* Today alert */}
      {missingToday.length>0&&(
        <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rust flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-rust">{missingToday.length} school{missingToday.length!==1?'s':''} haven't reported today</p>
            <p className="text-sm text-stone-600 mt-0.5">{missingToday.map(s=>s.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Schools"          value={fmtNum(schools.length)}          icon={School}        tone="forest"/>
        <KPI label="Reported Today"   value={fmtNum(reportedToday.size)}      icon={CheckCircle2}  tone={reportedToday.size===schools.length?'emerald':'amber'}/>
        <KPI label="Approved Today"   value={fmtNum(approvedToday.length)}    icon={TrendingUp}    tone="emerald"/>
        <KPI label="Missing Today"    value={fmtNum(missingToday.length)}     icon={AlertTriangle} tone={missingToday.length>0?'rust':'emerald'}/>
        <KPI label="Overall Compliance" value={`${compRate}%`}                icon={Target}        tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
      </div>

      {/* Compliance meters + trend */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-semibold text-ink mb-5 text-center">Compliance Gauges</h3>
          <div className="flex justify-around">
            <ComplianceMeter value={compRate}   label="Overall"/>
            <ComplianceMeter value={todayRate}  label="Today"/>
          </div>
          <div className="mt-4 space-y-2">
            {COMPLIANCE_LEVELS.map(l=>(
              <div key={l.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${l.bg}`}>
                <span className={`text-xs font-semibold ${l.text}`}>{l.label}</span>
                <span className="text-xs text-stone-400">{l.min}%+</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-semibold text-ink mb-4">7-Day Compliance Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="day" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
                <Tooltip formatter={(v,n)=>[n==='compliance'?`${v}%`:v, n==='compliance'?'Compliance':'Missing']}/>
                <Bar dataKey="compliance" name="compliance" fill="#15493B" radius={[4,4,0,0]}>
                  {weekData.map((d,i)=>(
                    <rect key={i} fill={d.compliance>=90?'#059669':d.compliance>=70?'#15493B':d.compliance>=50?'#C9882C':'#C0392B'}/>
                  ))}
                </Bar>
                <Bar dataKey="missing" name="missing" fill="#fecaca" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Live school grid */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber"/>Live School Status — Today
          </h3>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald"/>Approved</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber"/>Pending</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rust"/>Missing</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {schools.map(s=>{
            const rep = todayReports.find(r=>r.school_id===(s._id||s.id));
            return <SchoolStatusCard key={s._id||s.id} school={s} report={rep}/>;
          })}
          {schools.length===0&&<p className="col-span-full text-stone-300 text-sm text-center py-6">No schools found</p>}
        </div>
      </Card>

      {/* Performance table */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Award className="w-4 h-4 text-amber"/>School Performance Ranking</h3>
          <div className="flex gap-2">
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('pdf')}>PDF</Button>
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Excel</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="text-center px-4 py-3">Rank</th>
                <th className="text-left px-4 py-3">School</th>
                <th className="text-left px-4 py-3">Town</th>
                <th className="text-right px-4 py-3">Enrolled</th>
                <th className="text-right px-4 py-3">Submitted</th>
                <th className="text-right px-4 py-3">Approved</th>
                <th className="text-right px-4 py-3">Rejected</th>
                <th className="text-center px-4 py-3">Compliance</th>
                <th className="text-center px-4 py-3">Today</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {schools.map((s,idx)=>{
                const sr = reports.filter(r=>r.school_id===(s._id||s.id));
                const ap = sr.filter(r=>r.status==='approved').length;
                const pe = sr.filter(r=>r.status==='pending').length;
                const rj = sr.filter(r=>r.status==='rejected').length;
                const rt = sr.length>0?Math.round(ap/sr.length*100):0;
                const level = getComplianceLevel(rt);
                const todayRep = todayReports.find(r=>r.school_id===(s._id||s.id));
                const medals = ['🥇','🥈','🥉'];
                return (
                  <tr key={s._id||s.id} className="hover:bg-paper cursor-pointer" onClick={()=>setSel(s)}>
                    <td className="px-4 py-3 text-center">{idx<3?medals[idx]:<span className="text-xs text-stone-400 font-mono">#{idx+1}</span>}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{s.town}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.enrolled)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(sr.length)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(ap)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-rust">{fmtNum(rj)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-stone-100 rounded-full"><div className="h-full rounded-full" style={{width:`${rt}%`,backgroundColor:level.color}}/></div>
                        <span className="text-xs font-bold" style={{color:level.color}}>{rt}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {todayRep ? <Pill tone={todayRep.status==='approved'?'emerald':'amber'}>{todayRep.status==='approved'?'✓':'⏳'}</Pill>
                                : <Pill tone="rust">Missing</Pill>}
                    </td>
                    <td className="px-4 py-3">
                      <Eye className="w-3.5 h-3.5 text-forest cursor-pointer"/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* School detail modal */}
      <Modal open={!!selSchool} onClose={()=>setSel(null)} title={selSchool?.name||''} size="lg">
        {selSchool&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[['Town',selSchool.town],['Enrolled',fmtNum(selSchool.enrolled)],['Code',selSchool.code],['District',selSchool.district_id||'—']].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
              ))}
            </div>
            <h4 className="font-semibold text-ink text-sm">Recent Reports</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {schoolReports.length===0?<p className="text-stone-300 text-sm text-center py-4">No reports</p>
              :schoolReports.map(r=>(
                <div key={r._id||r.id} className={`flex items-center justify-between p-3 rounded-xl border ${r.status==='approved'?'border-emerald/20 bg-emerald/5':r.status==='rejected'?'border-rust/20 bg-rust/5':'border-amber/20 bg-amber/5'}`}>
                  <div>
                    <div className="text-sm font-medium text-ink">{fmtDate(r.date)} · {r.food_type}</div>
                    <div className="text-xs text-stone-400">{fmtNum(r.students_fed)} pupils fed</div>
                  </div>
                  <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
