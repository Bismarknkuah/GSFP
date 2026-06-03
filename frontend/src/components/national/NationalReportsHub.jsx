import { useEffect, useState, useMemo } from 'react';
import { FileText, Download, Eye, AlertTriangle, Filter, Search, CheckCircle2, XCircle, Clock, BarChart3 } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import Pill from '../ui/Pill';
import EmptyState from '../ui/EmptyState';
import { fmtDate, fmtNum, daysAgoISO } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';

// ── Anomaly detection ────────────────────────────────────────────────────────
function detectAnomalies(report) {
  const flags = [];
  const school = report.school;
  if (school?.enrolled && report.students_fed > school.enrolled * 1.05)
    flags.push({ type:'over-count', msg:`Fed ${report.students_fed} but only ${school.enrolled} enrolled` });
  if (report.students_fed < 10)
    flags.push({ type:'suspiciously-low', msg:`Only ${report.students_fed} pupils reported` });
  const hour = report.submitted_at ? new Date(report.submitted_at).getHours() : null;
  if (hour !== null && (hour < 6 || hour > 22))
    flags.push({ type:'odd-time', msg:`Submitted at ${hour}:00 (unusual hour)` });
  return flags;
}

function AnomalyBadge({ flags }) {
  if (!flags.length) return null;
  return (
    <div className="flex items-center gap-1" title={flags.map(f=>f.msg).join('\n')}>
      <AlertTriangle className="w-3.5 h-3.5 text-amber"/>
      <span className="text-xs text-amber font-medium">Flagged</span>
    </div>
  );
}

export default function NationalReportsHub() {
  const [reports,   setR]   = useState([]);
  const [regions,   setReg] = useState([]);
  const [districts, setDst] = useState([]);
  const [status,    setSt]  = useState('');
  const [regionId,  setRI]  = useState('');
  const [districtId,setDI]  = useState('');
  const [from,      setFrom]= useState(daysAgoISO(30));
  const [to,        setTo]  = useState('');
  const [search,    setSrch]= useState('');
  const [loading,   setLoad]= useState(true);
  const [detail,    setDet] = useState(null);
  const [anomalyOnly,setAno]= useState(false);

  const load = () => {
    setLoad(true);
    const p = {};
    if (status) p.status=status; if (regionId) p.regionId=regionId;
    if (districtId) p.districtId=districtId; if (from) p.from=from; if (to) p.to=to;
    api.reports.list(p).then(({reports})=>setR(reports||[])).catch(console.error).finally(()=>setLoad(false));
  };

  useEffect(()=>{
    Promise.all([api.regions.list(), api.districts.list()])
      .then(([{regions},{districts}])=>{ setReg(regions); setDst(districts); }).catch(()=>{});
  },[]);
  useEffect(()=>{ load(); },[status,regionId,districtId,from,to]);

  const filteredDists = regionId ? districts.filter(d=>d.region_id===regionId) : districts;

  const visibleReports = useMemo(()=>{
    let r = reports;
    if (search) { const q=search.toLowerCase(); r=r.filter(rep=>(rep.school?.name||'').toLowerCase().includes(q)||(rep.caterer?.name||'').toLowerCase().includes(q)||(rep.food_type||'').toLowerCase().includes(q)); }
    if (anomalyOnly) r=r.filter(rep=>detectAnomalies(rep).length>0);
    return r;
  },[reports,search,anomalyOnly]);

  const stats = {
    total:visibleReports.length,
    approved:visibleReports.filter(r=>r.status==='approved').length,
    pending:visibleReports.filter(r=>r.status==='pending').length,
    rejected:visibleReports.filter(r=>r.status==='rejected').length,
    meals:visibleReports.filter(r=>r.status==='approved').reduce((s,r)=>s+r.students_fed,0),
    anomalies:visibleReports.filter(r=>detectAnomalies(r).length>0).length,
  };

  const doExportPDF = () => exportPDF({
    title:'National Reports — Feeding Data', subtitle:`Period: ${from||'All'} to ${to||'Present'} | ${stats.total} reports`,
    columns:['Date','School','Caterer','Food Type','Students Fed','District','Status','Anomaly'],
    rows:visibleReports.map(r=>[fmtDate(r.date),r.school?.name||'—',r.caterer?.name||'—',r.food_type||'—',fmtNum(r.students_fed),r.district_id||'—',r.status,detectAnomalies(r).length>0?'⚠ Flagged':'OK']),
    filename:'GSFP_Reports.pdf', orientation:'landscape',
    summaryRows:[{label:'Approved',value:stats.approved},{label:'Pending',value:stats.pending},{label:'Total Meals',value:fmtNum(stats.meals)},{label:'Anomalies',value:stats.anomalies}],
  });

  const doExportExcel = () => exportExcel({
    filename:'GSFP_Reports.xlsx',
    sheets:[{ name:'Feeding Reports', columns:['Date','School','Town','Caterer','Food Type','Students Fed','Time Ready','Time Served','Status','Reviewer','Anomaly','Notes'],
      rows:visibleReports.map(r=>[r.date,r.school?.name||'—',r.school?.town||'—',r.caterer?.name||'—',r.food_type||'—',r.students_fed,r.time_ready||'—',r.time_served||'—',r.status,r.reviewer?.name||'—',detectAnomalies(r).map(f=>f.msg).join('; ')||'None',r.notes||'—']),
      summaryRows:[{label:'Total Reports',value:stats.total},{label:'Approved',value:stats.approved},{label:'Total Meals Served',value:stats.meals}],
    }],
  });

  return (
    <>
      <PageHeader title="National Reports Hub" subtitle="All feeding reports — filter, analyse, export and flag anomalies.">
        <div className="flex gap-2">
          <Button icon={Download} variant="secondary" size="sm" onClick={doExportPDF}>PDF</Button>
          <Button icon={Download} variant="secondary" size="sm" onClick={doExportExcel}>Excel</Button>
        </div>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-5">
        {[
          ['Total',     stats.total,     'stone',   false],
          ['Approved',  stats.approved,  'emerald', false],
          ['Pending',   stats.pending,   'amber',   false],
          ['Rejected',  stats.rejected,  'rust',    false],
          ['Meals',     fmtNum(stats.meals),'forest',false],
          ['⚠ Flagged', stats.anomalies, 'amber',   true ],
        ].map(([l,v,t,isAno])=>(
          <Card key={l} className={`text-center py-3 cursor-pointer border-2 transition-all ${(isAno&&anomalyOnly)||(l.toLowerCase()===status)||(!status&&!anomalyOnly&&l==='Total')?'border-forest':'border-transparent hover:border-stone-200'}`}
            onClick={()=>{ if(isAno){setAno(!anomalyOnly);setSt('');}else{setSt(l==='Total'?'':l.toLowerCase());setAno(false);} }}>
            <div className={`text-xl font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-[10px] text-stone-400 mt-0.5 uppercase tracking-wider">{l}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <Input icon={Search} placeholder="School, caterer, food..." value={search} onChange={e=>setSrch(e.target.value)} className="md:col-span-2"/>
          <Select value={status} onChange={e=>{setSt(e.target.value);setAno(false);}}
            options={[{value:'',label:'All statuses'},{value:'pending',label:'Pending'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'}]}/>
          <Select value={regionId} onChange={e=>{setRI(e.target.value);setDI('');}}
            options={[{value:'',label:'All regions'},...regions.map(r=>({value:r._id||r.id,label:r.name}))]}/>
          <Select value={districtId} onChange={e=>setDI(e.target.value)}
            options={[{value:'',label:'All districts'},...filteredDists.map(d=>({value:d._id||d.id,label:d.name}))]}/>
          <div className="flex gap-2">
            <Input type="date" label="" value={from} onChange={e=>setFrom(e.target.value)}/>
            <Input type="date" label="" value={to}   onChange={e=>setTo(e.target.value)}/>
          </div>
        </div>
        {anomalyOnly && (
          <div className="mt-3 flex items-center gap-2 bg-amber/10 text-amber rounded-lg px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4"/>
            <span>Showing {stats.anomalies} anomalous reports only</span>
            <button onClick={()=>setAno(false)} className="ml-auto text-xs underline">Clear</button>
          </div>
        )}
      </Card>

      <Card noPadding>
        {loading ? <div className="p-8 text-center text-stone-300 text-sm">Loading reports...</div>
        : visibleReports.length===0 ? <EmptyState icon={FileText} title="No reports found" description="Adjust your filters to find reports."/>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">School</th>
                  <th className="text-left px-4 py-3">Caterer</th>
                  <th className="text-left px-4 py-3">Food</th>
                  <th className="text-right px-4 py-3">Fed</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Flags</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visibleReports.map(r=>{
                  const flags=detectAnomalies(r);
                  return (
                    <tr key={r._id||r.id} className={`hover:bg-paper ${flags.length>0?'bg-amber/5':''}`}>
                      <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs text-ink">{r.school?.name||'—'}</div>
                        <div className="text-[10px] text-stone-400">{r.school?.town}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">{r.caterer?.name||'—'}</td>
                      <td className="px-4 py-3 text-xs text-stone-600 max-w-[150px] truncate">{r.food_type||'—'}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${flags.some(f=>f.type==='over-count')?'text-amber':'text-ink'}`}>{fmtNum(r.students_fed)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={r.status}/></td>
                      <td className="px-4 py-3 text-center"><AnomalyBadge flags={flags}/></td>
                      <td className="px-4 py-3">
                        <button onClick={()=>setDet(r)} className="p-1 hover:bg-cream rounded"><Eye className="w-3.5 h-3.5 text-forest"/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={()=>setDet(null)} title="Report Details" size="lg">
        {detail&&(
          <div className="space-y-4">
            {detectAnomalies(detail).length>0&&(
              <div className="bg-amber/10 border border-amber/30 rounded-xl p-3">
                <div className="flex items-center gap-2 font-semibold text-amber text-sm mb-1"><AlertTriangle className="w-4 h-4"/>Anomalies Detected</div>
                {detectAnomalies(detail).map((f,i)=><div key={i} className="text-xs text-amber">{f.msg}</div>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Date',fmtDate(detail.date)],['School',detail.school?.name],['Town',detail.school?.town],['Enrolled',fmtNum(detail.school?.enrolled)],['Caterer',detail.caterer?.name],['Food Served',detail.food_type],['Students Fed',fmtNum(detail.students_fed)],['Time Ready',detail.time_ready||'—'],['Time Served',detail.time_served||'—'],['Submitted',detail.submitted_at?new Date(detail.submitted_at).toLocaleString('en-GH'):'—'],['Reviewed By',detail.reviewer?.name||'Pending'],['Comment',detail.headmaster_comment||'—']].map(([l,v])=>(
                <div key={l}><span className="text-xs text-stone-400 font-medium">{l}</span><div className="font-semibold text-ink">{v||'—'}</div></div>
              ))}
            </div>
            {detail.image_path && (
              <div>
                <p className="text-xs font-medium text-stone-400 mb-2 flex items-center gap-1"><FileText className="w-3 h-3"/>Photo Evidence</p>
                <img src={detail.image_path} alt="Feeding evidence" className="w-full max-h-64 object-cover rounded-xl border border-stone-100"/>
              </div>
            )}
            {detail.notes&&<div className="bg-cream rounded-xl p-3 text-sm text-stone-600"><span className="font-medium">Notes: </span>{detail.notes}</div>}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-100"><StatusBadge status={detail.status}/></div>
          </div>
        )}
      </Modal>
    </>
  );
}
