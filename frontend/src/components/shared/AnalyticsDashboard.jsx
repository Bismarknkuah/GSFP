import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import { fmtNum, fmtDate, cedis } from '../../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#15493B','#C9882C','#059669','#C0392B','#1E3A5F','#84A98C','#D4A843','#9D174D'];

export default function AnalyticsDashboard() {
  const [overview, setOv]   = useState(null);
  const [monthly, setMon]   = useState([]);
  const [caterers, setCat]  = useState([]);

  useEffect(()=>{
    Promise.all([api.analytics.overview(),api.analytics.monthly(),api.analytics.caterers()])
      .then(([ov,mo,ca])=>{ setOv(ov); setMon(mo.monthly||[]); setCat(ca.caterers||[]); })
      .catch(console.error);
  },[]);

  const c = overview?.counters||{};
  const statusPie = [
    {name:'Approved',value:c.approved_reports||0},
    {name:'Pending',value:c.pending_reports||0},
    {name:'Rejected',value:c.rejected_reports||0},
  ].filter(p=>p.value>0);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Performance metrics and feeding statistics."/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['Meals This Month',fmtNum(c.meals_this_month||0),'emerald'],
          ['Meals All Time',fmtNum(c.meals_all_time||0),'forest'],
          ['Approved Reports',fmtNum(c.approved_reports||0),'emerald'],
          ['Pending Reviews',fmtNum(c.pending_reports||0),'amber'],
        ].map(([l,v,t])=>(
          <Card key={l} className="text-center py-4">
            <div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-xs text-stone-500 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="font-semibold text-ink mb-4">Monthly Meals Served</h3>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Bar dataKey="meals" fill="#15493B" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ):<p className="text-stone-400 text-sm text-center py-16">No data yet</p>}
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-4">Report Status Distribution</h3>
          {statusPie.length>0?(
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                  {statusPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}
                </Pie>
                <Legend/>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          ):<p className="text-stone-400 text-sm text-center py-16">No data yet</p>}
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-ink mb-4">Caterer Performance Ranking</h3>
        {caterers.length>0?(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-stone-500 bg-stone-50">
                <tr>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Caterer</th>
                  <th className="text-right px-4 py-3">Approved</th>
                  <th className="text-right px-4 py-3">Pending</th>
                  <th className="text-right px-4 py-3">Total Meals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {caterers.slice(0,15).map((c,i)=>(
                  <tr key={c._id||c.id||i} className="hover:bg-paper">
                    <td className="px-4 py-2.5 text-xs text-stone-400 font-mono">{i+1}</td>
                    <td className="px-4 py-2.5 font-medium text-ink text-xs">{c.name||'—'}</td>
                    <td className="px-4 py-2.5 text-right text-emerald font-mono text-xs">{fmtNum(c.approved)}</td>
                    <td className="px-4 py-2.5 text-right text-amber font-mono text-xs">{fmtNum(c.pending)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-forest font-mono text-xs">{fmtNum(c.meals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ):<p className="text-stone-400 text-sm text-center py-8">No caterer data yet</p>}
      </Card>
    </>
  );
}
