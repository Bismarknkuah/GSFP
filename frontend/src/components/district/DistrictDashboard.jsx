import { useEffect, useState, useCallback } from 'react';
import { School, Users, FileText, CreditCard, TrendingUp, Clock, CheckCircle2, AlertTriangle, MapPin, BarChart3, Download, RefreshCw, Award, Activity, Target, Zap } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import { fmtNum, cedis, fmtDate, ROLE_LABELS } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, ComposedChart } from 'recharts';

export default function DistrictDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [overview, setOv]  = useState(null);
  const [schools,  setSch] = useState([]);
  const [reports,  setRep] = useState([]);
  const [payments, setPay] = useState([]);
  const [monthly,  setMon] = useState([]);
  const [caterers, setCat] = useState([]);
  const [selSch,   setSel] = useState(null);
  const [ts,       setTs]  = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.analytics.overview(),
      api.schools.list(),
      api.reports.list({ limit:200 }),
      api.payments.list(),
      api.analytics.monthly(),
      api.analytics.caterers(),
    ]).then(([ov,sch,rep,pay,mon,cat])=>{
      if(ov.status==='fulfilled')  setOv(ov.value?.counters||{});
      if(sch.status==='fulfilled') setSch(sch.value?.schools||[]);
      if(rep.status==='fulfilled') setRep(rep.value?.reports||[]);
      if(pay.status==='fulfilled') setPay(pay.value?.payments||[]);
      if(mon.status==='fulfilled') setMon(mon.value?.monthly||[]);
      if(cat.status==='fulfilled') setCat(cat.value?.caterers||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).catch(console.error);
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,90000); return()=>clearInterval(t); },[]);

  const c = overview||{};
  const today = new Date().toISOString().split('T')[0];
  const todayReps    = reports.filter(r=>r.date===today);
  const reportedToday= new Set(todayReps.map(r=>r.school_id));
  const approvedToday= todayReps.filter(r=>r.status==='approved');
  const missingToday = schools.filter(s=>!reportedToday.has(s._id||s.id));
  const totalPaid    = payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const totalArrears = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const totReports   = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const compRate     = totReports>0?Math.round((c.approved_reports||0)/totReports*100):0;

  // School performance with compliance
  const schoolPerf = schools.map(s=>{
    const sr  = reports.filter(r=>r.school_id===(s._id||s.id));
    const ap  = sr.filter(r=>r.status==='approved').length;
    const rate= sr.length>0?Math.round(ap/sr.length*100):0;
    return { ...s, reports:sr.length, approved:ap, rate };
  }).sort((a,b)=>b.rate-a.rate);

  // School reports for modal
  const selReports = selSch ? reports.filter(r=>r.school_id===(selSch._id||selSch.id)).slice(0,8) : [];
  const selPayment = selSch ? payments.find(p=>p.school_id===(selSch._id||selSch.id)) : null;

  const doExport = (type) => {
    const opts = {
      title:`District Dashboard — ${user.name}`, subtitle:`Generated: ${new Date().toLocaleString('en-GH')}`,
      columns:['School','Town','Enrolled','Caterer','Reports','Approved','Compliance','Today'],
      rows:schoolPerf.map(s=>[s.name,s.town,s.enrolled,s.caterer?.name||'—',s.reports,s.approved,`${s.rate}%`,reportedToday.has(s._id||s.id)?'Reported':'Missing']),
      summaryRows:[{label:'Total Paid',value:cedis(totalPaid)},{label:'Arrears',value:cedis(totalArrears)},{label:'Compliance',value:`${compRate}%`}],
      filename:`GSFP_District_${today}`,
    };
    if(type==='pdf') exportPDF({...opts,filename:opts.filename+'.pdf'});
    else exportExcel({filename:opts.filename+'.xlsx',sheets:[{name:'Schools',columns:opts.columns,rows:opts.rows,summaryRows:opts.summaryRows}]});
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#15493B 0%,#0f3329 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-emerald/70"/><span className="text-[10px] font-bold tracking-widest text-emerald/70 uppercase">District Level · {ROLE_LABELS[user.role]||'District'}</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{user.title||'District Feeding Management'}</p>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Export</Button>
          </div>
        </div>
        {missingToday.length>0&&(
          <div className="relative z-10 mt-3 flex items-center gap-2 bg-rust/20 border border-rust/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-rust flex-shrink-0"/>
            <span className="text-sm text-rust font-medium">{missingToday.length} school{missingToday.length!==1?'s':''} haven't reported today</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Schools"         value={fmtNum(schools.length)}          icon={School}       tone="forest"/>
        <KPI label="Reported Today"  value={`${fmtNum(approvedToday.length)}/${fmtNum(schools.length)}`} icon={CheckCircle2} tone={approvedToday.length===schools.length?'emerald':'amber'}/>
        <KPI label="Compliance"      value={`${compRate}%`}                   icon={Target}       tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
        <KPI label="Total Paid"      value={cedis(totalPaid)}                 icon={CreditCard}   tone="emerald"/>
        <KPI label="Arrears"         value={cedis(totalArrears)}              icon={AlertTriangle} tone={totalArrears>0?'rust':'emerald'}/>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-ink mb-4">Monthly Meals Trend</h3>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly}>
                <defs><linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Area type="monotone" dataKey="meals" stroke="#15493B" fill="url(#distGrad)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          ):<p className="text-stone-300 text-sm text-center py-16">No data yet</p>}
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber"/>Top Caterers</h3>
          {caterers.length===0?<p className="text-stone-300 text-sm text-center py-16">No caterer data</p>:(
            <div className="space-y-2.5">
              {caterers.slice(0,5).map((cat,i)=>(
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-stone-50 last:border-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{background:i===0?'#C9882C':i===1?'#9ca3af':i===2?'#a16207':'#f3f4f6',color:i<3?'white':'#374151'}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{cat.name||'—'}</div>
                    <div className="text-xs text-stone-400">{fmtNum(cat.approved||0)} approved</div>
                  </div>
                  <div className="text-sm font-bold font-mono text-forest">{fmtNum(cat.meals||0)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Live school grid */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Zap className="w-4 h-4 text-amber"/>Live School Status — Today</h3>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald"/>Approved</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber"/>Pending</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rust"/>Missing</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {schools.map(s=>{
            const rep = todayReps.find(r=>r.school_id===(s._id||s.id));
            const isApproved = rep?.status==='approved';
            return (
              <div key={s._id||s.id} onClick={()=>setSel(s)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${isApproved?'border-emerald/30 bg-emerald/5':rep?'border-amber/30 bg-amber/5':'border-rust/20 bg-rust/5'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-ink truncate">{s.name}</span>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-1 ${isApproved?'bg-emerald animate-pulse':rep?'bg-amber animate-pulse':'bg-rust'}`}/>
                </div>
                <div className="text-xs text-stone-400">{s.town} · {fmtNum(s.enrolled)} pupils</div>
                {rep
                  ? <div className={`mt-1.5 text-xs font-medium ${isApproved?'text-emerald':'text-amber'}`}>{isApproved?`✓ ${fmtNum(rep.students_fed)} fed`:`⏳ Pending`}</div>
                  : <div className="mt-1.5 text-xs font-medium text-rust">✗ No report today</div>
                }
              </div>
            );
          })}
          {schools.length===0&&<p className="col-span-full text-stone-300 text-sm text-center py-6">No schools in this district</p>}
        </div>
      </Card>

      {/* School performance table */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink flex items-center gap-2"><BarChart3 className="w-4 h-4 text-navy"/>School Performance Ranking</h3>
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
                <th className="text-left px-4 py-3">Caterer</th>
                <th className="text-right px-4 py-3">Enrolled</th>
                <th className="text-right px-4 py-3">Reports</th>
                <th className="text-right px-4 py-3">Approved</th>
                <th className="text-center px-4 py-3">Compliance</th>
                <th className="text-center px-4 py-3">Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {schoolPerf.map((s,i)=>{
                const tone = s.rate>=90?'emerald':s.rate>=70?'amber':'rust';
                const rep  = todayReps.find(r=>r.school_id===(s._id||s.id));
                return (
                  <tr key={s._id||s.id} className="hover:bg-paper cursor-pointer" onClick={()=>setSel(s)}>
                    <td className="px-4 py-3 text-center">{i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                    <td className="px-4 py-3"><div className="font-semibold text-ink text-sm">{s.name}</div><div className="text-xs text-stone-400">{s.town}</div></td>
                    <td className="px-4 py-3 text-xs text-stone-500">{s.caterer?.name||'—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.enrolled)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.reports)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(s.approved)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-stone-100 rounded-full"><div className={`h-full bg-${tone} rounded-full`} style={{width:`${s.rate}%`}}/></div>
                        <span className={`text-xs font-bold text-${tone}`}>{s.rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rep?<Pill tone={rep.status==='approved'?'emerald':'amber'}>{rep.status==='approved'?'✓':'⏳'}</Pill>:<Pill tone="rust">Missing</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {schools.length===0&&<div className="p-8 text-center text-stone-300 text-sm">No schools data</div>}
        </div>
      </Card>

      {/* Payments summary */}
      {payments.length>0&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald"/>Payment Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Total Paid',cedis(totalPaid),'emerald'],['Total Arrears',cedis(totalArrears),totalArrears>0?'rust':'emerald'],['Records',fmtNum(payments.length),'navy'],['Fully Paid',fmtNum(payments.filter(p=>p.status==='fully-paid').length),'forest']].map(([l,v,t])=>(
              <div key={l} className={`bg-${t}/5 border border-${t}/20 rounded-xl p-3 text-center`}>
                <div className={`text-lg font-bold font-serif text-${t}`}>{v}</div>
                <div className="text-xs text-stone-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* School detail modal */}
      <Modal open={!!selSch} onClose={()=>setSel(null)} title={selSch?.name||''} size="lg">
        {selSch&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[['Town',selSch.town],['Enrolled',fmtNum(selSch.enrolled)],['Caterer',selSch.caterer?.name||'—'],['Compliance',`${schoolPerf.find(s=>(s._id||s.id)===(selSch._id||selSch.id))?.rate||0}%`]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
              ))}
            </div>
            {selPayment&&(
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald/5 rounded-xl p-3"><div className="text-xs text-stone-400">Amount Paid</div><div className="font-bold text-emerald">{cedis(selPayment.amount_paid)}</div></div>
                <div className="bg-rust/5 rounded-xl p-3"><div className="text-xs text-stone-400">Arrears</div><div className={`font-bold ${selPayment.arrears_amount>0?'text-rust':'text-emerald'}`}>{cedis(selPayment.arrears_amount)}</div></div>
              </div>
            )}
            <h4 className="font-semibold text-ink text-sm">Recent Reports</h4>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {selReports.length===0?<p className="text-stone-300 text-sm text-center py-4">No reports</p>:selReports.map(r=>(
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
