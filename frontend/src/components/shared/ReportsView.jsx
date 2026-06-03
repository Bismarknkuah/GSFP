import { useEffect, useState, useRef } from 'react';
import { FileText, Search, Filter, CheckCircle2, XCircle, Clock, Download, Eye } from 'lucide-react';
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
import { fmtDate, fmtNum, daysAgoISO, ROLE_LABELS } from '../../utils/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsView() {
  const { user } = useAuth();
  const [reports, setReports]   = useState([]);
  const [status, setStatus]     = useState('');
  const [from, setFrom]         = useState(daysAgoISO(30));
  const [to, setTo]             = useState('');
  const [loading, setLoading]   = useState(true);
  const [detail, setDetail]     = useState(null);
  const [reviewMode, setReview] = useState(null);
  const [comment, setComment]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState(null);

  const canReview = user.role==='headmaster';
  const canRegionalReview = ['regional_coordinator','regional_admin','regional_auditor'].includes(user.role);

  const load = () => {
    setLoading(true);
    const p = {};
    if (status) p.status=status;
    if (from)   p.from=from;
    if (to)     p.to=to;
    api.reports.list(p).then(({reports})=>setReports(reports)).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[status,from,to]);

  const doReview = async (decision) => {
    setBusy(true); setErr(null);
    try {
      if (canReview) await api.reports.review(reviewMode._id||reviewMode.id, decision, comment);
      else await api.reports.regionalReview(reviewMode._id||reviewMode.id, decision, comment);
      setReview(null); setComment(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Ghana School Feeding Programme — Feeding Reports', 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-GH')}  |  Period: ${from||'All'} to ${to||'Now'}`, 14, 25);
    autoTable(doc, {
      startY:30, headStyles:{fillColor:[21,73,59]},
      head:[['Date','School','Caterer','Food','Fed','Status']],
      body:reports.map(r=>[fmtDate(r.date),r.school?.name||'—',r.caterer?.name||'—',r.food_type||'—',fmtNum(r.students_fed),r.status]),
      styles:{fontSize:8},
    });
    doc.save('GSFP_Reports.pdf');
  };

  const stats = { total:reports.length, approved:reports.filter(r=>r.status==='approved').length, pending:reports.filter(r=>r.status==='pending').length, rejected:reports.filter(r=>r.status==='rejected').length };

  return (
    <>
      <PageHeader title="Feeding Reports" subtitle="Daily feeding report submissions across all schools.">
        <Button icon={Download} variant="secondary" onClick={exportPDF}>Export PDF</Button>
      </PageHeader>

      {err&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3">{err}</div>}

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[['Total',stats.total,'stone'],['Approved',stats.approved,'emerald'],['Pending',stats.pending,'amber'],['Rejected',stats.rejected,'rust']].map(([l,v,t])=>(
          <Card key={l} className={`text-center py-3 cursor-pointer border-2 ${status===l.toLowerCase()||(!status&&l==='Total')?'border-forest':'border-transparent'}`} onClick={()=>setStatus(l==='Total'?'':l.toLowerCase())}>
            <div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-xs text-stone-500">{l}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Select value={status} onChange={e=>setStatus(e.target.value)}
            options={[{value:'',label:'All statuses'},{value:'pending',label:'Pending'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'}]}/>
          <div className="flex gap-2 items-end">
            <Input label="From" type="date" value={from} onChange={e=>setFrom(e.target.value)} className="flex-1"/>
            <Input label="To" type="date" value={to} onChange={e=>setTo(e.target.value)} className="flex-1"/>
          </div>
        </div>
      </Card>

      <Card noPadding>
        {loading?<div className="p-6 text-sm text-stone-500 text-center">Loading reports...</div>
        :reports.length===0?<EmptyState icon={FileText} title="No reports found" description="Adjust filters or check back later."/>:(
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
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {reports.map(r=>(
                  <tr key={r._id||r.id} className="hover:bg-paper">
                    <td className="px-4 py-3 text-xs text-stone-600">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3"><div className="font-medium text-ink text-xs">{r.school?.name||'—'}</div><div className="text-xs text-stone-400">{r.school?.town}</div></td>
                    <td className="px-4 py-3 text-xs text-stone-600">{r.caterer?.name||'—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-600 max-w-[160px] truncate">{r.food_type||'—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(r.students_fed)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={()=>setDetail(r)} className="p-1 hover:bg-cream rounded" title="View"><Eye className="w-3.5 h-3.5 text-forest"/></button>
                        {(canReview||canRegionalReview)&&r.status==='pending'&&<button onClick={()=>{setReview(r);setComment('');setErr(null);}} className="p-1 hover:bg-amber/10 rounded" title="Review"><CheckCircle2 className="w-3.5 h-3.5 text-amber"/></button>}
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
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="Report Details" size="md">
        {detail&&(
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[['Date',fmtDate(detail.date)],['School',detail.school?.name],['Town',detail.school?.town],['Caterer',detail.caterer?.name],['Food',detail.food_type],['Students Fed',fmtNum(detail.students_fed)],['Time Ready',detail.time_ready],['Time Served',detail.time_served]].map(([l,v])=>(
                <div key={l}><span className="text-xs font-medium text-stone-500">{l}</span><div className="font-medium text-ink">{v||'—'}</div></div>
              ))}
            </div>
            {detail.notes&&<div><span className="text-xs font-medium text-stone-500">Notes</span><div className="text-stone-700">{detail.notes}</div></div>}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
              <StatusBadge status={detail.status}/>
              {detail.headmaster_comment&&<span className="text-xs text-stone-500">{detail.headmaster_comment}</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* Review modal */}
      <Modal open={!!reviewMode} onClose={()=>setReview(null)} title="Review Report" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        {reviewMode&&(
          <div className="space-y-4">
            <div className="bg-cream rounded-xl p-3 text-sm">
              <div className="font-semibold">{reviewMode.school?.name}</div>
              <div className="text-stone-500">{fmtDate(reviewMode.date)} · {reviewMode.food_type}</div>
              <div className="text-stone-600 mt-1">{fmtNum(reviewMode.students_fed)} pupils fed</div>
            </div>
            <Textarea label="Comment (optional)" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment..."/>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={()=>doReview('approved')} disabled={busy} icon={CheckCircle2}>{busy?'Saving...':'Approve'}</Button>
              <Button variant="danger" className="flex-1" onClick={()=>doReview('rejected')} disabled={busy} icon={XCircle}>Reject</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
