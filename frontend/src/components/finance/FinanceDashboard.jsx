import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Download, AlertCircle, CheckCircle2, Clock, BarChart3, Upload, Plus } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import { cedis, fmtNum, fmtDate, ROLE_LABELS } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

const TIER_LABEL = {
  national_finance:  'National Finance Portal',
  regional_finance:  'Regional Finance Portal',
  finance_officer:   'District Finance Portal',
};

export default function FinanceDashboard({ onNavigate }) {
  const { user }   = useAuth();
  const [summary,  setSm]  = useState(null);
  const [payments, setPay] = useState([]);
  const [monthly,  setMon] = useState([]);
  const [disbs,    setDsb] = useState([]);
  const [loading,  setLoad]= useState(true);

  useEffect(()=>{
    setLoad(true);
    Promise.allSettled([
      api.finance.summary(),
      api.payments.list(),
      api.analytics.monthly(),
      api.disbursements.list({ limit:10 }),
    ]).then(([sm,pay,mon,dsb])=>{
      if(sm.status==='fulfilled')  setSm(sm.value);
      if(pay.status==='fulfilled') setPay(pay.value?.payments||[]);
      if(mon.status==='fulfilled') setMon(mon.value?.monthly||[]);
      if(dsb.status==='fulfilled') setDsb(dsb.value?.disbursements||[]);
    }).finally(()=>setLoad(false));
  },[]);

  const nat          = summary?.national || {};
  const paySm        = summary?.payments_summary || {};
  const totalArrears = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const totalPaid    = payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const pendingDisbs = disbs.filter(d=>d.status==='pending_ceo');

  const doExport = (type) => {
    const opts = {
      title:`${TIER_LABEL[user.role]||'Finance'} — Payment Report`,
      subtitle:`Generated: ${new Date().toLocaleString('en-GH')}`,
      columns:['Period','Caterer','Days Covered','Days Paid','Arrears Days','Amount Paid (GHS)','Arrears (GHS)','Status'],
      rows: payments.map(p=>[p.period, p.caterer?.name||'—', p.days_covered, p.days_paid, p.days_arrears, (p.amount_paid||0).toFixed(2), (p.arrears_amount||0).toFixed(2), p.status]),
      summaryRows:[
        { label:'Total Paid',      value:cedis(totalPaid) },
        { label:'Total Arrears',   value:cedis(totalArrears) },
        { label:'Payment Records', value:paySm.count||payments.length },
      ],
      filename:`GSFP_Finance_${new Date().toISOString().slice(0,10)}`,
    };
    if (type==='pdf') exportPDF({...opts, filename:opts.filename+'.pdf', orientation:'landscape'});
    else exportExcel({ filename:opts.filename+'.xlsx', sheets:[{ name:'Payments', columns:opts.columns, rows:opts.rows, summaryRows:opts.summaryRows }] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={TIER_LABEL[user.role]||'Finance Portal'}
        subtitle={`${user.name} — ${ROLE_LABELS[user.role]}. Manage payments, budgets, arrears and disbursements.`}>
        <div className="flex gap-2">
          <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('pdf')}>PDF</Button>
          <Button icon={Download} variant="secondary" size="sm" onClick={()=>doExport('excel')}>Excel</Button>
          {['national_finance','super_admin'].includes(user.role) && (
            <Button icon={Plus} size="sm" onClick={()=>onNavigate&&onNavigate('disbursements')}>New Disbursement</Button>
          )}
        </div>
      </PageHeader>

      {/* CEO approval alert */}
      {pendingDisbs.length>0 && (
        <div className="p-4 bg-amber/10 border-2 border-amber/30 rounded-2xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-amber">{pendingDisbs.length} disbursement{pendingDisbs.length!==1?'s':''} awaiting CEO approval</p>
            <p className="text-sm text-stone-600 mt-0.5">Total pending: <strong>{cedis(pendingDisbs.reduce((s,d)=>s+(d.amount||0),0))}</strong></p>
          </div>
          <button onClick={()=>onNavigate&&onNavigate('disbursements')} className="ml-auto text-xs text-amber underline">View ledger</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Paid"         value={cedis(totalPaid)}    icon={CheckCircle2} tone="emerald"/>
        <KPI label="Total Arrears"      value={cedis(totalArrears)} icon={TrendingDown}  tone={totalArrears>0?'rust':'emerald'}/>
        <KPI label="Payment Records"    value={fmtNum(payments.length)} icon={CreditCard} tone="navy"/>
        <KPI label="Budget Balance"     value={cedis(nat.balance||0)} icon={DollarSign}  tone={nat.balance<nat.total*0.1?'rust':'forest'}/>
      </div>

      {/* Budget bar */}
      {nat.total>0 && (
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald"/>Budget Overview — 2025/2026
          </h3>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              ['Total Budget',  nat.total,      100,                                           'forest'],
              ['Allocated',     nat.allocated,  nat.total>0?nat.allocated/nat.total*100:0,    'amber'],
              ['Disbursed',     nat.disbursed,  nat.total>0?nat.disbursed/nat.total*100:0,    'emerald'],
              ['Balance',       nat.balance,    nat.total>0?nat.balance/nat.total*100:0,       nat.balance<nat.total*0.1?'rust':'forest'],
            ].map(([l,v,pct,t])=>(
              <div key={l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-stone-500">{l}</span>
                  <span className={`font-bold text-${t}`}>{Number(pct).toFixed(0)}%</span>
                </div>
                <div className="text-lg font-bold font-serif text-ink">{cedis(v||0)}</div>
                <div className="h-1.5 bg-stone-100 rounded-full mt-1.5">
                  <div className={`h-full bg-${t} rounded-full`} style={{width:`${Math.min(Number(pct)||0,100)}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <Card>
          <h3 className="font-semibold text-ink mb-4">Monthly Meals Trend</h3>
          {monthly.length>0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly}>
                <defs><linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Area type="monotone" dataKey="meals" stroke="#15493B" fill="url(#finGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-stone-300 text-sm text-center py-16">No data yet</p>}
        </Card>

        {/* Arrears ranking */}
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rust"/>Top Arrears
          </h3>
          {payments.filter(p=>p.days_arrears>0).length===0
            ? <p className="text-stone-300 text-sm text-center py-16">No arrears — all caterers fully paid! 🎉</p>
            : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {[...payments].filter(p=>p.days_arrears>0).sort((a,b)=>b.arrears_amount-a.arrears_amount).map((p,i)=>(
                  <div key={p._id||p.id} className="flex items-center justify-between p-2.5 bg-rust/5 border border-rust/20 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-ink">{p.caterer?.name||'—'}</div>
                      <div className="text-xs text-stone-400">{p.period} · {p.days_arrears} days</div>
                    </div>
                    <div className="text-sm font-bold text-rust">{cedis(p.arrears_amount)}</div>
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      </div>

      {/* Recent payments table */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink">Payment Records</h3>
          <div className="flex gap-2">
            <Button icon={Upload} variant="secondary" size="sm" onClick={()=>onNavigate&&onNavigate('bulk-upload')}>Bulk Upload</Button>
          </div>
        </div>
        {payments.length===0
          ? <p className="p-8 text-center text-stone-300 text-sm">No payment records yet</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-left px-4 py-3">Period</th>
                    <th className="text-left px-4 py-3">Caterer</th>
                    <th className="text-right px-4 py-3">Days Covered</th>
                    <th className="text-right px-4 py-3">Days Paid</th>
                    <th className="text-right px-4 py-3">Arrears</th>
                    <th className="text-right px-4 py-3">Amount Paid</th>
                    <th className="text-right px-4 py-3">Arrears (GHS)</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {payments.map(p=>(
                    <tr key={p._id||p.id} className="hover:bg-paper">
                      <td className="px-4 py-2.5 text-xs">{p.period}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-xs text-ink">{p.caterer?.name||'—'}</div>
                        <div className="text-[10px] text-stone-400">{p.school?.name||'—'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{p.days_covered}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald">{p.days_paid}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-bold':''}`}>{p.days_arrears}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-xs">{cedis(p.amount_paid)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${p.arrears_amount>0?'text-rust font-bold':''}`}>{cedis(p.arrears_amount)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Pill tone={p.status==='fully-paid'?'emerald':'rust'}>{p.status}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-stone-500">Totals</td>
                    <td className="px-4 py-3 text-right text-emerald font-bold">{cedis(totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-rust font-bold">{cedis(totalArrears)}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </Card>

      {/* Quick links */}
      <Card>
        <h3 className="font-semibold text-ink mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Disbursement Ledger', view:'disbursements', icon:DollarSign,  color:'#C9882C' },
            { label:'National Finance',    view:'natfinance',    icon:BarChart3,   color:'#0f2d5e' },
            { label:'Bulk Upload',         view:'bulk-upload',   icon:Upload,      color:'#15493B' },
            { label:'All Payments',        view:'payments',      icon:CreditCard,  color:'#059669' },
          ].map(item=>(
            <button key={item.view} onClick={()=>onNavigate&&onNavigate(item.view)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone-100 hover:shadow-sm hover:border-stone-200 transition-all group bg-white">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{backgroundColor:`${item.color}18`}}>
                <item.icon className="w-5 h-5" style={{color:item.color}}/>
              </div>
              <span className="text-xs font-medium text-stone-600 text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
