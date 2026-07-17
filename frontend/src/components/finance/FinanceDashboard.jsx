import { useEffect, useState, useCallback } from 'react';
import { DollarSign, CheckCircle2, AlertTriangle, Clock, RefreshCw, Send, TrendingUp, BarChart3, FileText } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { fmtNum, fmtDate, fmtDateTime, cedis, ROLE_LABELS } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function FinanceDashboard({ onNavigate }) {
  const { user }    = useAuth();
  const [payments,  setPay]  = useState([]);
  const [selPay,    setSel]  = useState(null);
  const [daysInput, setDays] = useState('');
  const [comment,   setCmt]  = useState('');
  const [busy,      setBusy] = useState(false);
  const [ok,        setOk]   = useState(null);
  const [err,       setErr]  = useState(null);
  const [ts,        setTs]   = useState(null);

  const isDistrict = user.role === 'finance_officer';
  const isRegional = user.role === 'regional_finance';
  const isNational = ['national_finance','national_admin','ceo'].includes(user.role);

  const authH = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` };

  const load = useCallback(()=>{
    api.payments.list().then(d=>{
      let pays = d?.payments||[];
      // Filter payments to show relevant ones per role
      if (isDistrict) pays = pays.filter(p=>!p.district_finance_approved);
      if (isRegional) pays = pays.filter(p=>p.district_finance_approved && !p.regional_finance_approved);
      if (isNational) pays = pays.filter(p=>p.regional_finance_approved && !p.national_finance_approved);
      setPay(pays);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).catch(console.error);
  },[isDistrict,isRegional,isNational]);

  useEffect(()=>{ load(); },[load]);

  const doApprove = async () => {
    if (!selPay) return;
    if (isDistrict && !daysInput) { setErr('Enter approved number of days'); return; }
    setBusy(true); setErr(null);
    try {
      let endpoint = '';
      let body = { comment };
      if (isDistrict)  { endpoint = 'district-approve'; body.days_approved = Number(daysInput); }
      if (isRegional)  { endpoint = 'regional-approve'; }
      if (isNational)  { endpoint = 'national-approve'; }

      const res  = await fetch(`${BASE}/api/payment-approval/${selPay._id||selPay.id}/${endpoint}`, { method:'POST', headers:authH, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Approval failed');
      setOk(`Payment ${isDistrict?'sent to Regional':'approved'} successfully`);
      setSel(null); setDays(''); setCmt(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doReject = async () => {
    if (!comment.trim()) { setErr('Comment required for rejection'); return; }
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/payment-approval/${selPay._id||selPay.id}/reject`, { method:'POST', headers:authH, body:JSON.stringify({ comment }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Rejection failed');
      setOk('Payment sent back for correction');
      setSel(null); setCmt(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const totalArrears = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const totalPaid    = payments.reduce((s,p)=>s+(p.amount_paid||0),0);

  const levelLabel = isDistrict?'District Finance':isRegional?'Regional Finance':'National Finance';
  const nextLabel  = isDistrict?'Regional Finance':isRegional?'National Finance':'Caterer Dashboard';

  const gradientColor = isDistrict?'#15493B':isRegional?'#5b1fa8':'#0f2d5e';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:`linear-gradient(135deg,${gradientColor} 0%,${gradientColor}cc 100%)`}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-amber/70"/><span className="text-[10px] font-bold tracking-widest text-amber/60 uppercase">{levelLabel} — Payment Approval</span></div>
          <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
          <p className="text-white/50 text-sm">{ROLE_LABELS[user.role]}</p>
          {ts&&<p className="text-white/30 text-xs mt-1">Updated: {ts}</p>}
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm">{err}</div>}

      {/* Workflow info */}
      <Card>
        <h3 className="font-semibold text-ink mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-navy"/>Payment Approval Chain</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label:'Caterer Submits', done:true },
            { label:'Headmaster Approves', done:true },
            { label:'District Finance', done:isRegional||isNational, active:isDistrict },
            { label:'Regional Finance', done:isNational, active:isRegional },
            { label:'National Finance', done:false, active:isNational },
            { label:'Caterer sees payment', done:false },
          ].map((step,i)=>(
            <div key={i} className="flex items-center gap-1">
              <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${step.active?'bg-amber text-white':step.done?'bg-emerald/20 text-emerald':'bg-stone-100 text-stone-400'}`}>
                {step.label}
              </div>
              {i<5&&<span className="text-stone-300 text-xs">→</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Pending Your Approval" value={fmtNum(payments.length)}   icon={Clock}         tone={payments.length>0?'amber':'emerald'}/>
        <KPI label="Total Paid"            value={cedis(totalPaid)}           icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Total Arrears"         value={cedis(totalArrears)}        icon={AlertTriangle} tone={totalArrears>0?'rust':'emerald'}/>
        <KPI label="Role"                  value={levelLabel}                 icon={DollarSign}    tone="navy"/>
      </div>

      {/* Payments table */}
      {payments.length===0?(
        <Card>
          <div className="flex flex-col items-center py-10 gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald opacity-50"/>
            <p className="font-semibold text-stone-500">No payments pending your approval</p>
            <p className="text-sm text-stone-400">
              {isDistrict&&'All payments have been forwarded to Regional Finance or are awaiting caterer data.'}
              {isRegional&&'No payments are awaiting Regional approval — District Finance has not submitted any yet.'}
              {isNational&&'No payments are awaiting National approval — Regional Finance has not submitted any yet.'}
            </p>
          </div>
        </Card>
      ):(
        <Card noPadding>
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-ink">{payments.length} Payment{payments.length!==1?'s':''} Awaiting {levelLabel} Approval</h3>
            <p className="text-xs text-stone-400 mt-0.5">Review each payment and {isDistrict?'confirm the number of days cooked before forwarding to Regional Finance':isRegional?'approve to forward to National Finance':'approve for payment to reflect on caterer dashboard'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-4 py-3">Caterer</th>
                  <th className="text-left px-4 py-3">Period</th>
                  <th className="text-right px-4 py-3">Days Covered</th>
                  <th className="text-right px-4 py-3">{isDistrict?'Days to Approve':'Days Approved'}</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-right px-4 py-3">Arrears</th>
                  <th className="text-center px-4 py-3">Chain</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {payments.map(p=>(
                  <tr key={p._id||p.id} className="hover:bg-paper">
                    <td className="px-4 py-3 font-medium text-ink text-xs">{p.caterer?.name||'—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{p.period}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{p.days_covered}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{p.district_finance_days||p.days_paid}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-xs">{cedis(p.amount_paid)}</td>
                    <td className={`px-4 py-3 text-right font-mono text-xs ${p.arrears_amount>0?'text-rust font-bold':''}`}>{cedis(p.arrears_amount)}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div className="flex items-center justify-center gap-0.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${p.district_finance_approved?'bg-emerald text-white':'bg-stone-200 text-stone-400'}`}>D</span>
                        <span className="text-stone-300">→</span>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${p.regional_finance_approved?'bg-emerald text-white':'bg-stone-200 text-stone-400'}`}>R</span>
                        <span className="text-stone-300">→</span>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${p.national_finance_approved?'bg-emerald text-white':'bg-stone-200 text-stone-400'}`}>N</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={()=>{ setSel(p); setDays(String(p.district_finance_days||p.days_paid)); setCmt(''); setErr(null); }}
                        className="px-3 py-1.5 bg-forest text-white text-xs rounded-xl font-bold hover:bg-forest/90">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Approval Modal */}
      <Modal open={!!selPay} onClose={()=>{ setSel(null); setErr(null); }} title={`${levelLabel} Review`} size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        {selPay&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[['Caterer',selPay.caterer?.name||'—'],['Period',selPay.period],['Days Covered',selPay.days_covered],['Days Recorded',selPay.district_finance_days||selPay.days_paid],['Amount Paid',cedis(selPay.amount_paid)],['Arrears',cedis(selPay.arrears_amount)]].map(([l,v])=>(
                  <div key={l}><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
                ))}
              </div>
            </div>

            {isDistrict&&(
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1.5">Approved number of days cooked *</label>
                <input type="number" value={daysInput} onChange={e=>setDays(e.target.value)} min="0" max={selPay.days_covered}
                  className="w-full px-4 py-2.5 border-2 border-stone-200 rounded-xl text-sm focus:outline-none focus:border-forest"
                  placeholder={`Max: ${selPay.days_covered} days`}/>
                {daysInput&&<p className="text-xs text-stone-500 mt-1">Estimated amount: {cedis(Number(daysInput) * (selPay.rate_per_student||2) * (selPay.enrolled||0))}</p>}
              </div>
            )}

            <Textarea label="Comment" value={comment} onChange={e=>setCmt(e.target.value)} rows={2}
              placeholder={isDistrict?'Confirm your review of days cooked...':'Add your approval comment...'}/>

            <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-xs text-amber font-medium">
              ⓘ {isDistrict?`After approval, this payment goes to Regional Finance for review.`:isRegional?`After approval, National Finance will do the final review before the caterer sees the payment.`:`After your approval, this payment becomes visible on the caterer's dashboard.`}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={doApprove} disabled={busy||(isDistrict&&!daysInput)}
                className="py-3.5 bg-emerald text-white rounded-xl font-bold hover:bg-emerald/90 disabled:opacity-50 flex items-center justify-center gap-2">
                <Send className="w-4 h-4"/>
                {busy?'Processing...':isDistrict?'Approve & Send to Region':isRegional?'Approve & Send to National':'Final Approve'}
              </button>
              <button onClick={doReject} disabled={busy}
                className="py-3.5 bg-rust text-white rounded-xl font-bold hover:bg-rust/90 disabled:opacity-50">
                ✗ Reject / Send Back
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
