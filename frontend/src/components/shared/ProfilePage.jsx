import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { CheckCircle2, AlertCircle, Camera, User, Mail, Phone, Briefcase, Edit3 } from 'lucide-react';
import { ROLE_LABELS } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name,   setName]   = useState(user?.name  || '');
  const [phone,  setPhone]  = useState(user?.phone || '');
  const [email,  setEmail]  = useState(user?.email || '');
  const [title,  setTitle]  = useState(user?.title || '');
  const [avatar, setAvatar] = useState(null);
  const [preview,setPreview]= useState(null);
  const [err,    setErr]    = useState(null);
  const [ok,     setOk]     = useState(null);
  const [busy,   setBusy]   = useState(false);
  const fileRef = useRef();

  const onAvatarSelect = (file) => {
    if (!file) return;
    setAvatar(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      const fd = new FormData();
      if (name  !== user.name)  fd.append('name',  name);
      if (phone !== (user.phone||'')) fd.append('phone', phone);
      if (email !== (user.email||'')) fd.append('email', email);
      if (title !== (user.title||'')) fd.append('title', title);
      if (avatar) fd.append('avatar', avatar);
      if ([...fd.keys()].length === 0) { setErr('No changes to save.'); setBusy(false); return; }
      const r = await fetch(`${BASE}/api/auth/profile`, { method:'PATCH', headers:{ Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` }, body:fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to update profile');
      setUser(data.user);
      setOk('Profile updated successfully!');
      setAvatar(null); setPreview(null);
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const avatarSrc = preview || (user?.profile_picture ? `${BASE}${user.profile_picture}` : null);
  const initials  = (user?.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  return (
    <>
      <PageHeader title="My Profile" subtitle="Update your personal information and profile picture."/>
      <div className="max-w-2xl space-y-5">

        {ok && <div className="p-3 bg-emerald/10 border border-emerald/20 rounded-xl text-sm text-emerald flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
        {err && <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

        {/* Avatar card */}
        <Card>
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-stone-100 shadow-md">
                {avatarSrc
                  ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-gradient-to-br from-forest to-[#0f3329] flex items-center justify-center">
                      <span className="text-3xl font-bold font-serif text-amber">{initials}</span>
                    </div>
                }
              </div>
              <button onClick={()=>fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-forest text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#0f3329] transition-all">
                <Camera className="w-4 h-4"/>
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e=>onAvatarSelect(e.target.files[0])}/>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-ink">{user?.name}</h3>
              <div className="inline-flex items-center gap-1.5 mt-1 bg-forest/10 text-forest text-xs font-semibold px-2.5 py-1 rounded-full">
                <Briefcase className="w-3 h-3"/>{ROLE_LABELS[user?.role] || user?.role}
              </div>
              {user?.title && <p className="text-xs text-stone-400 mt-1 italic">{user.title}</p>}
              <p className="text-xs text-stone-400 mt-1">@{user?.username}</p>
            </div>
          </div>
          {avatar && (
            <div className="mt-4 flex items-center gap-3 bg-amber/10 rounded-xl p-3 text-sm text-amber">
              <Camera className="w-4 h-4"/><span>New photo selected: {avatar.name}</span>
              <button onClick={()=>{setAvatar(null);setPreview(null);}} className="ml-auto text-xs underline">Remove</button>
            </div>
          )}
        </Card>

        {/* Profile form */}
        <Card>
          <h3 className="font-semibold text-ink mb-5 flex items-center gap-2"><Edit3 className="w-4 h-4 text-forest"/>Edit Information</h3>
          <form onSubmit={save} className="space-y-4">
            <Input label="Full name" value={name} onChange={e=>setName(e.target.value)} icon={User} required placeholder="Your full name"/>
            <Input label="Job title" value={title} onChange={e=>setTitle(e.target.value)} icon={Briefcase} placeholder="e.g. District Feeding Coordinator"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Phone number" value={phone} onChange={e=>setPhone(e.target.value)} icon={Phone} placeholder="+233 24 000 0000"/>
              <Input label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} icon={Mail} placeholder="you@example.com"/>
            </div>

            {/* Read-only info */}
            <div className="border border-stone-100 rounded-xl p-4 bg-stone-50 space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Account Information (read-only)</p>
              {[['Username',`@${user?.username}`],['Role',ROLE_LABELS[user?.role]||user?.role],['Region',user?.region_id||'National'],['District',user?.district_id||'—'],['Last login',user?.last_login?new Date(user.last_login).toLocaleString('en-GH'):'—']].map(([l,v])=>(
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-stone-400">{l}</span>
                  <span className="font-medium text-ink">{v}</span>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={busy} className="w-full" icon={CheckCircle2}>
              {busy ? 'Saving changes...' : 'Save profile'}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
