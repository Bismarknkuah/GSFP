import { useEffect, useState } from 'react';
import { CreditCard, Plus, Pencil, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import { cedis, fmtDate, fmtNum } from '../../utils/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PaymentsView() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [caterers, setCaterers] = useState([]);
  const [mode, setMode]         = useState(null);
  const [form, setForm]         = useState({});
  const [err, setErr]           = useState(null);
  const [ok, setOk]             = useState(null);
  const [busy, setBusy]         = useState(false);
  const [loading, setLoading]   = useState(true);
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const canCreate = ['district_director','district_coordinator','finance_officer','super_admin','national_admin','national_finance'].includes(user.role);
  const isCaterer = user.role==='caterer';

  const load = () => {
    setLoading(true);
    const promises = [api.payments.list()];
    if (canCreate) promises.push(api.users.list({role:'caterer'}));
    Promise.all(promises).then(([{payments},usersResp])=>{
      setPayments(payments);
      if (usersResp) setCaterers(usersResp.users||[]);
    }).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode==='add') await api.payments.create(form);
      else if (mode==='self') await api.payments.selfReport(form);
      else await api.payments.update(mode._id||mode.id, form);
      setOk(mode==='add'?'Payment recorded.':mode==='self'?'Payment self-reported.':'Payment updated.'); setMode(null); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(13); doc.text('GSFP — Payment Records', 14, 16);
    doc.setFontSize(8); doc.text(`Generated: ${new Date().toLocaleString('en-GH')}`, 14, 22);
    autoTable(doc, {
      startY:26, headStyles:{fillColor:[21,73,59]},
      head:[['Period','Caterer','School','Days Covered','Days Paid','Arrears','Amount Paid','Status']],
      body:payments.map(p=>[p.period,p.caterer?.name||'—',p.school?.name||'—',p.days_covered,p.days_paid,p.days_arrears,cedis(p.amount_paid),p.status]),
      styles:{fontSize:7},
    });
    doc.save('GSFP_Payments.pdf');
  };

  const summary = payments.reduce((a,p)=>({ paid:a.paid+p.amount_paid, arrears:a.arrears+p.arrears_amount, count:a.count+1 }),{paid:0,arrears:0,count:0});

  return (
    <>
      <PageHeader title="Payment Records" subtitle="Caterer payment tracking and management.">
        <div className="flex gap-2">
          <Button icon={Download} variant="secondary" onClick={exportPDF}>Export PDF</Button>
          {isCaterer && <Button icon={Plus} variant="amber" onClick={()=>{setMode('self');setForm({period:'',receivedAmount:'',receivedDate:'',reference:''});setErr(null);}}>Report Receipt</Button>}
          {canCreate  && <Button icon={Plus} onClick={()=>{setMode('add');setForm({catererId:'',period:'',daysCovered:'',daysPaid:'',ratePerStudent:1.20,amountPaid:'',lastPaymentDate:''});setErr(null);}}>Record Payment</Button>}
        </div>
      </PageHeader>

      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!mode&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="text-center py-4"><div className="text-2xl font-bold font-serif text-forest">{summary.count}</div><div className="text-xs text-stone-500">Payment Records</div></Card>
        <Card className="text-center py-4"><div className="text-2xl font-bold font-serif text-emerald">{cedis(summary.paid)}</div><div className="text-xs text-stone-500">Total Paid</div></Card>
        <Card className="text-center py-4"><div className={`text-2xl font-bold font-serif ${summary.arrears>0?'text-rust':'text-emerald'}`}>{cedis(summary.arrears)}</div><div className="text-xs text-stone-500">Total Arrears</div></Card>
      </div>

      <Card noPadding>
        {loading?<div className="p-6 text-sm text-stone-500 text-center">Loading...</div>
        :payments.length===0?<EmptyState icon={CreditCard} title="No payment records"/>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-4 py-3">Period</th>
                  <th className="text-left px-4 py-3">Caterer / School</th>
                  <th className="text-right px-4 py-3">Days Covered</th>
                  <th className="text-right px-4 py-3">Days Paid</th>
                  <th className="text-right px-4 py-3">Arrears</th>
                  <th className="text-right px-4 py-3">Amount Paid</th>
                  <th className="text-center px-4 py-3">Status</th>
                  {canCreate&&<th className="px-4 py-3"/>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {payments.map(p=>(
                  <tr key={p._id||p.id} className="hover:bg-paper">
                    <td className="px-4 py-3 text-xs text-stone-600">{p.period}</td>
                    <td className="px-4 py-3"><div className="font-medium text-xs text-ink">{p.caterer?.name||'—'}</div><div className="text-xs text-stone-400">{p.school?.name||p.school?.code||'—'}</div></td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{p.days_covered}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{p.days_paid}</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-semibold':''}`}>{p.days_arrears}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{cedis(p.amount_paid)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status}/></td>
                    {canCreate&&<td className="px-4 py-3"><button onClick={()=>{setMode(p);setForm({daysPaid:p.days_paid,daysArrears:p.days_arrears,amountPaid:p.amount_paid,status:p.status,lastPaymentDate:p.last_payment_date,reference:p.reference||''});setErr(null);}} className="p-1 hover:bg-cream rounded"><Pencil className="w-3.5 h-3.5 text-emerald"/></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!mode} onClose={()=>setMode(null)} title={mode==='add'?'Record payment':mode==='self'?'Report payment received':'Update payment'} size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          {mode==='add'&&<Select label="Caterer" value={form.catererId} onChange={e=>s('catererId',e.target.value)} required options={[{value:'',label:'Select caterer...'},...caterers.map(c=>({value:c._id||c.id,label:c.name}))]}/>}
          <Input label="Period (e.g. 2025/2026 - Term 2)" value={form.period} onChange={e=>s('period',e.target.value)} required/>
          {mode==='add'&&(
            <div className="grid grid-cols-2 gap-3">
              <Input label="Days covered" type="number" value={form.daysCovered} onChange={e=>s('daysCovered',e.target.value)}/>
              <Input label="Days paid" type="number" value={form.daysPaid} onChange={e=>s('daysPaid',e.target.value)}/>
              <Input label="Rate per pupil (GHS)" type="number" value={form.ratePerStudent} onChange={e=>s('ratePerStudent',e.target.value)}/>
              <Input label="Amount paid (GHS)" type="number" value={form.amountPaid} onChange={e=>s('amountPaid',e.target.value)}/>
            </div>
          )}
          {mode==='self'&&<Input label="Amount received (GHS)" type="number" value={form.receivedAmount} onChange={e=>s('receivedAmount',e.target.value)} required/>}
          {mode!=='add'&&mode!=='self'&&(
            <div className="grid grid-cols-2 gap-3">
              <Input label="Days paid" type="number" value={form.daysPaid} onChange={e=>s('daysPaid',e.target.value)}/>
              <Input label="Amount paid (GHS)" type="number" value={form.amountPaid} onChange={e=>s('amountPaid',e.target.value)}/>
              <Select label="Status" value={form.status} onChange={e=>s('status',e.target.value)} options={['partial','fully-paid','pending','arrears'].map(v=>({value:v,label:v.replace('-',' ')}))}/>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Payment date" type="date" value={form.lastPaymentDate||form.receivedDate||''} onChange={e=>s(mode==='self'?'receivedDate':'lastPaymentDate',e.target.value)}/>
            <Input label="Reference #" value={form.reference||''} onChange={e=>s('reference',e.target.value)}/>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setMode(null)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy?'Saving...':mode==='add'||mode==='self'?'Submit':'Update'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
