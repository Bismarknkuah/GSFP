import { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Search, CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
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

export default function DistrictManager() {
  const [districts, setDistricts] = useState([]);
  const [regions, setRegions]     = useState([]);
  const [filterRegion, setFR]     = useState('');
  const [q, setQ]                 = useState('');
  const [collapsed, setC]         = useState({});
  const [mode, setMode]           = useState(null);
  const [delConf, setDel]         = useState(null);
  const [form, setForm]           = useState({});
  const [err, setErr]             = useState(null);
  const [ok, setOk]               = useState(null);
  const [busy, setBusy]           = useState(false);
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => Promise.all([
    api.districts.list(filterRegion?{regionId:filterRegion}:{}),
    api.regions.list(),
  ]).then(([{districts},{regions}])=>{ setDistricts(districts); setRegions(regions); }).catch(e=>setErr(e.message));

  useEffect(()=>{ load(); },[filterRegion]);

  const filtered = districts.filter(d=>!q||d.name.toLowerCase().includes(q.toLowerCase())||d.code.toLowerCase().includes(q.toLowerCase()));
  const byRegion = filtered.reduce((acc,d)=>{
    const rn = regions.find(r=>(r._id||r.id)===d.region_id)?.name || 'Unknown Region';
    if(!acc[rn]) acc[rn]=[];
    acc[rn].push(d);
    return acc;
  },{});

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode==='add') await api.districts.create(form);
      else await api.districts.update(mode._id||mode.id, form);
      setOk(mode==='add'?'District created.':'District updated.'); setMode(null); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true); setErr(null);
    try { await api.districts.remove(delConf._id||delConf.id); setOk('District deactivated.'); setDel(null); load(); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const REGION_COLORS = {'Greater Accra':'1E40AF','Ashanti':'7C3AED','Western':'065F46','Western North':'15493B','Eastern':'B45309','Central':'0E7490','Volta':'C2410C','Oti':'9D174D','Northern':'374151','Savannah':'6B7280','North East':'4B5563','Upper East':'1F2937','Upper West':'111827','Bono':'92400E','Bono East':'78350F','Ahafo':'5B21B6'};

  return (
    <>
      <PageHeader title="District Management" subtitle="All districts across Ghana's 16 regions.">
        <Button icon={Plus} onClick={()=>{setMode('add');setForm({name:'',code:'',region_id:'',capital:''});setErr(null);}}>Add district</Button>
      </PageHeader>
      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!mode&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3">{err}</div>}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-forest">{districts.length}</div><div className="text-xs text-stone-500">Districts</div></Card>
        <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-amber">{Object.keys(byRegion).length}</div><div className="text-xs text-stone-500">Regions</div></Card>
        <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-emerald">{districts.reduce((s,d)=>s+(d.school_count||0),0)}</div><div className="text-xs text-stone-500">Schools</div></Card>
      </div>

      <Card className="mb-4">
        <div className="flex gap-3">
          <Input icon={Search} placeholder="Search districts..." value={q} onChange={e=>setQ(e.target.value)} className="flex-1"/>
          <Select value={filterRegion} onChange={e=>setFR(e.target.value)}
            options={[{value:'',label:'All regions'},...regions.map(r=>({value:r._id||r.id,label:r.name}))]} className="w-56"/>
        </div>
      </Card>

      <div className="space-y-3">
        {Object.entries(byRegion).map(([regionName,dists])=>{
          const col = REGION_COLORS[regionName]||'374151';
          const open = !collapsed[regionName];
          return (
            <Card key={regionName} noPadding>
              <button onClick={()=>setC(c=>({...c,[regionName]:!c[regionName]}))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor:`#${col}`}}/>
                  <span className="font-semibold text-ink">{regionName} Region</span>
                  <Pill tone="sage">{dists.length} district{dists.length!==1?'s':''}</Pill>
                </div>
                {open?<ChevronDown className="w-4 h-4 text-stone-400"/>:<ChevronRight className="w-4 h-4 text-stone-400"/>}
              </button>
              {open&&(
                <div className="border-t border-stone-100 divide-y divide-stone-50">
                  {dists.map(d=>(
                    <div key={d._id||d.id} className="flex items-center justify-between px-5 py-3 hover:bg-paper group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:`#${col}22`}}>
                          <MapPin className="w-3.5 h-3.5" style={{color:`#${col}`}}/>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-ink">{d.name} District</div>
                          <div className="text-xs text-stone-400">Code: <span className="font-mono">{d.code}</span>{d.capital&&` · Capital: ${d.capital}`}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="hidden md:flex gap-3 text-xs text-stone-400">
                          <span>{d.school_count||0} schools</span>
                          <span>{d.user_count||0} users</span>
                        </div>
                        <Pill tone={d.active?'emerald':'rust'}>{d.active?'Active':'Inactive'}</Pill>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>{setMode(d);setForm({name:d.name,code:d.code,region_id:d.region_id,capital:d.capital||'',active:d.active});setErr(null);}} className="p-1 hover:bg-cream rounded"><Pencil className="w-3 h-3 text-emerald"/></button>
                          <button onClick={()=>setDel(d)} className="p-1 hover:bg-rust/10 rounded"><Trash2 className="w-3 h-3 text-rust"/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
        {Object.keys(byRegion).length===0&&<Card><EmptyState icon={MapPin} title="No districts found" description="Add a district to get started."/></Card>}
      </div>

      <Modal open={!!mode} onClose={()=>setMode(null)} title={mode==='add'?'Add district':`Edit: ${mode?.name}`} size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <Select label="Region" value={form.region_id} onChange={e=>s('region_id',e.target.value)} required
            options={[{value:'',label:'Select region...'},...regions.map(r=>({value:r._id||r.id,label:`${r.name} Region`}))]}/>
          <Input label="District name" value={form.name} onChange={e=>s('name',e.target.value)} required placeholder="e.g. Sefwi Akontombra"/>
          <div className="grid grid-cols-2 gap-3">
            <Input label="District code" value={form.code} onChange={e=>s('code',e.target.value.toUpperCase())} required placeholder="WN-AKT" disabled={mode!=='add'}/>
            <Input label="Capital" value={form.capital} onChange={e=>s('capital',e.target.value)} placeholder="e.g. Akontombra"/>
          </div>
          {mode!=='add'&&<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e=>s('active',e.target.checked)} className="accent-emerald w-4 h-4"/><span className="text-sm">Active</span></label>}
          <div className="bg-cream rounded-lg p-3 text-xs text-stone-500">District code must be unique. Use region prefix + abbreviation (e.g. WNR-AKT).</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setMode(null)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy?'Saving...':mode==='add'?'Create district':'Save'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!delConf} onClose={()=>setDel(null)} title="Deactivate district">
        <p className="text-sm text-stone-600 mb-4">Deactivate <strong>{delConf?.name}</strong>? Schools remain but the district goes inactive.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={()=>setDel(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={doDelete} disabled={busy}>{busy?'Deactivating...':'Yes, deactivate'}</Button>
        </div>
      </Modal>
    </>
  );
}
