import { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, TrendingDown, Users, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import { cedis, fmtNum } from '../../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PaymentSummaryWidget({ regionId, districtId }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = {};
    if (regionId)   p.regionId   = regionId;
    if (districtId) p.districtId = districtId;
    setLoading(true);
    api.bulk.paymentSummary(p)
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [regionId, districtId]);

  if (loading) return <Card><p className="text-sm text-stone-400 text-center py-6">Loading payment summary...</p></Card>;
  if (!data?.summary) return null;

  const s = data.summary;
  const payPct = s.total_caterers > 0 ? Math.round(s.caterers_received_pay/s.total_caterers*100) : 0;
  const fullyPct = s.total_caterers > 0 ? Math.round(s.caterers_fully_paid/s.total_caterers*100) : 0;

  const piData = [
    { name:'Fully Paid',   value: s.caterers_fully_paid },
    { name:'Partial',      value: Math.max(0, s.caterers_received_pay - s.caterers_fully_paid) },
    { name:'Not Received', value: Math.max(0, s.total_caterers - s.caterers_received_pay) },
  ].filter(p=>p.value>0);

  return (
    <div className="space-y-4">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Caterers Registered',    s.total_caterers,          'forest',  Users],
          ['Received Payment',       `${s.caterers_received_pay} (${payPct}%)`, 'emerald', CheckCircle2],
          ['With Arrears',           s.caterers_with_arrears,   s.caterers_with_arrears>0?'rust':'emerald', TrendingDown],
          ['Fully Paid',             `${s.caterers_fully_paid} (${fullyPct}%)`, 'forest', TrendingUp],
        ].map(([l,v,t,Icon])=>(
          <Card key={l} className="py-4 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-1 text-${t}`}/>
            <div className={`text-xl font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-xs text-stone-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Days summary */}
        <Card>
          <h4 className="font-semibold text-ink mb-3 text-sm">Days Breakdown (All Caterers)</h4>
          <div className="space-y-3">
            {[
              ['Total Days Covered', s.total_days_covered, 'forest', s.total_days_covered],
              ['Days Paid',          s.total_days_paid,    'emerald', s.total_days_covered],
              ['Days in Arrears',    s.total_days_arrears, s.total_days_arrears>0?'rust':'emerald', s.total_days_covered],
            ].map(([l,v,t,max])=>(
              <div key={l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-stone-600">{l}</span>
                  <span className={`font-bold text-${t}`}>{fmtNum(v)} days</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full">
                  <div className={`h-full bg-${t} rounded-full transition-all`} style={{width:`${max>0?Math.round(v/max*100):0}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Financial summary */}
        <Card>
          <h4 className="font-semibold text-ink mb-3 text-sm">Financial Summary</h4>
          <div className="space-y-2">
            {[
              ['Rate per pupil/day',    `GHS ${s.rate_per_day_per_pupil?.toFixed(2)||'2.00'}`, 'stone'],
              ['Total Amount Paid',     cedis(s.total_amount_paid),   'emerald'],
              ['Total Arrears Owed',    cedis(s.total_arrears_amount), s.total_arrears_amount>0?'rust':'emerald'],
            ].map(([l,v,t])=>(
              <div key={l} className={`flex items-center justify-between p-3 bg-${t}/5 rounded-xl`}>
                <span className="text-sm text-stone-600">{l}</span>
                <span className={`font-bold text-${t}`}>{v}</span>
              </div>
            ))}
          </div>
          {piData.length > 0 && (
            <ResponsiveContainer width="100%" height={140} className="mt-3">
              <PieChart>
                <Pie data={piData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {piData.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
