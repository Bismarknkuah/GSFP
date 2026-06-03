import { useEffect, useState } from 'react';
import { School, Plus, Pencil, Trash2, Search, Users, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import EmptyState from '../ui/EmptyState';
import { fmtNum } from '../../utils/format';

export default function SchoolsManager() {
  const [schools, setSchools]     = useState([]);
  const [districts, setDistricts] = useState([]);
  const [regions, setRegions]     = useState([]);
  const [q, setQ]                 = useState('');
  const [distFilter, setDF]       = useState('');
  const [mode, setMode]           = useState(null);
  const [delConf, setDel]         = useState(null);
  const [err, setErr]             = useState(null);
  const [ok, setOk]               = useState(null);
  const [busy, setBusy]           = useState(false);

  const load = () => Promise.all([
    api.schools.list(distFilter?{districtId:distFilter}:{}),
    api.districts.list(), api.regions.list(),
  ]).then(([{schools},{districts},{regions}])=>{ setSchools(schools); setDistricts(districts); setRegions(regions); }).catch(e=>setErr(e.message));

  useEffect(()=>{ load(); },[distFilter]);

  const visible = schools.filter(s=>!q||s.name.toLowerCase().includes(q.toLowerCase())||s.code.toLowerCase().includes(q.toLowerCase())||s.town.toLowerCase().includes(q.toLowerCase()));

  const save = async (data) => {
    setBusy(true); setErr(null);
    try {
      if (mode==='add') await api.schools.create(data);
      else await api.schools.update(mode._id||mode.id, data);
      setOk(mode==='add'?'School enrolled.':'School updated.'); setMode(null); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try { await api.schools.remove(delConf._id||delConf.id); setOk('School deactivated.'); setDel(null); load(); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Schools Management" subtitle={`${schools.length} schools enrolled across all districts.`}>
        <Button icon={Plus} onClick={()=>{setMode('add');setErr(null);}}>Enrol school</Button>
      </PageHeader>
      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!mode&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input icon={Search} placeholder="Search schools..." value={q} onChange={e=>setQ(e.target.value)} className="sm:col-span-2"/>
          <Select value={distFilter} onChange={e=>setDF(e.target.value)}
            options={[{value:'',label:'All districts'},...districts.map(d=>({value:d._id||d.id,label:d.name}))]}/>
        </div>
      </Card>

      <Card noPadding>
        {visible.length===0?<EmptyState icon={School} title="No schools found" description="Enrol a school to get started."/>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-4 py-3">School</th>
                  <th className="text-left px-4 py-3">Town</th>
                  <th className="text-right px-4 py-3">Enrolled</th>
                  <th className="text-left px-4 py-3">Headmaster</th>
                  <th className="text-left px-4 py-3">Caterer</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visible.map(s=>(
                  <tr key={s._id||s.id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{s.name}</div>
                      <div className="text-xs text-stone-400 font-mono">{s.code}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{s.town}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(s.enrolled)}</td>
                    <td className="px-4 py-3 text-xs text-stone-600">{s.headmaster?.name||'—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-600">{s.caterer?.name||'—'}{s.caterer2&&<span className="text-stone-400"> +1</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={()=>{setMode(s);setErr(null);}} className="p-1 hover:bg-cream rounded"><Pencil className="w-3.5 h-3.5 text-emerald"/></button>
                        <button onClick={()=>setDel(s)} className="p-1 hover:bg-rust/10 rounded"><Trash2 className="w-3.5 h-3.5 text-rust"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!mode} onClose={()=>setMode(null)} title={mode==='add'?'Enrol school':`Edit: ${mode?.name}`} size="lg">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <SchoolForm initial={mode!=='add'?mode:null} districts={districts} regions={regions}
          onSubmit={save} onCancel={()=>setMode(null)} busy={busy} isEdit={mode!=='add'}/>
      </Modal>

      <Modal open={!!delConf} onClose={()=>setDel(null)} title="Deactivate school">
        <p className="text-sm text-stone-600 mb-4">Deactivate <strong>{delConf?.name}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={()=>setDel(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={doDelete} disabled={busy}>{busy?'Working...':'Deactivate'}</Button>
        </div>
      </Modal>
    </>
  );
}

function SchoolForm({initial,districts,regions,onSubmit,onCancel,busy,isEdit}){
  const [f,setF]=useState({
    code:initial?.code||'', name:initial?.name||'', town:initial?.town||'',
    enrolled:initial?.enrolled||'', districtId:initial?.district_id||'', regionId:initial?.region_id||'',
    headmaster:{name:'',username:'',password:'',phone:''},
    caterer:{name:'',username:'',password:'',phone:'',rate:1.20},
    caterer2:null,
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const sNested=(k,sk,v)=>setF(p=>({...p,[k]:{...p[k],[sk]:v}}));

  return (
    <form onSubmit={e=>{e.preventDefault();onSubmit(f);}} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="School code" value={f.code} onChange={e=>s('code',e.target.value.toUpperCase())} required placeholder="AKT-001" disabled={isEdit}/>
        <Input label="Enrolled pupils" type="number" value={f.enrolled} onChange={e=>s('enrolled',e.target.value)} required/>
      </div>
      <Input label="School name" value={f.name} onChange={e=>s('name',e.target.value)} required placeholder="Akontombra D/A Basic School"/>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Town" value={f.town} onChange={e=>s('town',e.target.value)} required/>
        <Select label="District" value={f.districtId} onChange={e=>s('districtId',e.target.value)} required
          options={[{value:'',label:'Select district...'},...districts.map(d=>({value:d._id||d.id,label:d.name}))]}/>
      </div>
      {!isEdit&&(
        <>
          <div className="bg-amber/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber uppercase tracking-wider mb-3">Headmaster Account</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Full name" value={f.headmaster.name} onChange={e=>sNested('headmaster','name',e.target.value)} required/>
              <Input label="Username" value={f.headmaster.username} onChange={e=>sNested('headmaster','username',e.target.value)} required/>
              <Input label="Password" type="password" value={f.headmaster.password} onChange={e=>sNested('headmaster','password',e.target.value)} placeholder="Default: head123"/>
              <Input label="Phone" value={f.headmaster.phone} onChange={e=>sNested('headmaster','phone',e.target.value)}/>
            </div>
          </div>
          <div className="bg-forest/5 rounded-xl p-4">
            <p className="text-xs font-semibold text-forest uppercase tracking-wider mb-3">Caterer Account</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Full name" value={f.caterer.name} onChange={e=>sNested('caterer','name',e.target.value)} required/>
              <Input label="Username" value={f.caterer.username} onChange={e=>sNested('caterer','username',e.target.value)} required/>
              <Input label="Password" type="password" value={f.caterer.password} onChange={e=>sNested('caterer','password',e.target.value)} placeholder="Default: cat123"/>
              <Input label="Rate per pupil (GHS)" type="number" value={f.caterer.rate} onChange={e=>sNested('caterer','rate',e.target.value)}/>
            </div>
          </div>
        </>
      )}
      {isEdit&&(
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Active enrolled pupils" type="number" value={f.enrolled} onChange={e=>s('enrolled',e.target.value)} required/>
          <Input label="Town" value={f.town} onChange={e=>s('town',e.target.value)} required/>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy?'Saving...':isEdit?'Save changes':'Enrol school'}</Button>
      </div>
    </form>
  );
}
