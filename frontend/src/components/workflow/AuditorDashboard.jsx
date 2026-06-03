import { useEffect, useState } from 'react';
import { ShieldCheck, FileText, DollarSign, Download, Eye, BarChart3, TrendingDown, AlertTriangle, CheckCircle2, Search, Filter, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import EmptyState from '../ui/EmptyState';
import { fmtNum, cedis, fmtDate, fmtDateTime, daysAgoISO, ROLE_LABELS } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';

const TIER_LABEL = { auditor:'District Audit', regional_auditor:'Regional Audit', national_auditor:'National Audit' };

export default function AuditorDashboard() {
  const { user } = useAuth();
  const [payments,  setPay]   = useState([]);
  const [reports,   setRep]   = useState([]);
  const [overview,  setOv]    = useState(null);
  const [monthly,   setMon]   = useState([]);
  const [caterers,  setCat]   = useState([]);
  const [regions,   setReg]   = useState([]);
  const [districts, setDst]   = useState([]);
  const [tab,       setTab]   = useState('overview');
  const [detail,    setDet]   = useState(null);
  const [search,    setSrch]  = useState('');
  const [loading,   setLoad]  = useState(true);
  const [filters,   setFilt]  = useState({ regionId:'', districtId:'', status:'' });

  const isNational = user.role==='national_auditor';
  const isRegional = user.role==='regional_auditor';

  useEffect(()=>{
    setLoad(true);
    Promise.allSettled([
      api.analytics.overview(),
      api.payments.list(),
      api.reports.list({ limit:500 }),
      api.analytics.monthly(),
      api.analytics.caterers(),
      api.regions.list(),
      api.districts.list(),
    ]).then(([ov,pay,rep,mon,cat,reg,dst])=>{
      if(ov.status==='fulfilled')  setOv(ov.value);
      if(pay.status==='fulfilled') setPay(pay.value?.payments||[]);
      if(rep.status==='fulfilled') setRep(rep.value?.reports||[]);
      if(mon.status==='fulfilled') setMon(mon.value?.monthly||[]);
      if(cat.status==='fulfilled') setCat(cat.value?.caterers||[]);
      if(reg.status==='fulfilled') setReg(reg.value?.regions||[]);
      if(dst.status==='fulfilled') setDst(dst.value?.districts||[]);
    }).finally(()=>setLoad(false));
  },[]);

  const c = overview?.counters||{};
  const totalArrears  = payments.reduce((s,p)=>s+p.arrears_amount,0);
  const totalPaid     = payments.reduce((s,p)=>s+p.amount_paid,0);
  const compRate      = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0)>0
    ? Math.round((c.approved_reports||0)/((c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0))*100) : 0;

  // Anomaly detection
  const anomalies = reports.filter(r=>{
    const school = r.school;
    return school?.enrolled && r.students_fed > school.enrolled * 1.1;
  });

  // Arrears by caterer (sorted)
  const arrearsRanking = [...payments].filter(p=>p.days_arrears>0).sort((a,b)=>b.arrears_amount-a.arrears_amount);

  // Filtered payments for financial tab
  const filteredPayments = payments.filter(p=>{
    if (filters.regionId && p.region_id!==filters.regionId) return false;
    if (filters.districtId && p.district_id!==filters.districtId) return false;
    if (filters.status && p.status!==filters.status) return false;
    if (search && !( (p.caterer?.name||'').toLowerCase().includes(search.toLowerCase()) || (p.period||'').toLowerCase().includes(search.toLowerCase()) )) return false;
    return true;
  });

  const doExportFull = () => {
    exportExcel({
      filename:`GSFP_Audit_Report_${new Date().toISOString().slice(0,10)}.xlsx`,
      sheets:[
        { name:'Financial Summary', columns:['Period','Caterer','School','Days Covered','Days Paid','Arrears Days','Amount Paid','Arrears Amount','Status'],
          rows:payments.map(p=>[p.period,p.caterer?.name||'—',p.school?.name||'—',p.days_covered,p.days_paid,p.days_arrears,p.amount_paid,p.arrears_amount,p.status]),
          summaryRows:[{label:'Total Paid',value:totalPaid.toFixed(2)},{label:'Total Arrears',value:totalArrears.toFixed(2)}] },
        { name:'Feeding Reports', columns:['Date','School','Caterer','Food Type','Students Fed','Status','Approved By'],
          rows:reports.map(r=>[r.date,r.school?.name||'—',r.caterer?.name||'—',r.food_type,r.students_fed,r.status,r.reviewer?.name||'—']) },
        { name:'Anomalies', columns:['Date','School','Enrolled','Reported','Excess','Caterer'],
          rows:anomalies.map(r=>[r.date,r.school?.name||'—',r.school?.enrolled||0,r.students_fed,r.students_fed-(r.school?.enrolled||0),r.caterer?.name||'—']) },
      ]
    });
  };

  const statusPie = [
    {name:'Approved',value:c.approved_reports||0},{name:'Pending',value:c.pending_reports||0},{name:'Rejected',value:c.rejected_reports||0}
  ].filter(p=>p.value>0);

  return (
    <>
      <PageHeader title={TIER_LABEL[user.role]||'Audit Dashboard'} subtitle={`Full audit access — payments, arrears, compliance, and anomaly analysis.`}>
        <div className="flex gap-2">
          <Button icon={Download} variant="secondary" size="sm" onClick={()=>exportPDF({ title:`GSFP Audit Report`, subtitle:`Generated: ${new Date().toLocaleString('en-GH')}`, columns:['Period','Caterer','Days Paid','Arrears','Amount Paid','Status'], rows:payments.map(p=>[p.period,p.caterer?.name||'—',p.days_paid,p.days_arrears,cedis(p.amount_paid),p.status]), filename:'GSFP_Audit.pdf', summaryRows:[{label:'Total Paid',value:cedis(totalPaid)},{label:'Total Arrears',value:cedis(totalArrears)}] })}>PDF</Button>
          <Button icon={Download} variant="secondary" size="sm" onClick={doExportFull}>Excel</Button>
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="Total Paid" value={cedis(totalPaid)} icon={CheckCircle2} tone="emerald"/>
        <KPI label="Total Arrears" value={cedis(totalArrears)} icon={TrendingDown} tone={totalArrears>0?'rust':'emerald'}/>
        <KPI label="Compliance Rate" value={`${compRate}%`} icon={ShieldCheck} tone={compRate>=90?'emerald':'amber'}/>
        <KPI label="Anomalies" value={fmtNum(anomalies.length)} icon={AlertTriangle} tone={anomalies.length>0?'rust':'emerald'}/>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['overview','Overview'],['financial','Financial Audit'],['compliance','Compliance'],['anomalies',`Anomalies (${anomalies.length})`],['chain','Audit Chain']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-forest text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview'&&(
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-ink mb-4">Monthly Meals Trend</h3>
            {monthly.length>0?(
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthly}>
                  <defs><linearGradient id="audGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                  <Area type="monotone" dataKey="meals" stroke="#15493B" fill="url(#audGrad)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ):<p className="text-stone-300 text-sm text-center py-12">No data</p>}
          </Card>
          <Card>
            <h3 className="font-semibold text-ink mb-4">Report Status</h3>
            {statusPie.length>0?(
              <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={statusPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} fontSize={10}>{statusPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
            ):<p className="text-stone-300 text-sm text-center py-12">No data</p>}
          </Card>
          <Card className="lg:col-span-2">
            <h3 className="font-semibold text-ink mb-4">Top Arrears — Caterers</h3>
            {arrearsRanking.length===0?<p className="text-stone-300 text-sm text-center py-4">No arrears — all caterers fully paid</p>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500"><tr><th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Days Arrears</th><th className="text-right px-4 py-3">Arrears Amount</th><th className="text-right px-4 py-3">Total Paid</th><th className="text-center px-4 py-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-stone-50">
                    {arrearsRanking.slice(0,10).map((p,i)=>(
                      <tr key={p._id||p.id} className="hover:bg-paper cursor-pointer" onClick={()=>setDet(p)}>
                        <td className="px-4 py-3 text-stone-400 font-mono text-xs">{i+1}</td>
                        <td className="px-4 py-3"><div className="font-medium text-ink">{p.caterer?.name||'—'}</div><div className="text-xs text-stone-400">{p.period}</div></td>
                        <td className="px-4 py-3 text-right font-mono text-rust font-bold">{p.days_arrears}</td>
                        <td className="px-4 py-3 text-right font-mono text-rust font-bold">{cedis(p.arrears_amount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald">{cedis(p.amount_paid)}</td>
                        <td className="px-4 py-3 text-center"><Pill tone={p.status==='fully-paid'?'emerald':'rust'}>{p.status}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* FINANCIAL AUDIT */}
      {tab==='financial'&&(
        <>
          <Card className="mb-4">
            <div className="grid sm:grid-cols-4 gap-3">
              <Input icon={Search} placeholder="Search caterer/period..." value={search} onChange={e=>setSrch(e.target.value)} className="sm:col-span-2"/>
              {isNational&&<Select value={filters.regionId} onChange={e=>setFilt(f=>({...f,regionId:e.target.value}))} options={[{value:'',label:'All regions'},...regions.map(r=>({value:r._id||r.id,label:r.name}))]}/>}
              {(isNational||isRegional)&&<Select value={filters.districtId} onChange={e=>setFilt(f=>({...f,districtId:e.target.value}))} options={[{value:'',label:'All districts'},...districts.map(d=>({value:d._id||d.id,label:d.name}))]}/>}
              <Select value={filters.status} onChange={e=>setFilt(f=>({...f,status:e.target.value}))} options={[{value:'',label:'All status'},{value:'partial',label:'Partial'},{value:'fully-paid',label:'Fully Paid'},{value:'pending',label:'Pending'}]}/>
            </div>
          </Card>
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Covered</th><th className="text-right px-4 py-3">Paid</th><th className="text-right px-4 py-3">Arrears</th><th className="text-right px-4 py-3">Paid (GHS)</th><th className="text-right px-4 py-3">Arrears (GHS)</th><th className="text-center px-4 py-3">Status</th><th className="px-4 py-3"/></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredPayments.map(p=>(
                    <tr key={p._id||p.id} className="hover:bg-paper cursor-pointer" onClick={()=>setDet(p)}>
                      <td className="px-4 py-3 text-xs">{p.period}</td>
                      <td className="px-4 py-3"><div className="font-medium text-xs text-ink">{p.caterer?.name||'—'}</div><div className="text-[10px] text-stone-400">{p.school?.name||'—'}</div></td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{p.days_covered}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{p.days_paid}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-bold':''}`}>{p.days_arrears}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{cedis(p.amount_paid)}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${p.arrears_amount>0?'text-rust font-bold':''}`}>{cedis(p.arrears_amount)}</td>
                      <td className="px-4 py-3 text-center"><Pill tone={p.status==='fully-paid'?'emerald':'rust'}>{p.status}</Pill></td>
                      <td className="px-4 py-3"><Eye className="w-4 h-4 text-forest"/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayments.length===0&&<div className="p-8 text-center text-stone-300 text-sm">No records match your filters</div>}
            </div>
          </Card>
        </>
      )}

      {/* COMPLIANCE */}
      {tab==='compliance'&&(
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {[['Approved Reports',fmtNum(c.approved_reports||0),'emerald'],['Pending',fmtNum(c.pending_reports||0),'amber'],['Rejected',fmtNum(c.rejected_reports||0),'rust']].map(([l,v,t])=>(
              <Card key={l} className="text-center py-4"><div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div><div className="text-xs text-stone-400 mt-0.5">{l}</div></Card>
            ))}
          </div>
          <Card>
            <h3 className="font-semibold text-ink mb-4">Caterer Performance Ranking</h3>
            {caterers.length===0?<EmptyState icon={BarChart3} title="No caterer data"/>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500"><tr><th className="text-center px-4 py-3">#</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Approved</th><th className="text-right px-4 py-3">Pending</th><th className="text-right px-4 py-3">Total Meals</th><th className="text-center px-4 py-3">Rating</th></tr></thead>
                  <tbody className="divide-y divide-stone-50">
                    {caterers.map((cat,i)=>{
                      const rate=cat.approved+cat.pending>0?Math.round(cat.approved/(cat.approved+cat.pending)*100):0;
                      return <tr key={i} className="hover:bg-paper"><td className="px-4 py-2.5 text-center text-stone-400 font-mono text-xs">{i+1}</td><td className="px-4 py-2.5 font-medium text-ink">{cat.name||'—'}</td><td className="px-4 py-2.5 text-right text-emerald font-mono">{fmtNum(cat.approved||0)}</td><td className="px-4 py-2.5 text-right text-amber font-mono">{fmtNum(cat.pending||0)}</td><td className="px-4 py-2.5 text-right font-bold text-forest font-mono">{fmtNum(cat.meals||0)}</td><td className="px-4 py-2.5 text-center"><Pill tone={rate>=90?'emerald':rate>=70?'amber':'rust'}>{rate}%</Pill></td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ANOMALIES */}
      {tab==='anomalies'&&(
        <div className="space-y-3">
          {anomalies.length===0
            ? <Card><EmptyState icon={CheckCircle2} title="No anomalies detected" description="All reports are within expected ranges."/></Card>
            : anomalies.map(r=>(
              <Card key={r._id||r.id} className="border-rust/30 bg-rust/5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rust"/><span className="font-semibold text-ink">Over-count: {r.school?.name}</span></div>
                    <p className="text-sm text-stone-600 mt-1">Reported <strong>{fmtNum(r.students_fed)}</strong> pupils but school enrollment is only <strong>{fmtNum(r.school?.enrolled||0)}</strong>. Excess: <strong className="text-rust">{fmtNum(r.students_fed-(r.school?.enrolled||0))}</strong> ({Math.round((r.students_fed/(r.school?.enrolled||1)-1)*100)}% over).</p>
                    <p className="text-xs text-stone-400 mt-1">Date: {fmtDate(r.date)} · Caterer: {r.caterer?.name} · Food: {r.food_type}</p>
                  </div>
                  <Pill tone="rust">Flag</Pill>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* AUDIT CHAIN */}
      {tab==='chain'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">Audit Chain — Official Reports</h3>
          <OfficialReportsChain user={user}/>
        </Card>
      )}

      {/* Detail modal */}
      <Modal open={!!detail} onClose={()=>setDet(null)} title="Payment Details" size="md">
        {detail&&(
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[['Period',detail.period],['Caterer',detail.caterer?.name||'—'],['School',detail.school?.name||'—'],['Days Covered',detail.days_covered],['Days Paid',detail.days_paid],['Days Arrears',detail.days_arrears],['Amount Paid',cedis(detail.amount_paid)],['Arrears',cedis(detail.arrears_amount)],['Rate/Day/Pupil',`GHS ${detail.rate_per_student}`],['Reference',detail.reference||'—'],['Last Payment',fmtDate(detail.last_payment_date)],['Status',detail.status]].map(([l,v])=>(
                <div key={l}><span className="text-xs text-stone-400">{l}</span><div className={`font-semibold ${l==='Arrears'&&detail.arrears_amount>0?'text-rust':l==='Amount Paid'?'text-emerald':'text-ink'}`}>{v||'—'}</div></div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function OfficialReportsChain({ user }) {
  const [rpts, setRpts] = useState([]);
  useEffect(()=>{ api.officialReports.list({ box:'chain' }).then(({reports})=>setRpts(reports||[])).catch(()=>{}); },[]);
  if (!rpts.length) return <p className="text-stone-300 text-sm text-center py-8">No reports in audit chain yet</p>;
  return (
    <div className="space-y-2">
      {rpts.map(r=>(
        <div key={r._id||r.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
          <div><div className="font-semibold text-ink text-sm">{r.subject}</div><div className="text-xs text-stone-400">{r.submitted_by_name} · {r.period}</div></div>
          <Pill tone={r.status==='approved_final'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
        </div>
      ))}
    </div>
  );
}
