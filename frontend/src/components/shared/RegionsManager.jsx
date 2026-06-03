import { useEffect, useState } from 'react';
import { Globe, Plus, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import EmptyState from '../ui/EmptyState';
import { GHANA_REGIONS } from '../../utils/format';

export default function RegionsManager() {
  const [regions, setRegions] = useState([]);
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({name:'',code:'',capital:''});
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.regions.list().then(({regions})=>setRegions(regions)).catch(e=>setErr(e.message));
  useEffect(()=>{load();},[]);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode==='add') await api.regions.create(form);
      else await api.regions.update(mode._id||mode.id, form);
      setOk(mode==='add'?'Region created.':'Region updated.');
      setMode(null); load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Regions Management" subtitle={`All 16 regions of Ghana. ${regions.length} registered.`}>
        <Button icon={Plus} onClick={()=>{setMode('add');setForm({name:'',code:'',capital:''});setErr(null);}}>Add region</Button>
      </PageHeader>
      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!mode&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3">{err}</div>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {regions.map(r=>(
          <Card key={r._id||r.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-ink">{r.name} Region</div>
              <button onClick={()=>{setMode(r);setForm({name:r.name,code:r.code,capital:r.capital||''});setErr(null);}} className="p-1.5 hover:bg-cream rounded-lg"><Pencil className="w-3.5 h-3.5 text-emerald"/></button>
            </div>
            <div className="text-xs text-stone-500">Code: <span className="font-mono">{r.code}</span> · Capital: {r.capital||'—'}</div>
            <div className="flex gap-2">
              <Pill tone="forest">{r.district_count||0} districts</Pill>
              <Pill tone={r.active?'emerald':'rust'}>{r.active?'Active':'Inactive'}</Pill>
            </div>
          </Card>
        ))}
        {regions.length===0&&<Card className="col-span-3"><EmptyState icon={Globe} title="No regions registered"/></Card>}
      </div>
      <Modal open={!!mode} onClose={()=>setMode(null)} title={mode==='add'?'Add region':`Edit: ${mode?.name}`} size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <Select label="Ghana Region" value={form.name} onChange={e=>{const r=GHANA_REGIONS.find(x=>x===e.target.value)||'';setForm(f=>({...f,name:r}));}}
            options={[{value:'',label:'Select region...'},...GHANA_REGIONS.map(r=>({value:r,label:r}))]}/>
          <Input label="Region code" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="e.g. WNR" disabled={mode!=='add'}/>
          <Input label="Regional capital" value={form.capital} onChange={e=>setForm(f=>({...f,capital:e.target.value}))} placeholder="e.g. Sefwi Wiawso"/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setMode(null)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy?'Saving...':mode==='add'?'Create region':'Save'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
