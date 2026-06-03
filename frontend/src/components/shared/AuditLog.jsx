import { useEffect, useState } from 'react';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Pill from '../ui/Pill';
import EmptyState from '../ui/EmptyState';
import { fmtDateTime, ROLE_LABELS } from '../../utils/format';

const LEVEL_TONE = { info:'forest', warn:'amber', error:'rust' };

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [level, setLevel]     = useState('');

  useEffect(()=>{
    setLoading(true);
    api.audit.list({limit:500}).then(({entries})=>setEntries(entries||[])).catch(console.error).finally(()=>setLoading(false));
  },[]);

  const visible = entries.filter(e=>(!q||(e.action+e.user_name+e.details).toLowerCase().includes(q.toLowerCase()))&&(!level||e.level===level));

  return (
    <>
      <PageHeader title="Audit Trail" subtitle="Complete log of all system actions and user activity."/>
      <Card className="mb-4">
        <div className="flex gap-3">
          <Input icon={Search} placeholder="Search actions, users..." value={q} onChange={e=>setQ(e.target.value)} className="flex-1"/>
          <Select value={level} onChange={e=>setLevel(e.target.value)} className="w-36"
            options={[{value:'',label:'All levels'},{value:'info',label:'Info'},{value:'warn',label:'Warning'},{value:'error',label:'Error'}]}/>
        </div>
      </Card>
      <Card noPadding>
        {loading?<div className="p-6 text-sm text-stone-500 text-center">Loading...</div>
        :visible.length===0?<EmptyState icon={ShieldCheck} title="No audit entries"/>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-4 py-3">Timestamp</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Details</th>
                  <th className="px-4 py-3">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visible.map(e=>(
                  <tr key={e._id||e.id} className="hover:bg-paper">
                    <td className="px-4 py-2.5 text-xs text-stone-400 whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-ink">{e.user_name}</td>
                    <td className="px-4 py-2.5 text-xs text-stone-500">{ROLE_LABELS[e.user_role]||e.user_role}</td>
                    <td className="px-4 py-2.5"><span className="text-xs font-mono bg-stone-100 px-2 py-0.5 rounded">{e.action}</span></td>
                    <td className="px-4 py-2.5 text-xs text-stone-500 max-w-[200px] truncate">{e.details||'—'}</td>
                    <td className="px-4 py-2.5 text-center"><Pill tone={LEVEL_TONE[e.level]||'stone'}>{e.level||'info'}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
