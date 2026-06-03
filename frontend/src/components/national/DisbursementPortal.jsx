import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Plus, CheckCircle2, XCircle, Clock, AlertTriangle, Download, Eye, ChevronRight, CreditCard, TrendingUp, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import { cedis, fmtNum, fmtDateTime, ROLE_LABELS } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const STATUS_CONFIG = {
  pending_ceo:   { tone:'amber',   label:'Awaiting CEO Approval', icon:Clock },
  ceo_approved:  { tone:'emerald', label:'CEO Approved',          icon:CheckCircle2 },
  ceo_rejected:  { tone:'rust',    label:'CEO Rejected',          icon:XCircle },
  disbursed:     { tone:'forest',  label:'Disbursed',             icon:CreditCard },
  cancelled:     { tone:'stone',   label:'Cancelled',             icon:XCircle },
};

function StatusTag({ status }) {
  const cfg = STATUS_CONFIG[status] || { tone:'stone', label:status, icon:Clock };
  return <Pill tone={cfg.tone}>{cfg.label}</Pill>;
}

export default function DisbursementPortal() {
  const { user } = useAuth();
  const [summary,  setSm]   = useState(null);
  const [disbs,    setDsb]  = useState([]);
  const [regions,  setReg]  = useState([]);
  const [districts,setDst]  = useState([]);
  const [detail,   setDet]  = useState(null);
  const [createMd, setCreate]= useState(false);
  const [approveMd,setApp]  = useState(null); // {disb, action}
  const [statusFilter,setSF]= useState('');
  const [form,     setForm] = useState({});
  const [comment,  setComment]=useState('');
  const [loading,  setLoad] = useState(true);
  const [err,      setErr]  = useState(null);
  const [ok,       setOk]   = useState(null);
  const [busy,     setBusy] = useState(false);
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const isCEO    = ['ceo','national_director','super_admin'].includes(user.role);
  const canCreate= ['super_admin','national_admin','national_finance','regional_finance','finance_officer'].includes(user.role);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const [sm, disbRes, regRes, dstRes] = await Promise.allSettled([
        api.disbursements.annualSummary(),
        api.disbursements.list(statusFilter?{status:statusFilter}:{}),
        api.regions.list(),
        api.districts.list(),
      ]);
      if(sm.status==='fulfilled')      setSm(sm.value);
      if(disbRes.status==='fulfilled') setDsb(disbRes.value?.disbursements||[]);
      if(regRes.status==='fulfilled')  setReg(regRes.value?.regions||[]);
      if(dstRes.status==='fulfilled')  setDst(dstRes.value?.districts||[]);
      if(sm.status==='rejected') setErr(sm.reason?.message||'Could not load disbursement summary');
    } catch(e) { setErr(e.message); }
    finally { setLoad(false); }
  },[statusFilter]);

  useEffect(()=>{ load(); },[statusFilter]);

  const pending = disbs.filter(d=>d.status==='pending_ceo');

  const doCreate = async () => {
    setBusy(true); setErr(null);
    try {
      await api.disbursements.create(form);
      setOk('Disbursement request submitted — awaiting CEO approval.');
      setCreate(false); setForm({}); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doApprove = async () => {
    if (!approveMd) return;
    setBusy(true); setErr(null);
    try {
      if (approveMd.action==='approve') {
        await api.disbursements.ceoApprove(approveMd.disb._id||approveMd.disb.id, comment||'Approved by CEO.');
        setOk('Disbursement approved. National Finance may now execute the payment.');
      } else {
        if (!comment) { setErr('Please provide a rejection reason.'); setBusy(false); return; }
        await api.disbursements.ceoReject(approveMd.disb._id||approveMd.disb.id, comment);
        setOk('Disbursement rejected. National Finance will be notified.');
      }
      setApp(null); setComment(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doExecute = async (disb) => {
    setBusy(true); setErr(null);
    try {
      await api.disbursements.execute(disb._id||disb.id);
      setOk('Disbursement executed and recorded.'); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doExport = (type) => {
    const opts = {
      title:'GSFP — Disbursement Ledger', subtitle:`Full disbursement record — All years`,
      columns:['Reference','Date','Recipient','Level','Amount (GHS)','Purpose','Status','CEO Decision','CEO Name','Executed'],
      rows:disbs.map(d=>[d.reference||'—', fmtDateTime(d.created_at), d.recipient_name, d.level, cedis(d.amount), d.purpose, STATUS_CONFIG[d.status]?.label||d.status, d.ceo_comment||'—', d.ceo_name||'Pending', d.disbursed_at?fmtDateTime(d.disbursed_at):'Not yet']),
      summaryRows:[
        {label:'Total Requested',  value:cedis(sm?.totals?.all_time_total||0)},
        {label:'CEO Approved',     value:cedis(sm?.totals?.approved_total||0)},
        {label:'Disbursed',        value:cedis(sm?.totals?.disbursed_total||0)},
        {label:'Pending Approval', value:cedis(sm?.totals?.pending_total||0)},
        {label:'CEO Rejected',     value:cedis(sm?.totals?.rejected_total||0)},
      ],
      filename:'GSFP_Disbursement_Ledger',
    };
    const sm = summary;
    if (type==='pdf') exportPDF({...opts,filename:opts.filename+'.pdf',orientation:'landscape'});
    else exportExcel({filename:opts.filename+'.xlsx',sheets:[{name:'Disbursements',columns:opts.columns,rows:opts.rows,summaryRows:opts.summaryRows}]});
  };

  const t = summary?.totals||{};
  const byMonth = summary?.by_month||[];

  return (
    <>
      <PageHeader title="Disbursement Ledger" subtitle="Full transparency — every fund disbursement requires CEO approval before execution.">
        <div className="flex gap-2">
          <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('pdf')}>PDF</Button>
          <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Excel</Button>
          {canCreate && <Button icon={Plus} onClick={()=>{setCreate(true);setForm({level:'regional',fiscal_year:'2025/2026',term:'Term 1',payment_method:'Bank Transfer'});setErr(null);}}>Request Disbursement</Button>}
        </div>
      </PageHeader>

      {ok&&<div className="mb-4 p-3 bg-emerald/10 border border-emerald/20 rounded-xl text-sm text-emerald flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!createMd&&!approveMd&&<div className="mb-4 p-3 bg-rust/10 rounded-xl text-sm text-rust flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      {/* CEO Pending Alert */}
      {isCEO && pending.length>0 && (
        <div className="mb-5 p-4 bg-amber/10 border-2 border-amber/30 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-amber">{pending.length} disbursement{pending.length!==1?'s':''} await your approval</p>
            <p className="text-sm text-stone-600 mt-0.5">Total pending: <strong>{cedis(t.pending_total||0)}</strong> — review below and approve or reject each request.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          ['Total Requested',   cedis(t.all_time_total||0),  'navy',    DollarSign],
          ['CEO Approved',      cedis(t.approved_total||0),  'emerald', CheckCircle2],
          ['Disbursed',         cedis(t.disbursed_total||0), 'forest',  CreditCard],
          ['Pending Approval',  cedis(t.pending_total||0),   t.pending_count>0?'amber':'stone', Clock],
          ['CEO Rejected',      cedis(t.rejected_total||0),  t.rejected_count>0?'rust':'stone', XCircle],
        ].map(([l,v,t,Icon])=>(
          <Card key={l} className="text-center py-4">
            <Icon className={`w-5 h-5 mx-auto mb-1 text-${t}`}/>
            <div className={`text-base font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-xs text-stone-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      {/* Monthly chart */}
      {byMonth.length>0 && (
        <Card className="mb-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-forest"/>Monthly Disbursement Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={byMonth}>
              <defs><linearGradient id="disbGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>[cedis(v),'Amount']}/>
              <Area type="monotone" dataKey="approved" name="Approved" stroke="#15493B" fill="url(#disbGrad)" strokeWidth={2}/>
              <Area type="monotone" dataKey="pending" name="Pending" stroke="#C9882C" fill="#C9882C" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filter + Table */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[['','All'],[...'pending_ceo,ceo_approved,ceo_rejected,disbursed'.split(',').map(s=>[s,STATUS_CONFIG[s]?.label||s])]].flat(1).map((item,i)=>{
          const [val,label] = Array.isArray(item)?item:[item,item];
          return (
            <button key={val} onClick={()=>setSF(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${statusFilter===val?'bg-forest text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
              {label}
            </button>
          );
        })}
        <button onClick={load} className="ml-auto p-2 hover:bg-stone-100 rounded-xl" title="Refresh"><RefreshCw className="w-4 h-4 text-stone-400"/></button>
      </div>

      <Card noPadding>
        {loading?<div className="p-8 text-center text-stone-400 text-sm">Loading disbursements...</div>
        :disbs.length===0?<EmptyState icon={DollarSign} title="No disbursements found" description="Use the request button to create a new disbursement."/>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Recipient</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Purpose</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">CEO Decision</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {disbs.map(d=>(
                  <tr key={d._id||d.id} className={`hover:bg-paper ${d.status==='pending_ceo'?'bg-amber/5':d.status==='ceo_rejected'?'bg-rust/5':''}`}>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-forest font-semibold">{d.reference}</div>
                      <div className="text-xs text-stone-400">{fmtDateTime(d.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink text-xs">{d.recipient_name}</div>
                      <div className="text-xs text-stone-400">{d.level} level</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-ink">{cedis(d.amount)}</td>
                    <td className="px-4 py-3 text-xs text-stone-600 max-w-[200px] truncate">{d.purpose}</td>
                    <td className="px-4 py-3 text-center"><StatusTag status={d.status}/></td>
                    <td className="px-4 py-3">
                      {d.ceo_name ? (
                        <div>
                          <div className="text-xs font-semibold text-ink">{d.ceo_name}</div>
                          <div className="text-xs text-stone-400">{fmtDateTime(d.ceo_decision_at)}</div>
                          {d.ceo_comment&&<div className="text-xs text-stone-500 italic mt-0.5 max-w-[150px] truncate">{d.ceo_comment}</div>}
                        </div>
                      ) : <span className="text-xs text-stone-300">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={()=>setDet(d)} className="p-1.5 hover:bg-cream rounded-lg" title="View"><Eye className="w-3.5 h-3.5 text-forest"/></button>
                        {isCEO && d.status==='pending_ceo' && <>
                          <button onClick={()=>{setApp({disb:d,action:'approve'});setComment('');setErr(null);}} className="p-1.5 hover:bg-emerald/10 rounded-lg" title="Approve"><CheckCircle2 className="w-3.5 h-3.5 text-emerald"/></button>
                          <button onClick={()=>{setApp({disb:d,action:'reject'});setComment('');setErr(null);}} className="p-1.5 hover:bg-rust/10 rounded-lg" title="Reject"><XCircle className="w-3.5 h-3.5 text-rust"/></button>
                        </>}
                        {canCreate && d.status==='ceo_approved' && (
                          <button onClick={()=>doExecute(d)} className="p-1.5 bg-forest text-white rounded-lg hover:bg-[#0f3329] text-xs font-bold" title="Execute"><CreditCard className="w-3.5 h-3.5"/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={()=>setDet(null)} title="Disbursement Details" size="lg">
        {detail&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Reference',    detail.reference],
                ['Amount',       cedis(detail.amount)],
                ['Recipient',    detail.recipient_name],
                ['Level',        detail.level],
                ['Purpose',      detail.purpose],
                ['Fiscal Year',  detail.fiscal_year],
                ['Term',         detail.term],
                ['Payment Method',detail.payment_method||'—'],
                ['Bank',         detail.bank_name||'—'],
                ['Created By',   `${detail.created_by_name} (${ROLE_LABELS[detail.created_by_role]||detail.created_by_role})`],
                ['Requested At', fmtDateTime(detail.created_at)],
                ['CEO Decision', detail.ceo_name?`${detail.ceo_name} on ${fmtDateTime(detail.ceo_decision_at)}`:'Pending'],
              ].map(([l,v])=>(
                <div key={l}><span className="text-xs text-stone-400">{l}</span><div className="font-semibold text-ink text-sm">{v||'—'}</div></div>
              ))}
            </div>
            {detail.ceo_comment&&(
              <div className="bg-cream rounded-xl p-3">
                <span className="text-xs font-semibold text-stone-400">CEO Comment: </span>
                <span className="text-sm text-stone-700">{detail.ceo_comment}</span>
              </div>
            )}
            <div className="pt-2 border-t border-stone-100"><StatusTag status={detail.status}/></div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal open={createMd} onClose={()=>setCreate(false)} title="Request Disbursement" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
        <div className="space-y-3">
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-sm text-amber flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5"/>
            <span>This disbursement will require <strong>CEO or National Director approval</strong> before funds can be released.</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Fiscal Year" value={form.fiscal_year||''} onChange={e=>s('fiscal_year',e.target.value)} placeholder="2025/2026" required/>
            <Select label="Term" value={form.term||'Term 1'} onChange={e=>s('term',e.target.value)} options={['Term 1','Term 2','Term 3','Full Year'].map(t=>({value:t,label:t}))}/>
          </div>
          <Select label="Disbursement Level" value={form.level||'regional'} onChange={e=>s('level',e.target.value)}
            options={['national','regional','district','caterer'].map(l=>({value:l,label:l.charAt(0).toUpperCase()+l.slice(1)}))}/>
          {form.level==='regional'&&<Select label="Region" value={form.region_id||''} onChange={e=>s('region_id',e.target.value)} options={[{value:'',label:'Select region...'},...regions.map(r=>({value:r._id||r.id,label:r.name}))]}/>}
          {form.level==='district'&&<Select label="District" value={form.district_id||''} onChange={e=>s('district_id',e.target.value)} options={[{value:'',label:'Select district...'},...districts.map(d=>({value:d._id||d.id,label:d.name}))]}/>}
          <Input label="Recipient Name" value={form.recipient_name||''} onChange={e=>s('recipient_name',e.target.value)} required placeholder="e.g. Western North Region Coordinator"/>
          <Input label="Amount (GHS)" type="number" value={form.amount||''} onChange={e=>s('amount',e.target.value)} required placeholder="e.g. 320000"/>
          <Textarea label="Purpose" value={form.purpose||''} onChange={e=>s('purpose',e.target.value)} rows={2} required placeholder="Describe the purpose of this disbursement..."/>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Payment Method" value={form.payment_method||'Bank Transfer'} onChange={e=>s('payment_method',e.target.value)} options={['Bank Transfer','Mobile Money','Cheque','Cash'].map(m=>({value:m,label:m}))}/>
            <Input label="Bank Name" value={form.bank_name||''} onChange={e=>s('bank_name',e.target.value)} placeholder="e.g. Ghana Commercial Bank"/>
          </div>
          <Input label="Account Number" value={form.account_number||''} onChange={e=>s('account_number',e.target.value)} placeholder="Recipient bank account"/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setCreate(false)} disabled={busy}>Cancel</Button>
            <Button onClick={doCreate} disabled={busy||!form.amount||!form.purpose||!form.recipient_name} icon={DollarSign}>{busy?'Submitting...':'Submit for CEO approval'}</Button>
          </div>
        </div>
      </Modal>

      {/* CEO Approve/Reject modal */}
      <Modal open={!!approveMd} onClose={()=>setApp(null)} title={approveMd?.action==='approve'?'Approve Disbursement':'Reject Disbursement'} size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        {approveMd?.disb&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Reference:</span><span className="font-mono font-semibold">{approveMd.disb.reference}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Recipient:</span><span className="font-semibold">{approveMd.disb.recipient_name}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Amount:</span><span className="font-bold text-2xl text-forest">{cedis(approveMd.disb.amount)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Purpose:</span><span className="text-stone-700 text-right max-w-xs">{approveMd.disb.purpose}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Requested by:</span><span>{approveMd.disb.created_by_name}</span></div>
            </div>
            {approveMd.action==='approve'&&(
              <div className="bg-emerald/10 border border-emerald/20 rounded-xl p-3 text-sm text-emerald">
                Approving this will authorise <strong>{cedis(approveMd.disb.amount)}</strong> for disbursement. National Finance will then execute the payment.
              </div>
            )}
            {approveMd.action==='reject'&&(
              <div className="bg-rust/10 border border-rust/20 rounded-xl p-3 text-sm text-rust">
                Rejecting will prevent this payment from being executed. A reason is required.
              </div>
            )}
            <Textarea
              label={approveMd.action==='approve'?'CEO comment (optional)':'Rejection reason (required)'}
              value={comment} onChange={e=>setComment(e.target.value)} rows={3}
              placeholder={approveMd.action==='approve'?'e.g. Approved. Please execute promptly.':'e.g. Amount exceeds Q4 budget. Please revise.'}/>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={()=>setApp(null)} disabled={busy}>Cancel</Button>
              {approveMd.action==='approve'
                ? <Button onClick={doApprove} disabled={busy} icon={CheckCircle2} className="bg-emerald hover:bg-emerald/90 text-white">{busy?'Approving...':'Approve Disbursement'}</Button>
                : <Button onClick={doApprove} disabled={busy||!comment} variant="danger" icon={XCircle}>{busy?'Rejecting...':'Reject Disbursement'}</Button>
              }
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
