import { useEffect, useState } from 'react';
import { Activity, School, FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, BarChart3, Send, MapPin } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import OfficialReportsHub from './OfficialReportsHub';
import { fmtNum, cedis, fmtDate, ROLE_LABELS } from '../../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

const LEVEL_LABEL = { monitoring_officer:'District Monitoring', regional_monitoring:'Regional Monitoring', national_monitoring:'National Monitoring' };

export default function MonitoringDashboard({ view }) {
  const { user } = useAuth();
  const [overview, setOv]    = useState(null);
  const [monthly,  setMon]   = useState([]);
  const [schools,  setSch]   = useState([]);
  const [reports,  setRep]   = useState([]);
  const [regions,  setReg]   = useState([]);

  const isNational = user.role==='national_monitoring';
  const isRegional = user.role==='regional_monitoring';

  useEffect(()=>{
    Promise.allSettled([
      api.analytics.overview(),
      api.analytics.monthly(),
      api.schools.list(),
      api.reports.list({ limit:100 }),
      ...(isNational?[api.regions.list()]:[Promise.resolve({regions:[]})]),
    ]).then(([ov,mon,sch,rep,reg])=>{
      if(ov.status==='fulfilled')  setOv(ov.value?.counters||{});
      if(mon.status==='fulfilled') setMon(mon.value?.monthly||[]);
      if(sch.status==='fulfilled') setSch(sch.value?.schools||[]);
      if(rep.status==='fulfilled') setRep(rep.value?.reports||[]);
      if(reg&&reg.status==='fulfilled') setReg(reg.value?.regions||[]);
    }).catch(console.error);
  },[]);

  if (view==='reports') return <OfficialReportsHub/>;

  const c = overview||{};
  const compRate = (c.approved_reports||0)+(c.pending_reports||0)>0
    ? Math.round((c.approved_reports||0)/((c.approved_reports||0)+(c.pending_reports||0))*100):0;

  // Non-compliant schools (no report today)
  const today = new Date().toISOString().split('T')[0];
  const reportedToday = new Set(reports.filter(r=>r.date===today&&r.status!=='rejected').map(r=>r.school_id));
  const nonCompliant = schools.filter(s=>!reportedToday.has(s._id||s.id));

  // Weekly trend
  const weeklyData = monthly.slice(-8);

  return (
    <div className="space-y-6">
      <PageHeader title={LEVEL_LABEL[user.role]||'Monitoring Dashboard'} subtitle={`${user.name} — Track compliance, school performance, and feeding programme coverage.`}/>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Schools Monitored" value={fmtNum(c.schools||0)} icon={School} tone="forest"/>
        <KPI label="Meals This Month" value={fmtNum(c.meals_this_month||0)} icon={TrendingUp} tone="emerald"/>
        <KPI label="Compliance Rate" value={`${compRate}%`} icon={CheckCircle2} tone={compRate>=90?'emerald':'amber'}/>
        <KPI label="Non-Compliant Today" value={fmtNum(nonCompliant.length)} icon={AlertTriangle} tone={nonCompliant.length>0?'rust':'emerald'}/>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend */}
        <Card>
          <h3 className="font-semibold text-ink mb-4">Feeding Coverage Trend</h3>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyData}>
                <defs><linearGradient id="monGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Area type="monotone" dataKey="meals" stroke="#15493B" fill="url(#monGrad)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          ):<p className="text-stone-300 text-sm text-center py-12">No trend data</p>}
        </Card>

        {/* Non-compliant schools */}
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rust"/>Non-Compliant Today ({nonCompliant.length})
          </h3>
          {nonCompliant.length===0
            ? <div className="flex flex-col items-center justify-center py-8 text-emerald gap-2"><CheckCircle2 className="w-8 h-8"/><p className="text-sm font-medium">All schools compliant today!</p></div>
            : <div className="space-y-2 max-h-52 overflow-y-auto">
                {nonCompliant.map(s=>(
                  <div key={s._id||s.id} className="flex items-center justify-between p-2.5 bg-rust/5 border border-rust/20 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-ink">{s.name}</div>
                      <div className="text-xs text-stone-400">{s.town} · {s.caterer?.name||'No caterer'}</div>
                    </div>
                    <div className="text-xs font-mono text-stone-400">{fmtNum(s.enrolled)} pupils</div>
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>

      {/* Regional overview for national monitoring */}
      {isNational&&regions.length>0&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-navy"/>Regional Overview</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {regions.map(r=>(
              <div key={r._id||r.id} className="p-3 bg-stone-50 rounded-xl">
                <div className="font-semibold text-ink text-sm">{r.name}</div>
                <div className="text-xs text-stone-400 mt-0.5">{r.district_count||0} districts</div>
                <Pill tone={r.active?'emerald':'stone'} className="mt-1">{r.active?'Active':'Inactive'}</Pill>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Schools performance */}
      <Card>
        <h3 className="font-semibold text-ink mb-4">Schools Performance</h3>
        {schools.length===0?<p className="text-stone-300 text-sm text-center py-6">No schools data</p>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500"><tr><th className="text-left px-4 py-3">School</th><th className="text-left px-4 py-3">Town</th><th className="text-right px-4 py-3">Enrolled</th><th className="text-left px-4 py-3">Caterer</th><th className="text-center px-4 py-3">Today</th></tr></thead>
              <tbody className="divide-y divide-stone-50">
                {schools.map(s=>(
                  <tr key={s._id||s.id} className="hover:bg-paper">
                    <td className="px-4 py-3 font-medium text-ink text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{s.town}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.enrolled)}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{s.caterer?.name||'—'}</td>
                    <td className="px-4 py-3 text-center">
                      {reportedToday.has(s._id||s.id)
                        ? <Pill tone="emerald">Reported</Pill>
                        : <Pill tone="rust">Missing</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
