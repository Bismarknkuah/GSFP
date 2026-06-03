import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Search, CheckCircle2, AlertCircle, Key, RefreshCw, UserX, UserCheck, Lock, Eye } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import EmptyState from '../ui/EmptyState';
import { ROLE_LABELS, fmtDateTime } from '../../utils/format';

const TIER_COLORS = {
  super_admin:'bg-gray-900 text-white', national_admin:'bg-indigo-800 text-white',
  national_finance:'bg-indigo-600 text-white', regional_minister:'bg-purple-800 text-white',
  regional_coordinator:'bg-purple-600 text-white', regional_admin:'bg-purple-400 text-white',
  regional_finance:'bg-violet-600 text-white', regional_auditor:'bg-violet-400 text-white',
  district_director:'bg-teal-700 text-white', district_coordinator:'bg-teal-600 text-white',
  district_admin:'bg-teal-500 text-white', finance_officer:'bg-amber text-white',
  auditor:'bg-amber-700 text-white', monitoring_officer:'bg-yellow-600 text-white',
  caterer:'bg-green-700 text-white', headmaster:'bg-blue-700 text-white',
  data_entry:'bg-gray-500 text-white', readonly:'bg-gray-400 text-white',
};

// Roles visible per admin level
const EDITABLE_ROLES = {
  super_admin:          Object.keys(ROLE_LABELS),
  national_admin:       Object.keys(ROLE_LABELS).filter(r=>r!=='super_admin'),
  regional_coordinator: ['regional_admin','regional_finance','regional_auditor','district_director','district_coordinator','district_admin','finance_officer','auditor','monitoring_officer','caterer','headmaster','data_entry','readonly'],
  regional_admin:       ['district_coordinator','district_admin','finance_officer','caterer','headmaster','data_entry'],
  district_director:    ['district_admin','finance_officer','auditor','monitoring_officer','caterer','headmaster','data_entry','readonly'],
  district_coordinator: ['caterer','headmaster','data_entry'],
};

export default function UniversalUserManager() {
  const { user } = useAuth();
  const [users,     setUsers]     = useState([]);
  const [regions,   setRegions]   = useState([]);
  const [districts, setDistricts] = useState([]);
  const [q,         setQ]         = useState('');
  const [roleFilter,setRF]        = useState('');
  const [statusFilter,setSF]      = useState('true');
  const [mode,      setMode]       = useState(null);
  const [delConf,   setDel]        = useState(null);
  const [tempPwdRes,setTempPwd]   = useState(null);
  const [resetConf, setResetConf] = useState(null);
  const [newPw,     setNewPw]     = useState('');
  const [err,       setErr]        = useState(null);
  const [ok,        setOk]         = useState(null);
  const [busy,      setBusy]       = useState(false);

  const editableRoles = EDITABLE_ROLES[user.role] || EDITABLE_ROLES.district_coordinator;

  useEffect(()=>{
    Promise.all([api.regions.list(), api.districts.list()])
      .then(([{regions},{districts}])=>{ setRegions(regions); setDistricts(districts); }).catch(()=>{});
  },[]);

  const load = () => {
    api.users.list({ role:roleFilter||undefined, q:q||undefined, active:statusFilter||undefined })
      .then(({users})=>setUsers(users)).catch(e=>setErr(e.message));
  };
  useEffect(()=>{ load(); },[roleFilter,q,statusFilter]);

  const save = async (data) => {
    setBusy(true); setErr(null);
    try {
      if (mode==='add') await api.users.create(data);
      else await api.users.update(mode._id||mode.id, data);
      setOk(mode==='add'?'User created successfully.':'User updated.'); setMode(null); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doToggleActive = async (u) => {
    const fn = u.active ? api.users.deactivate : api.users.reactivate;
    await fn(u._id||u.id).catch(e=>setErr(e.message));
    setOk(`${u.name} ${u.active?'deactivated':'reactivated'}.`); load();
  };

  const doDelete = async () => {
    setBusy(true);
    try { await api.users.remove(delConf._id||delConf.id); setOk('User deleted.'); setDel(null); load(); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doReset = async () => {
    if (!newPw||newPw.length<6) { setErr('Password must be at least 6 characters'); return; }
    setBusy(true); setErr(null);
    try {
      await api.password.adminReset(resetConf._id||resetConf.id, newPw);
      setOk(`Password reset for ${resetConf.name}.`); setResetConf(null); setNewPw('');
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doGenTemp = async (u) => {
    setBusy(true); setErr(null);
    try {
      const r = await api.password.generateTemp(u._id||u.id);
      setTempPwd(r);
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="User Management" subtitle="Manage all system users — create, edit, deactivate, and reset passwords.">
        <Button icon={Plus} onClick={()=>{setMode('add');setErr(null);}}>Add user</Button>
      </PageHeader>

      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!mode&&!resetConf&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      <Card className="mb-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <Input icon={Search} placeholder="Search users..." value={q} onChange={e=>setQ(e.target.value)} className="sm:col-span-2"/>
          <Select value={roleFilter} onChange={e=>setRF(e.target.value)}
            options={[{value:'',label:'All roles'},...editableRoles.map(r=>({value:r,label:ROLE_LABELS[r]||r}))]}/>
          <Select value={statusFilter} onChange={e=>setSF(e.target.value)}
            options={[{value:'',label:'All status'},{value:'true',label:'Active only'},{value:'false',label:'Inactive only'}]}/>
        </div>
      </Card>

      <Card noPadding>
        {users.length===0?<EmptyState icon={Users} title="No users found" description="Adjust filters or add a new user."/>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Username</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Last Login</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {users.map(u=>(
                  <tr key={u._id||u.id} className={`hover:bg-paper ${!u.active?'opacity-60':''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink text-sm">{u.name}</div>
                      {u.title&&<div className="text-xs text-stone-400 italic truncate max-w-[200px]">{u.title}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">@{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIER_COLORS[u.role]||'bg-stone-100 text-stone-600'}`}>
                        {ROLE_LABELS[u.role]||u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{u.phone||u.email||'—'}</td>
                    <td className="px-4 py-3 text-center"><Pill tone={u.active?'emerald':'rust'}>{u.active?'Active':'Inactive'}</Pill></td>
                    <td className="px-4 py-3 text-center text-xs text-stone-400">{u.last_login?fmtDateTime(u.last_login):'Never'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={()=>{setMode(u);setErr(null);}} className="p-1.5 hover:bg-cream rounded-lg" title="Edit"><Pencil className="w-3.5 h-3.5 text-emerald"/></button>
                        <button onClick={()=>{setResetConf(u);setNewPw('');setErr(null);}} className="p-1.5 hover:bg-amber/10 rounded-lg" title="Reset password"><Lock className="w-3.5 h-3.5 text-amber"/></button>
                        <button onClick={()=>doGenTemp(u)} className="p-1.5 hover:bg-forest/10 rounded-lg" title="Generate temp password"><Key className="w-3.5 h-3.5 text-forest"/></button>
                        <button onClick={()=>doToggleActive(u)} className="p-1.5 hover:bg-stone-100 rounded-lg" title={u.active?'Deactivate':'Reactivate'}>
                          {u.active?<UserX className="w-3.5 h-3.5 text-rust"/>:<UserCheck className="w-3.5 h-3.5 text-emerald"/>}
                        </button>
                        {['super_admin','national_admin'].includes(user.role)&&(
                          <button onClick={()=>setDel(u)} className="p-1.5 hover:bg-rust/10 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5 text-rust"/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit modal */}
      <Modal open={!!mode} onClose={()=>setMode(null)} title={mode==='add'?'Add new user':`Edit: ${mode?.name}`} size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
        <UserForm initial={mode!=='add'?mode:null} regions={regions} districts={districts} editableRoles={editableRoles}
          onSubmit={save} onCancel={()=>setMode(null)} busy={busy} isEdit={mode!=='add'}/>
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!resetConf} onClose={()=>setResetConf(null)} title={`Reset: ${resetConf?.name}`} size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <div className="bg-amber/10 rounded-xl p-3 text-sm text-amber">You are about to reset the password for <strong>{resetConf?.name}</strong>.</div>
          <Input label="New password" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Min 6 characters" required/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setResetConf(null)} disabled={busy}>Cancel</Button>
            <Button onClick={doReset} disabled={busy||newPw.length<6} icon={Lock}>{busy?'Resetting...':'Reset password'}</Button>
          </div>
        </div>
      </Modal>

      {/* Temp password result */}
      <Modal open={!!tempPwdRes} onClose={()=>setTempPwd(null)} title="Temporary Password Generated" size="sm">
        {tempPwdRes&&(
          <div className="space-y-3">
            <p className="text-sm text-stone-600">Share this temporary password securely with the user:</p>
            <div className="bg-forest text-white font-mono text-xl font-bold p-4 rounded-xl text-center tracking-widest">{tempPwdRes.temp_password}</div>
            <p className="text-xs text-stone-400">Ask the user to change their password immediately after first login.</p>
            <Button className="w-full" onClick={()=>setTempPwd(null)}>Done</Button>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!delConf} onClose={()=>setDel(null)} title="Delete user">
        <p className="text-sm text-stone-600 mb-4">Permanently delete <strong>{delConf?.name}</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={()=>setDel(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={doDelete} disabled={busy}>{busy?'Deleting...':'Delete permanently'}</Button>
        </div>
      </Modal>
    </>
  );
}

function UserForm({initial,regions,districts,editableRoles,onSubmit,onCancel,busy,isEdit}){
  const [f,setF]=useState({
    name:initial?.name||'',username:initial?.username||'',password:'',
    role:initial?.role||editableRoles[0]||'data_entry',title:initial?.title||'',
    phone:initial?.phone||'',email:initial?.email||'',
    regionId:initial?.region_id||'',districtId:initial?.district_id||'',
    ratePerStudent:initial?.rate_per_student||2.00, active:initial?.active!==false,
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <form onSubmit={e=>{e.preventDefault();const d={...f};if(isEdit&&!d.password)delete d.password;onSubmit(d);}} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Full name" value={f.name} onChange={e=>s('name',e.target.value)} required className="col-span-2"/>
        <Input label="Username" value={f.username} onChange={e=>s('username',e.target.value)} required disabled={isEdit}/>
        <Input label={isEdit?'New password (blank=unchanged)':'Password'} type="password" value={f.password} onChange={e=>s('password',e.target.value)} required={!isEdit}/>
      </div>
      <Select label="Role" value={f.role} onChange={e=>s('role',e.target.value)} disabled={isEdit}
        options={editableRoles.map(r=>({value:r,label:ROLE_LABELS[r]||r}))}/>
      <Input label="Job title (optional)" value={f.title} onChange={e=>s('title',e.target.value)} placeholder="e.g. District Chief Executive"/>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone" value={f.phone} onChange={e=>s('phone',e.target.value)}/>
        <Input label="Email" value={f.email} onChange={e=>s('email',e.target.value)} type="email"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Region" value={f.regionId} onChange={e=>s('regionId',e.target.value)}
          options={[{value:'',label:'No region'},...regions.map(r=>({value:r._id||r.id,label:r.name}))]}/>
        <Select label="District" value={f.districtId} onChange={e=>s('districtId',e.target.value)}
          options={[{value:'',label:'No district'},...districts.filter(d=>!f.regionId||(d.region_id===f.regionId)).map(d=>({value:d._id||d.id,label:d.name}))]}/>
      </div>
      {f.role==='caterer'&&<Input label="Rate per pupil/day (GHS)" type="number" value={f.ratePerStudent} onChange={e=>s('ratePerStudent',e.target.value)} placeholder="2.00"/>}
      {isEdit&&<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.active} onChange={e=>s('active',e.target.checked)} className="w-4 h-4 accent-emerald"/><span className="text-sm">Account active</span></label>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy?'Saving...':isEdit?'Save changes':'Create user'}</Button>
      </div>
    </form>
  );
}
