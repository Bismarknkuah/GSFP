import { useEffect, useState } from 'react';
import { DollarSign, Plus, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import { cedis, fmtNum, fmtDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function FinancePortal() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => Promise.all([
    api.finance.summary(), api.finance.budgets(), api.finance.allocations(),
    api.regions.list(), api.districts.list(),
  ]).then(([sm,{budgets},{ allocations},{ regions},{districts}]) => {
    setSummary(sm); setBudgets(budgets); setAllocs(allocations); setRegions(regions); setDistricts(districts);
  }).catch(console.error);

  useEffect(()=>{ load(); },[]);

  const saveBudget = async () => {
    setBusy(true); setErr(null);
    try { await api.finance.createBudget(form); setOk('Budget created.'); setModal(null); load(); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const saveAllocation = async () => {
    setBusy(true); setErr(null);
    try { await api.finance.createAllocation(form); setOk('Allocation created.'); setModal(null); load(); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const approve = async (id) => {
    await api.finance.approveAllocation(id).catch(e=>setErr(e.message));
    load();
  };

  const isNationalFinance = ['super_admin','national_finance','national_admin'].includes(user.role);

  return (
    <>
      <PageHeader title="Finance Portal" subtitle="Budgets, allocations, and disbursement management.">
        <div className="flex gap-2">
          {isNationalFinance && <Button icon={Plus} variant="secondary" onClick={()=>{setModal('budget');setForm({fiscal_year:'2025/2026',term:'Term 2',level:'national',total_amount:''});setErr(null);}}>New Budget</Button>}
          <Button icon={Plus} onClick={()=>{setModal('allocation');setForm({budget_id:'',to_level:'regional',region_id:'',district_id:'',amount:'',purpose:''});setErr(null);}}>New Allocation</Button>
        </div>
      </PageHeader>

      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      {/* Summary */}
      {summary?.national && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[['Total Budget',summary.national.total,'forest'],['Allocated',summary.national.allocated,'amber'],['Disbursed',summary.national.disbursed,'emerald'],['Balance',summary.national.balance,summary.national.balance>0?'emerald':'rust']].map(([l,v,t])=>(
            <Card key={l} className="text-center py-4">
              <div className={`text-xl font-bold font-serif text-${t}`}>{cedis(v)}</div>
              <div className="text-xs text-stone-500 mt-0.5">{l}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Budgets */}
        <div>
          <h3 className="font-semibold text-ink mb-3">Budget Lines</h3>
          <div className="space-y-2">
            {budgets.map(b=>(
              <Card key={b._id||b.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-ink text-sm">{b.fiscal_year} — {b.term}</div>
                  <div className="text-xs text-stone-500">{b.level} level · {cedis(b.total_amount)} total</div>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className="text-emerald">Disbursed: {cedis(b.disbursed)}</span>
                    <span className="text-amber">Balance: {cedis(b.balance)}</span>
                  </div>
                </div>
                <Pill tone={b.status==='active'?'emerald':b.status==='closed'?'rust':'stone'}>{b.status}</Pill>
              </Card>
            ))}
            {budgets.length===0&&<Card><p className="text-sm text-stone-400 text-center py-4">No budgets yet</p></Card>}
          </div>
        </div>

        {/* Allocations */}
        <div>
          <h3 className="font-semibold text-ink mb-3">Allocations</h3>
          <div className="space-y-2">
            {allocs.map(a=>(
              <Card key={a._id||a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-ink">{cedis(a.amount)} to {a.to_level} level</div>
                    {a.purpose&&<div className="text-xs text-stone-500">{a.purpose}</div>}
                    <div className="text-xs text-stone-400">{fmtDate(a.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Pill tone={a.status==='approved'?'emerald':a.status==='pending'?'amber':'rust'}>{a.status}</Pill>
                    {a.status==='pending'&&isNationalFinance&&<Button size="sm" variant="secondary" onClick={()=>approve(a._id||a.id)}>Approve</Button>}
                  </div>
                </div>
              </Card>
            ))}
            {allocs.length===0&&<Card><p className="text-sm text-stone-400 text-center py-4">No allocations yet</p></Card>}
          </div>
        </div>
      </div>

      {/* Create budget modal */}
      <Modal open={modal==='budget'} onClose={()=>setModal(null)} title="Create Budget Line" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <Input label="Fiscal Year" value={form.fiscal_year} onChange={e=>s('fiscal_year',e.target.value)} placeholder="e.g. 2025/2026" required/>
          <Select label="Term" value={form.term} onChange={e=>s('term',e.target.value)} options={['Term 1','Term 2','Term 3'].map(t=>({value:t,label:t}))}/>
          <Select label="Level" value={form.level} onChange={e=>s('level',e.target.value)} options={['national','regional','district'].map(l=>({value:l,label:l.charAt(0).toUpperCase()+l.slice(1)}))}/> 
          <Input label="Total Amount (GHS)" type="number" value={form.total_amount} onChange={e=>s('total_amount',e.target.value)} required/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setModal(null)} disabled={busy}>Cancel</Button>
            <Button onClick={saveBudget} disabled={busy}>{busy?'Creating...':'Create budget'}</Button>
          </div>
        </div>
      </Modal>

      {/* Create allocation modal */}
      <Modal open={modal==='allocation'} onClose={()=>setModal(null)} title="New Allocation" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <Select label="From budget" value={form.budget_id} onChange={e=>s('budget_id',e.target.value)}
            options={[{value:'',label:'Select budget...'},...budgets.map(b=>({value:b._id||b.id,label:`${b.fiscal_year} ${b.term} — ${cedis(b.balance)} available`}))]} required/>
          <Select label="Allocate to" value={form.to_level} onChange={e=>s('to_level',e.target.value)} options={['regional','district'].map(l=>({value:l,label:l.charAt(0).toUpperCase()+l.slice(1)}))}/> 
          {form.to_level==='regional'&&<Select label="Region" value={form.region_id} onChange={e=>s('region_id',e.target.value)} options={[{value:'',label:'Select region...'},...regions.map(r=>({value:r._id||r.id,label:r.name}))]}/>}
          {form.to_level==='district'&&<Select label="District" value={form.district_id} onChange={e=>s('district_id',e.target.value)} options={[{value:'',label:'Select district...'},...districts.map(d=>({value:d._id||d.id,label:d.name}))]}/>}
          <Input label="Amount (GHS)" type="number" value={form.amount} onChange={e=>s('amount',e.target.value)} required/>
          <Input label="Purpose" value={form.purpose} onChange={e=>s('purpose',e.target.value)} placeholder="e.g. Term 2 caterer payments"/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setModal(null)} disabled={busy}>Cancel</Button>
            <Button onClick={saveAllocation} disabled={busy}>{busy?'Saving...':'Create allocation'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
