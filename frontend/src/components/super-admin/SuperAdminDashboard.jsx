import { useEffect, useState } from 'react';
import { Globe, MapPin, School, Users, FileText, DollarSign, BarChart3, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../../api/client';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import PageHeader from '../ui/PageHeader';
import { cedis, fmtNum, fmtDateTime } from '../../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [finance, setFinance] = useState(null);

  useEffect(() => {
    Promise.all([api.analytics.overview(), api.audit.list({ limit:8 }), api.finance.summary()])
      .then(([ov, au, fn]) => { setData(ov); setAudit(au.entries||[]); setFinance(fn); })
      .catch(console.error);
  }, []);

  const c = data?.counters || {};

  return (
    <div className="space-y-6">
      <PageHeader title="National Command Centre" subtitle="Full oversight across all 16 regions of Ghana School Feeding Programme."/>

      {/* National KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPI label="Regions"       value={c.regions||16}          icon={Globe}     tone="navy"/>
        <KPI label="Districts"     value={fmtNum(c.districts||0)} icon={MapPin}    tone="forest"/>
        <KPI label="Schools"       value={fmtNum(c.schools||0)}   icon={School}    tone="emerald"/>
        <KPI label="Total Users"   value={fmtNum(c.caterers||0)}  icon={Users}     tone="amber"/>
        <KPI label="Meals Today"   value={fmtNum(c.meals_today||0)}icon={TrendingUp}tone="emerald"/>
        <KPI label="Pending Reports" value={fmtNum(c.pending_reports||0)} icon={Clock} tone="amber"/>
      </div>

      {/* Finance summary */}
      {finance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="National Budget"  value={cedis(finance.national?.total||0)}     icon={DollarSign} tone="navy"/>
          <KPI label="Allocated"        value={cedis(finance.national?.allocated||0)} icon={DollarSign} tone="forest"/>
          <KPI label="Disbursed"        value={cedis(finance.national?.disbursed||0)} icon={CheckCircle2} tone="emerald"/>
          <KPI label="Balance"          value={cedis(finance.national?.balance||0)}   icon={DollarSign} tone="amber"/>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend chart */}
        <Card>
          <h3 className="font-semibold text-ink mb-4">National Feeding Trend (30 days)</h3>
          {data?.trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.trend}>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v)=>[fmtNum(v),'Meals']}/>
                <Bar dataKey="meals" fill="#15493B" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-stone-400 text-sm text-center py-10">No data yet</p>}
        </Card>

        {/* Recent audit */}
        <Card>
          <h3 className="font-semibold text-ink mb-4">Recent System Activity</h3>
          <div className="space-y-2">
            {audit.map(a => (
              <div key={a._id||a.id} className="flex items-start gap-3 py-2 border-b border-stone-50 last:border-0">
                <ShieldCheck className="w-4 h-4 text-forest flex-shrink-0 mt-0.5"/>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink">{a.action}</div>
                  <div className="text-xs text-stone-400">{a.user_name} · {fmtDateTime(a.timestamp)}</div>
                  {a.details && <div className="text-xs text-stone-500 truncate">{a.details}</div>}
                </div>
              </div>
            ))}
            {audit.length === 0 && <p className="text-stone-400 text-sm text-center py-6">No audit entries yet</p>}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <h3 className="font-semibold text-ink mb-4">System Status</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label:'Approved Reports', value:fmtNum(c.approved_reports||0), tone:'emerald', icon:CheckCircle2 },
            { label:'Pending Review',   value:fmtNum(c.pending_reports||0),  tone:'amber',   icon:Clock },
            { label:'Total Arrears',    value:cedis(c.total_arrears||0),      tone:c.total_arrears>0?'rust':'emerald', icon:DollarSign },
          ].map(item => (
            <div key={item.label} className={`rounded-xl p-4 bg-${item.tone}/10 flex items-center gap-3`}>
              <item.icon className={`w-8 h-8 text-${item.tone}`}/>
              <div>
                <div className={`text-2xl font-bold font-serif text-${item.tone}`}>{item.value}</div>
                <div className="text-xs text-stone-500">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
