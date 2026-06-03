import { useEffect, useState } from 'react';
import { DollarSign, Plus, CheckCircle2, AlertCircle, Download, ChevronRight, TrendingDown, TrendingUp, Clock, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import StatusBadge from '../ui/StatusBadge';
import { cedis, fmtDate, fmtNum } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FLOW_STEPS = ['National Budget','Regional Allocation','District Disbursement','Caterer Payment'];

export default function NationalFinance() {
  const { user } = useAuth();
  const [summary,   setSm]  = useState(null);
  const [budgets,   setBu]  = useState([]);
  const [allocs,    setAl]  = useState([]);
  const [payments,  setPy]  = useState([]);
  const [regions,   setReg] = useState([]);
  const [districts, setDst] = useState([]);
  const [modal,     setMod] = useState(null);
  const [form,      setFrm] = useState({});
  const [err,       setErr] = useState(null);
  const [ok,        setOk]  = useState(null);
  const [busy,      setBusy]= useState(false);
  const [tab,       setTab] = useState('overview');
  const s = (k,v) => setFrm(f=>({...f,[k]:v}));

  const load = () => Promise.all([
    api.finance.summary(), api.finance.budgets(), api.finance.allocations(),
    api.payments.list(), api.regions.list(), api.districts.list(),
  ]).then(([sm,{budgets},{allocations},{payments},{regions},{districts}])=>{
    setSm(sm); setBu(budgets); setAl(allocations); setPy(payments); setReg(regions); setDst(districts);
  }).catch(console.error);

  useEffect(()=>{ load(); },[]);

  const canManage = ['super_admin','national_finance','national_admin'].includes(user.role);
  const nat = summary?.national || {};
  const paySm = summary?.payments_summary || {};

  const saveBudget = async () => {
    setBusy(true); setErr(null);
    try { await api.finance.createBudget(form); setOk('Budget created.'); setMod(null); load(); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };
  const saveAlloc = async () => {
    setBusy(true); setErr(null);
    try { await api.finance.createAllocation(form); setOk('Allocation created.'); setMod(null); load(); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };
  const approveAlloc = async (id) => {
    await api.finance.approveAllocation(id).catch(e=>setErr(e.message)); load();
  };

  const doExport = (type) => {
    const opts = {
      title:'National Finance Report', subtitle:`Generated: ${new Date().toLocaleString('en-GH')}`,
      columns:['Period','Caterer','Days Covered','Days Paid','Arrears','Amount Paid','Arrears Amount','Status'],
      rows:payments.map(p=>[p.period,p.caterer?.name||'—',p.days_covered,p.days_paid,p.days_arrears,cedis(p.amount_paid),cedis(p.arrears_amount),p.status]),
      filename:'GSFP_Finance',
      summaryRows:[{label:'Total Paid',value:cedis(paySm.total_paid||0)},{label:'Total Arrears',value:cedis(paySm.total_arrears||0)},{label:'Payment Records',value:paySm.count||0}],
    };
    if (type==='pdf') exportPDF({...opts,filename:opts.filename+'.pdf',orientation:'landscape'});
    else exportExcel({ filename:opts.filename+'.xlsx', sheets:[{name:'Payments',columns:opts.columns,rows:opts.rows,summaryRows:opts.summaryRows}] });
  };

  const budgetPie = nat.total>0 ? [
    {name:'Disbursed',value:nat.disbursed||0},{name:'Allocated (not disbursed)',value:Math.max(0,(nat.allocated||0)-(nat.disbursed||0))},{name:'Available',value:nat.balance||0},
  ].filter(p=>p.value>0) : [];

  const pendingAllocs = allocs.filter(a=>a.status==='pending');

  return (
    <>
      <PageHeader title="National Finance Portal" subtitle="Budget management, fund allocation, payment tracking and reconciliation.">
        <div className="flex gap-2">
          <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('pdf')}>PDF</Button>
          <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Excel</Button>
          {canManage&&<Button icon={Plus} variant="secondary" size="sm" onClick={()=>{setMod('budget');setFrm({fiscal_year:'2025/2026',term:'Term 2',level:'national',total_amount:''});setErr(null);}}>New Budget</Button>}
          {canManage&&<Button icon={Plus} size="sm" onClick={()=>{setMod('alloc');setFrm({budget_id:'',to_level:'regional',region_id:'',district_id:'',amount:'',purpose:''});setErr(null);}}>Allocate Funds</Button>}
        </div>
      </PageHeader>

      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      {/* Pending approvals alert */}
      {pendingAllocs.length>0&&canManage&&(
        <div className="mb-4 flex items-center gap-3 bg-amber/10 border border-amber/30 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber flex-shrink-0"/>
          <span className="text-sm text-amber font-medium">{pendingAllocs.length} allocation{pendingAllocs.length!==1?'s':''} awaiting your approval</span>
          <button onClick={()=>setTab('allocations')} className="ml-auto text-xs text-amber underline">Review</button>
        </div>
      )}

      {/* Fund flow */}
      <Card className="mb-5">
        <h3 className="font-semibold text-ink mb-4">Fund Flow — National to Caterer</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {FLOW_STEPS.map((step,i)=>(
            <div key={step} className="flex items-center gap-2 flex-shrink-0">
              <div className={`px-4 py-3 rounded-xl text-center min-w-[140px] border-2 ${i===0?'border-forest bg-forest/10':i===1?'border-amber bg-amber/10':i===2?'border-emerald bg-emerald/10':'border-forest/50 bg-forest/5'}`}>
                <div className="text-xs text-stone-400 mb-1">Step {i+1}</div>
                <div className="text-sm font-semibold text-ink">{step}</div>
                {i===0&&nat.total>0&&<div className="text-xs font-bold text-forest mt-1">{cedis(nat.total)}</div>}
                {i===1&&nat.allocated>0&&<div className="text-xs font-bold text-amber mt-1">{cedis(nat.allocated)}</div>}
                {i===2&&nat.disbursed>0&&<div className="text-xs font-bold text-emerald mt-1">{cedis(nat.disbursed)}</div>}
                {i===3&&paySm.total_paid>0&&<div className="text-xs font-bold text-forest mt-1">{cedis(paySm.total_paid)}</div>}
              </div>
              {i<FLOW_STEPS.length-1&&<ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0"/>}
            </div>
          ))}
        </div>
      </Card>

      {/* Overview cards */}
      {nat.total>0&&(
        <div className="grid md:grid-cols-4 gap-3 mb-5">
          {[['Total Budget',nat.total,'forest',100],['Allocated',nat.allocated,'amber',nat.total>0?nat.allocated/nat.total*100:0],['Disbursed',nat.disbursed,'emerald',nat.total>0?nat.disbursed/nat.total*100:0],['Balance',nat.balance,nat.balance<nat.total*0.1?'rust':'emerald',nat.total>0?nat.balance/nat.total*100:0]].map(([l,v,t,pct])=>(
            <Card key={l} className="text-center py-4">
              <div className={`text-xl font-bold font-serif text-${t}`}>{cedis(v||0)}</div>
              <div className="text-xs text-stone-500 mt-0.5">{l}</div>
              <div className="h-1.5 bg-stone-100 rounded-full mt-2"><div className={`h-full bg-${t} rounded-full`} style={{width:`${Math.min(pct,100).toFixed(0)}%`}}/></div>
              <div className={`text-xs font-semibold text-${t} mt-0.5`}>{pct.toFixed(0)}%</div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['overview','budgets','allocations','payments'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${tab===t?'bg-forest text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            {t==='allocations'&&pendingAllocs.length>0&&<span className="bg-amber text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingAllocs.length}</span>}
          </button>
        ))}
      </div>

      {tab==='overview'&&(
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-ink mb-3">Budget Distribution</h3>
            {budgetPie.length>0&&budgetPie.some(p=>p.value>0)?(
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={budgetPie.filter(p=>p.value>0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine fontSize={9}>
                  {budgetPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#15493B'][i]}/>)}
                </Pie><Tooltip formatter={v=>[cedis(v)]}/></PieChart>
              </ResponsiveContainer>
            ):<div className="h-56 flex items-center justify-center text-stone-300 text-sm">Create a budget to see distribution</div>}
          </Card>
          <Card>
            <h3 className="font-semibold text-ink mb-3">Payment Summary</h3>
            <div className="space-y-3">
              {[['Records',paySm.count||0,'stone'],['Total Paid',cedis(paySm.total_paid||0),'emerald'],['Total Arrears',cedis(paySm.total_arrears||0),(paySm.total_arrears||0)>0?'rust':'emerald'],['Rate/Day/Pupil','GHS 2.00','forest']].map(([l,v,t])=>(
                <div key={l} className={`flex items-center justify-between p-3 bg-${t}/5 rounded-xl border border-${t}/15`}>
                  <span className="text-sm text-stone-600">{l}</span><span className={`font-bold text-${t}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab==='budgets'&&(
        <Card noPadding>
          {budgets.length===0?<div className="p-8 text-center text-stone-300 text-sm">No budgets yet — create one above</div>:(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-left px-4 py-3">Year / Term</th><th className="text-left px-4 py-3">Level</th><th className="text-right px-4 py-3">Total</th><th className="text-right px-4 py-3">Allocated</th><th className="text-right px-4 py-3">Disbursed</th><th className="text-right px-4 py-3">Balance</th><th className="text-center px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {budgets.map(b=>(
                    <tr key={b._id||b.id} className="hover:bg-paper">
                      <td className="px-4 py-3 font-semibold text-ink">{b.fiscal_year} — {b.term}</td>
                      <td className="px-4 py-3"><Pill tone={b.level==='national'?'navy':b.level==='regional'?'purple':'forest'}>{b.level}</Pill></td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{cedis(b.total_amount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber">{cedis(b.allocated)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald">{cedis(b.disbursed)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{cedis(b.balance)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={b.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab==='allocations'&&(
        <div className="space-y-3">
          {allocs.length===0?<Card><div className="text-center text-stone-300 text-sm py-6">No allocations yet</div></Card>
          :allocs.map(a=>(
            <Card key={a._id||a.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{cedis(a.amount)}</span>
                    <ChevronRight className="w-3 h-3 text-stone-300"/>
                    <span className="text-sm text-stone-600">{a.to_level} level</span>
                    {a.status==='pending'&&<Pill tone="amber">Awaiting approval</Pill>}
                  </div>
                  {a.purpose&&<div className="text-xs text-stone-500 mt-0.5">{a.purpose}</div>}
                  <div className="text-xs text-stone-400 mt-0.5">{fmtDate(a.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={a.status}/>
                  {a.status==='pending'&&canManage&&<Button size="sm" onClick={()=>approveAlloc(a._id||a.id)} icon={CheckCircle2}>Approve</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab==='payments'&&(
        <Card noPadding>
          {payments.length===0?<div className="p-8 text-center text-stone-300 text-sm">No payment records</div>:(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Days</th><th className="text-right px-4 py-3">Paid</th><th className="text-right px-4 py-3">Arrears</th><th className="text-right px-4 py-3">Amount</th><th className="text-center px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {payments.map(p=>(
                    <tr key={p._id||p.id} className="hover:bg-paper">
                      <td className="px-4 py-2.5 text-xs">{p.period}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-ink">{p.caterer?.name||'—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{p.days_covered}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald">{p.days_paid}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-semibold':''}`}>{p.days_arrears}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">{cedis(p.amount_paid)}</td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={p.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Budget modal */}
      <Modal open={modal==='budget'} onClose={()=>setMod(null)} title="Create Budget Line" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <Input label="Fiscal Year" value={form.fiscal_year||''} onChange={e=>s('fiscal_year',e.target.value)} placeholder="2025/2026" required/>
          <Select label="Term" value={form.term||''} onChange={e=>s('term',e.target.value)} options={['Term 1','Term 2','Term 3'].map(t=>({value:t,label:t}))}/>
          <Select label="Level" value={form.level||'national'} onChange={e=>s('level',e.target.value)} options={['national','regional','district'].map(l=>({value:l,label:l.charAt(0).toUpperCase()+l.slice(1)}))}/>
          <Input label="Total Amount (GHS)" type="number" value={form.total_amount||''} onChange={e=>s('total_amount',e.target.value)} required/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setMod(null)} disabled={busy}>Cancel</Button>
            <Button onClick={saveBudget} disabled={busy}>{busy?'Creating...':'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Allocation modal */}
      <Modal open={modal==='alloc'} onClose={()=>setMod(null)} title="Allocate Funds" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <Select label="From budget" value={form.budget_id||''} onChange={e=>s('budget_id',e.target.value)} required
            options={[{value:'',label:'Select budget...'},...budgets.filter(b=>b.balance>0).map(b=>({value:b._id||b.id,label:`${b.fiscal_year} ${b.term} — ${cedis(b.balance)} available`}))]}/>
          <Select label="Allocate to" value={form.to_level||'regional'} onChange={e=>s('to_level',e.target.value)} options={['regional','district'].map(l=>({value:l,label:l.charAt(0).toUpperCase()+l.slice(1)}))}/>
          {form.to_level==='regional'&&<Select label="Region" value={form.region_id||''} onChange={e=>s('region_id',e.target.value)} options={[{value:'',label:'Select region...'},...regions.map(r=>({value:r._id||r.id,label:r.name}))]}/>}
          {form.to_level==='district'&&<Select label="District" value={form.district_id||''} onChange={e=>s('district_id',e.target.value)} options={[{value:'',label:'Select district...'},...districts.map(d=>({value:d._id||d.id,label:d.name}))]}/>}
          <Input label="Amount (GHS)" type="number" value={form.amount||''} onChange={e=>s('amount',e.target.value)} required/>
          <Input label="Purpose / Description" value={form.purpose||''} onChange={e=>s('purpose',e.target.value)} placeholder="e.g. Term 2 caterer payments — Western North"/>
          <div className="bg-cream rounded-lg p-3 text-xs text-stone-500">This allocation will require approval before funds are disbursed.</div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setMod(null)} disabled={busy}>Cancel</Button>
            <Button onClick={saveAlloc} disabled={busy}>{busy?'Saving...':'Submit allocation'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
