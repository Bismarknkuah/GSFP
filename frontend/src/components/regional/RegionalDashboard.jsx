import { useEffect, useState, useCallback } from 'react';
import { MapPin, School, Users, TrendingUp, DollarSign, FileText, CreditCard, BarChart3, Globe, CheckCircle2, AlertTriangle, Clock, Activity, Award, Download, RefreshCw, ChevronRight, Target } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import { fmtNum, fmtDate, cedis, ROLE_LABELS } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, ComposedChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function RegionalDashboard({ onNavigate }) {
  const { user }   = useAuth();
  const [counters, setCtr]  = useState(null);
  const [districts,setDst]  = useState([]);
  const [monthly,  setMon]  = useState([]);
  const [payments, setPay]  = useState([]);
  const [caterers, setCat]  = useState([]);
  const [reports,  setRep]  = useState([]);
  const [selDist,  setSel]  = useState(null);
  const [loading,  setLoad] = useState(true);
  const [ts,       setTs]   = useState(null);

  const load = useCallback(()=>{
    setLoad(true);
    Promise.allSettled([
      api.analytics.overview(),
      api.districts.list(),
      api.analytics.monthly(),
      api.payments.list(),
      api.analytics.caterers(),
      api.reports.list({limit:200}),
    ]).then(([ov,dst,mo,pay,cat,rep])=>{
      if(ov.status==='fulfilled')  setCtr(ov.value?.counters||{});
      if(dst.status==='fulfilled') setDst(dst.value?.districts||[]);
      if(mo.status==='fulfilled')  setMon(mo.value?.monthly||[]);
      if(pay.status==='fulfilled') setPay(pay.value?.payments||[]);
      if(cat.status==='fulfilled') setCat(cat.value?.caterers||[]);
      if(rep.status==='fulfilled') setRep(rep.value?.reports||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).finally(()=>setLoad(false));
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,90000); return()=>clearInterval(t); },[]);

  const c = counters||{};
  const totalPaid    = payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const totalArrears = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const totalReports = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const compRate     = totalReports>0?Math.round((c.approved_reports||0)/totalReports*100):0;

  // District performance
  const distPerf = districts.map((d,i)=>{
    const dReps = reports.filter(r=>r.district_id===(d._id||d.id));
    const approved = dReps.filter(r=>r.status==='approved').length;
    const total    = dReps.length||1;
    const rate     = Math.round(approved/total*100);
    return { ...d, reports:dReps.length, approved, rate, meals:approved*(c.schools||0)*200 };
  }).sort((a,b)=>b.rate-a.rate);

  // Status pie
  const statusPie = [
    {name:'Approved',value:c.approved_reports||0},
    {name:'Pending', value:c.pending_reports||0},
    {name:'Rejected',value:c.rejected_reports||0},
  ].filter(p=>p.value>0);

  // District detail reports
  const distReports = selDist ? reports.filter(r=>r.district_id===(selDist._id||selDist.id)).slice(0,10) : [];
  const distPayments= selDist ? payments.filter(p=>p.district_id===(selDist._id||selDist.id)) : [];

  const doExport = (type) => {
    const opts = {
      title:`Regional Dashboard Report — ${user.name}`,
      subtitle:`Region: ${user.region_id||'—'} · Generated: ${new Date().toLocaleString('en-GH')}`,
      columns:['District','Schools','Reports','Approved','Compliance %'],
      rows: distPerf.map(d=>[d.name, d.school_count||0, d.reports, d.approved, `${d.rate}%`]),
      summaryRows:[
        {label:'Total Paid',     value:cedis(totalPaid)},
        {label:'Total Arrears',  value:cedis(totalArrears)},
        {label:'Compliance Rate',value:`${compRate}%`},
        {label:'Schools',        value:fmtNum(c.schools||0)},
      ],
      filename:`GSFP_Regional_${new Date().toISOString().slice(0,10)}`,
    };
    if(type==='pdf') exportPDF({...opts,filename:opts.filename+'.pdf',orientation:'landscape'});
    else exportExcel({filename:opts.filename+'.xlsx',sheets:[
      {name:'District Performance',columns:opts.columns,rows:opts.rows,summaryRows:opts.summaryRows},
      {name:'Monthly Trend',columns:['Month','Meals','Reports'],rows:monthly.map(m=>[m.month,m.meals||0,m.reports||0])},
      {name:'Top Caterers',columns:['Caterer','Approved','Pending','Total Meals'],rows:caterers.map(cat=>[cat.name||'—',cat.approved||0,cat.pending||0,cat.meals||0])},
    ]});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{background:'linear-gradient(135deg,#1e3a5f 0%,#142d4c 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-blue-300"/><span className="text-xs font-bold tracking-widest text-blue-300/70 uppercase">Regional Oversight</span></div>
            <h1 className="font-serif text-2xl font-bold text-white">Regional Dashboard</h1>
            <p className="text-white/50 text-sm mt-1">{user.name} · {ROLE_LABELS[user.role]}</p>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">Updated: {ts}</span>}
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/><span className="text-xs text-blue-300">Live</span></div>
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Export</Button>
          </div>
        </div>
        {totalArrears>0&&(
          <div className="relative z-10 mt-4 flex items-center gap-3 bg-amber/15 border border-amber/30 rounded-xl px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0"/>
            <span className="text-sm text-amber font-medium">Total arrears in region: <strong>{cedis(totalArrears)}</strong></span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Districts"        value={fmtNum(districts.length)}         icon={MapPin}        tone="navy"/>
        <KPI label="Schools"          value={fmtNum(c.schools||0)}             icon={School}        tone="forest"/>
        <KPI label="Caterers"         value={fmtNum(c.caterers||0)}            icon={Users}         tone="emerald"/>
        <KPI label="Meals This Month" value={fmtNum(c.meals_this_month||0)}    icon={TrendingUp}    tone="amber"/>
        <KPI label="Compliance Rate"  value={`${compRate}%`}                   icon={Target}        tone={compRate>=90?'emerald':compRate>=70?'amber':'rust'}/>
      </div>

      {/* Finance summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          ['Total Paid',     cedis(totalPaid),    'emerald', CheckCircle2],
          ['Total Arrears',  cedis(totalArrears), totalArrears>0?'rust':'emerald', AlertTriangle],
          ['Pending Reports',fmtNum(c.pending_reports||0), c.pending_reports>0?'amber':'emerald', Clock],
        ].map(([l,v,t,Icon])=>(
          <Card key={l} className="flex items-center gap-4 py-4">
            <div className={`w-11 h-11 rounded-xl bg-${t}/10 flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 text-${t}`}/>
            </div>
            <div>
              <div className="text-xs text-stone-400 uppercase tracking-wider">{l}</div>
              <div className={`text-xl font-bold font-serif text-${t}`}>{v}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">Monthly Meals Trend</h3>
              <Pill tone="navy">{monthly.length} months</Pill>
            </div>
            {monthly.length>0?(
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={monthly}>
                  <defs><linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.3}/><stop offset="95%" stopColor="#1E3A5F" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                  <YAxis yAxisId="left"  tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}}/>
                  <Tooltip formatter={(v,n)=>[fmtNum(v),n==='meals'?'Meals':'Reports']}/>
                  <Area  yAxisId="left"  type="monotone" dataKey="meals"   name="meals"   stroke="#1E3A5F" fill="url(#regGrad)" strokeWidth={2.5}/>
                  <Bar   yAxisId="right" dataKey="reports" name="reports"  fill="#C9882C" radius={[2,2,0,0]} opacity={0.7}/>
                </ComposedChart>
              </ResponsiveContainer>
            ):<p className="text-stone-300 text-sm text-center py-16">No data yet</p>}
          </Card>
        </div>

        <Card>
          <h3 className="font-semibold text-ink mb-3 text-sm">Report Status</h3>
          {statusPie.length>0?(
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart><Pie data={statusPie} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} fontSize={9}>
                  {statusPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}
                </Pie><Tooltip/></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {[['Approved',c.approved_reports||0,'emerald'],['Pending',c.pending_reports||0,'amber'],['Rejected',c.rejected_reports||0,'rust']].map(([l,v,t])=>(
                  <div key={l} className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">{l}</span>
                    <span className={`font-bold text-${t}`}>{fmtNum(v)}</span>
                  </div>
                ))}
              </div>
            </>
          ):<p className="text-stone-300 text-sm text-center py-8">No data</p>}
        </Card>
      </div>

      {/* District performance */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink flex items-center gap-2"><MapPin className="w-4 h-4 text-navy"/>District Performance</h3>
          <div className="flex gap-2">
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('pdf')}>PDF</Button>
            <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Excel</Button>
          </div>
        </div>
        {distPerf.length===0
          ? <p className="p-8 text-center text-stone-300 text-sm">No districts found</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-center px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">District</th>
                    <th className="text-left px-4 py-3">Capital</th>
                    <th className="text-right px-4 py-3">Reports</th>
                    <th className="text-right px-4 py-3">Approved</th>
                    <th className="text-center px-4 py-3">Compliance</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="px-4 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {distPerf.map((d,i)=>{
                    const level = d.rate>=90?'emerald':d.rate>=70?'amber':'rust';
                    return (
                      <tr key={d._id||d.id} className="hover:bg-paper cursor-pointer" onClick={()=>setSel(d)}>
                        <td className="px-4 py-3 text-center">{i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{d.name}</td>
                        <td className="px-4 py-3 text-xs text-stone-500">{d.capital||'—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(d.reports)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(d.approved)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 h-1.5 bg-stone-100 rounded-full">
                              <div className={`h-full rounded-full bg-${level}`} style={{width:`${d.rate}%`}}/>
                            </div>
                            <span className={`text-xs font-bold text-${level}`}>{d.rate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center"><Pill tone={d.rate>=90?'emerald':d.rate>=70?'amber':'rust'}>{d.rate>=90?'Excellent':d.rate>=70?'Good':'Needs Attention'}</Pill></td>
                        <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-stone-300"/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>

      {/* Top caterers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber"/>Top Caterers — Regional</h3>
          {caterers.length===0
            ? <p className="text-stone-300 text-sm text-center py-6">No caterer data</p>
            : (
              <div className="space-y-2.5">
                {caterers.slice(0,6).map((cat,i)=>(
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-stone-50 last:border-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{background:i===0?'#C9882C':i===1?'#9ca3af':i===2?'#a16207':'#f3f4f6',color:i<3?'white':'#374151'}}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{cat.name||'—'}</div>
                      <div className="text-xs text-stone-400">{fmtNum(cat.approved||0)} approved reports</div>
                    </div>
                    <div className="text-sm font-bold font-mono text-forest">{fmtNum(cat.meals||0)}</div>
                  </div>
                ))}
              </div>
            )
          }
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-forest"/>District Compliance Chart</h3>
          {distPerf.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distPerf.slice(0,8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:9}} tickFormatter={n=>n.split(' ')[0]}/>
                <YAxis domain={[0,100]} tick={{fontSize:9}} tickFormatter={v=>`${v}%`}/>
                <Tooltip formatter={v=>[`${v}%`,'Compliance']}/>
                <Bar dataKey="rate" radius={[4,4,0,0]}>
                  {distPerf.slice(0,8).map((d,i)=>(
                    <Cell key={i} fill={d.rate>=90?'#059669':d.rate>=70?'#1E3A5F':d.rate>=50?'#C9882C':'#C0392B'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ):<p className="text-stone-300 text-sm text-center py-12">No data</p>}
        </Card>
      </div>

      {/* District detail modal */}
      <Modal open={!!selDist} onClose={()=>setSel(null)} title={selDist?.name||''} size="lg">
        {selDist&&(
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[['Capital',selDist.capital||'—'],['Reports',fmtNum(distReports.length)],['Compliance',`${selDist.rate||0}%`]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3 text-center"><div className="text-xs text-stone-400">{l}</div><div className="font-bold text-ink">{v}</div></div>
              ))}
            </div>
            {distPayments.length>0&&(
              <div>
                <h4 className="font-semibold text-ink text-sm mb-2">Payment Summary</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald/5 rounded-xl p-3"><div className="text-xs text-stone-400">Paid</div><div className="font-bold text-emerald">{cedis(distPayments.reduce((s,p)=>s+p.amount_paid,0))}</div></div>
                  <div className="bg-rust/5 rounded-xl p-3"><div className="text-xs text-stone-400">Arrears</div><div className="font-bold text-rust">{cedis(distPayments.reduce((s,p)=>s+p.arrears_amount,0))}</div></div>
                </div>
              </div>
            )}
            <h4 className="font-semibold text-ink text-sm">Recent Reports</h4>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {distReports.length===0?<p className="text-stone-300 text-sm text-center py-4">No reports</p>
              :distReports.map(r=>(
                <div key={r._id||r.id} className={`flex items-center justify-between p-3 rounded-xl border ${r.status==='approved'?'border-emerald/20 bg-emerald/5':'border-amber/20 bg-amber/5'}`}>
                  <div>
                    <div className="text-sm font-medium text-ink">{fmtDate(r.date)} · {r.food_type}</div>
                    <div className="text-xs text-stone-400">{r.school?.name} · {fmtNum(r.students_fed)} pupils</div>
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
