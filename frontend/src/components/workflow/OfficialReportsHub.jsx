import { useEffect, useState, useCallback } from 'react';
import { FileText, Send, CheckCircle2, XCircle, MessageSquare, ChevronRight, Clock, Plus, Eye, BarChart3, AlertCircle, Download } from 'lucide-react';
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
import EmptyState from '../ui/EmptyState';
import { fmtDateTime, fmtNum, cedis, ROLE_LABELS } from '../../utils/format';
import { exportPDF } from '../../utils/export';

const STATUS_MAP = {
  pending:       { tone:'amber',   label:'Pending' },
  with_dce:      { tone:'amber',   label:'With DCE' },
  with_rfc:      { tone:'blue',    label:'With Regional' },
  with_national: { tone:'navy',    label:'With National' },
  with_ceo:      { tone:'purple',  label:'With CEO' },
  approved_final:{ tone:'emerald', label:'Approved' },
  rejected:      { tone:'rust',    label:'Rejected' },
};

const TYPE_OPTIONS = ['daily','weekly','monthly','term','annual','special','audit','financial','monitoring'].map(t=>({value:t,label:t.charAt(0).toUpperCase()+t.slice(1)}));

function ChainTimeline({ chain }) {
  if (!chain?.length) return null;
  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Approval Chain</h4>
      {chain.map((e,i)=>(
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${e.action==='approved'?'bg-emerald':e.action==='rejected'?'bg-rust':e.action==='submitted'?'bg-forest':e.action==='received'?'bg-navy':'bg-amber'}`}>
              {e.action==='approved'?'✓':e.action==='rejected'?'✗':e.action==='submitted'?'S':e.action==='received'?'R':'C'}
            </div>
            {i<chain.length-1&&<div className="w-0.5 h-4 bg-stone-200 my-1"/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink text-sm">{e.actor_name}</span>
              <Pill tone="stone">{ROLE_LABELS[e.actor_role]||e.actor_role}</Pill>
              <span className="text-[10px] text-stone-400 ml-auto">{fmtDateTime(e.timestamp)}</span>
            </div>
            <p className="text-xs text-stone-500 capitalize font-medium">{e.action}</p>
            {e.comment&&<p className="text-xs text-stone-600 mt-0.5 italic">{e.comment}</p>}
            {e.analysis&&<div className="mt-1 p-2 bg-blue-50 rounded-lg text-xs text-blue-700"><span className="font-semibold">Analysis: </span>{e.analysis}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OfficialReportsHub() {
  const { user } = useAuth();
  const [tab,    setTab]    = useState('inbox');
  const [reports,setReports]= useState([]);
  const [stats,  setStats]  = useState(null);
  const [detail, setDetail] = useState(null);
  const [compose,setCompose]= useState(false);
  const [actionModal,setAct]= useState(null);
  const [form,   setForm]   = useState({});
  const [actForm,setActForm]= useState({ action:'', comment:'', analysis:'', rejection_reason:'' });
  const [err,    setErr]    = useState(null);
  const [ok,     setOk]     = useState(null);
  const [busy,   setBusy]   = useState(false);
  const s = (k,v)=>setForm(f=>({...f,[k]:v}));

  const load = useCallback(()=>{
    Promise.allSettled([
      api.officialReports.list({ box:tab }),
      api.officialReports.stats(),
    ]).then(([rRes,stRes])=>{
      if(rRes.status==='fulfilled') setReports(rRes.value?.reports||[]);
      if(stRes.status==='fulfilled') setStats(stRes.value);
    }).catch(console.error);
  },[tab]);

  useEffect(()=>{ load(); },[tab]);

  const submit = async () => {
    if (!form.subject||!form.content) { setErr('Subject and content required'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api.officialReports.submit({ ...form, include_stats:true });
      setOk(`Report submitted to ${r.next_level}`);
      setCompose(false); setForm({}); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doAction = async () => {
    if (!actForm.action) { setErr('Select an action'); return; }
    if (actForm.action==='reject'&&!actForm.rejection_reason) { setErr('Provide rejection reason'); return; }
    setBusy(true); setErr(null);
    try {
      await api.officialReports.action(actionModal._id||actionModal.id, actForm);
      setOk(`Report ${actForm.action}d successfully.`);
      setAct(null); setActForm({action:'',comment:'',analysis:'',rejection_reason:''}); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doExport = (rpt) => {
    exportPDF({
      title:`Official Report — ${rpt.subject}`, subtitle:`Period: ${rpt.period} | Reference: ${rpt.reference}`,
      columns:['Level','Actor','Role','Action','Comment','Analysis','Timestamp'],
      rows:(rpt.chain||[]).map(e=>[e.level,e.actor_name,ROLE_LABELS[e.actor_role]||e.actor_role,e.action,e.comment||'—',e.analysis||'—',fmtDateTime(e.timestamp)]),
      filename:`GSFP_Report_${rpt.reference}.pdf`,
      summaryRows:[{label:'Subject',value:rpt.subject},{label:'Submitted by',value:`${rpt.submitted_by_name} (${ROLE_LABELS[rpt.submitted_by_role]})`},{label:'Period',value:rpt.period},{label:'Status',value:STATUS_MAP[rpt.status]?.label||rpt.status}],
    });
  };

  const canAct = (rpt) => rpt.current_holder_role===user.role || ['ceo','national_director','super_admin'].includes(user.role);

  return (
    <>
      <PageHeader title="Official Reports Hub" subtitle="Submit, approve and track reports through the full chain: District → DCE → Regional → National → CEO.">
        <Button icon={Plus} onClick={()=>{ setCompose(true); setForm({report_type:'monthly',subject:'',content:'',period:''}); setErr(null); }}>
          Submit Report
        </Button>
      </PageHeader>

      {ok&&<div className="mb-4 p-3 bg-emerald/10 border border-emerald/20 rounded-xl text-sm text-emerald flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!compose&&!actionModal&&<div className="mb-4 p-3 bg-rust/10 rounded-xl text-sm text-rust">{err}</div>}

      {/* Stats */}
      {stats&&(
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[['Inbox',stats.inbox,'forest'],['Sent',stats.sent,'navy'],['Pending Action',stats.pending,'amber']].map(([l,v,t])=>(
            <Card key={l} className="text-center py-3">
              <div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div>
              <div className="text-xs text-stone-400 mt-0.5">{l}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['inbox','Inbox'],['sent','Sent'],['chain','Chain History']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-forest text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reports.length===0
          ? <Card><EmptyState icon={FileText} title={tab==='inbox'?'No reports in inbox':'No reports found'} description={tab==='inbox'?'Reports submitted to you will appear here.':'Submit a report using the button above.'}/></Card>
          : reports.map(rpt=>(
            <Card key={rpt._id||rpt.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Pill tone="stone">{rpt.report_type}</Pill>
                    <Pill tone={STATUS_MAP[rpt.status]?.tone||'stone'}>{STATUS_MAP[rpt.status]?.label||rpt.status}</Pill>
                    <span className="text-xs text-stone-400">{rpt.reference}</span>
                  </div>
                  <h4 className="font-semibold text-ink">{rpt.subject}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    From: {rpt.submitted_by_name} ({ROLE_LABELS[rpt.submitted_by_role]||rpt.submitted_by_role}) · {rpt.period} · {fmtDateTime(rpt.submitted_at)}
                  </p>
                  {(rpt.total_meals>0||rpt.total_paid>0)&&(
                    <div className="flex gap-4 mt-2 text-xs text-stone-500">
                      {rpt.total_meals>0&&<span>Meals: <strong className="text-forest">{fmtNum(rpt.total_meals)}</strong></span>}
                      {rpt.total_paid>0&&<span>Paid: <strong className="text-emerald">{cedis(rpt.total_paid)}</strong></span>}
                      {rpt.total_arrears>0&&<span>Arrears: <strong className="text-rust">{cedis(rpt.total_arrears)}</strong></span>}
                      {rpt.compliance_rate>0&&<span>Compliance: <strong className="text-amber">{rpt.compliance_rate}%</strong></span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={()=>setDetail(rpt)} className="p-2 hover:bg-cream rounded-lg" title="View"><Eye className="w-4 h-4 text-forest"/></button>
                  <button onClick={()=>doExport(rpt)} className="p-2 hover:bg-cream rounded-lg" title="Export PDF"><Download className="w-4 h-4 text-stone-400"/></button>
                  {canAct(rpt)&&rpt.status!=='approved_final'&&rpt.status!=='rejected'&&tab==='inbox'&&(
                    <Button size="sm" onClick={()=>{ setAct(rpt); setActForm({action:'',comment:'',analysis:'',rejection_reason:''}); setErr(null); }}>
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        }
      </div>

      {/* Compose modal */}
      <Modal open={compose} onClose={()=>setCompose(false)} title="Submit Official Report" size="lg">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-sm text-stone-700">
            <strong className="text-amber">Routing: </strong>Your report will be automatically routed to your immediate superior for approval before being forwarded up the chain.
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Report Type" value={form.report_type||'monthly'} onChange={e=>s('report_type',e.target.value)} options={TYPE_OPTIONS}/>
            <Input label="Period" value={form.period||''} onChange={e=>s('period',e.target.value)} placeholder="e.g. May 2026 / Term 1 2025-26"/>
          </div>
          <Input label="Subject" value={form.subject||''} onChange={e=>s('subject',e.target.value)} required placeholder="e.g. Monthly Feeding Report — Sefwi Akontombra District"/>
          <Textarea label="Report Content" value={form.content||''} onChange={e=>s('content',e.target.value)} rows={8} required
            placeholder="Provide a detailed report covering feeding activities, compliance, financial status, challenges and recommendations..."/>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.include_stats!==false} onChange={e=>s('include_stats',e.target.checked)} className="accent-forest w-4 h-4"/>
            <span className="text-sm text-stone-700">Attach live statistics (meals, payments, compliance rate)</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setCompose(false)} disabled={busy}>Cancel</Button>
            <Button icon={Send} onClick={submit} disabled={busy||!form.subject||!form.content}>{busy?'Submitting...':'Submit report'}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail?.subject||'Report'} size="lg">
        {detail&&(
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Pill tone={STATUS_MAP[detail.status]?.tone||'stone'}>{STATUS_MAP[detail.status]?.label}</Pill>
              <Pill tone="stone">{detail.report_type}</Pill>
              <span className="text-xs text-stone-400 self-center">{detail.reference} · {detail.period}</span>
            </div>
            {(detail.total_meals>0||detail.total_paid>0)&&(
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[[`${fmtNum(detail.total_meals)}`, 'Total Meals','emerald'],[cedis(detail.total_paid),'Amount Paid','forest'],[cedis(detail.total_arrears),'Arrears','rust'],[`${detail.compliance_rate||0}%`,'Compliance','amber']].map(([v,l,t])=>(
                  <div key={l} className={`bg-${t}/5 rounded-xl p-3 text-center`}>
                    <div className={`font-bold text-${t}`}>{v}</div>
                    <div className="text-xs text-stone-400">{l}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-700 leading-relaxed whitespace-pre-line">{detail.content}</div>
            <ChainTimeline chain={detail.chain}/>
          </div>
        )}
      </Modal>

      {/* Action modal */}
      <Modal open={!!actionModal} onClose={()=>setAct(null)} title={`Review: ${actionModal?.subject||''}`} size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        {actionModal&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-3 text-sm">
              <div className="font-semibold text-ink">{actionModal.subject}</div>
              <div className="text-xs text-stone-400 mt-0.5">From: {actionModal.submitted_by_name} · {actionModal.period}</div>
              {actionModal.total_meals>0&&<div className="flex gap-4 mt-2 text-xs text-stone-600">
                <span>Meals: <strong>{fmtNum(actionModal.total_meals)}</strong></span>
                <span>Paid: <strong>{cedis(actionModal.total_paid)}</strong></span>
                <span>Arrears: <strong className="text-rust">{cedis(actionModal.total_arrears)}</strong></span>
                <span>Compliance: <strong>{actionModal.compliance_rate}%</strong></span>
              </div>}
            </div>
            <Textarea label="Your analysis / observations (optional)" value={actForm.analysis} onChange={e=>setActForm(f=>({...f,analysis:e.target.value}))} rows={3} placeholder="Provide your analysis of this report..."/>
            <Textarea label="Comment (required for rejection)" value={actForm.comment} onChange={e=>setActForm(f=>({...f,comment:e.target.value}))} rows={2} placeholder="Add a comment..."/>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2">Action</label>
              <div className="grid grid-cols-3 gap-2">
                {[['approve','Approve & Forward','emerald'],['comment','Comment Only','amber'],['reject','Reject','rust']].map(([a,l,t])=>(
                  <button key={a} onClick={()=>setActForm(f=>({...f,action:a}))}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${actForm.action===a?`border-${t} bg-${t} text-white`:`border-stone-200 text-stone-600 hover:border-${t}/50`}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {actForm.action==='reject'&&(
              <Input label="Rejection reason (required)" value={actForm.rejection_reason} onChange={e=>setActForm(f=>({...f,rejection_reason:e.target.value}))} required placeholder="Explain why this is rejected..."/>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={()=>setAct(null)} disabled={busy}>Cancel</Button>
              <Button onClick={doAction} disabled={busy||!actForm.action} icon={CheckCircle2}>{busy?'Saving...':'Submit decision'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
