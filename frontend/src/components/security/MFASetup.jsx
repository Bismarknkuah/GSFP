import { useEffect, useState } from 'react';
import { Shield, Mail, Phone, CheckCircle2, AlertCircle, Key, Lock, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { ROLE_LABELS } from '../../utils/format';

export default function MFASetup() {
  const { user } = useAuth();
  const [status,  setStatus]  = useState(null);
  const [method,  setMethod]  = useState('email');
  const [otp,     setOtp]     = useState('');
  const [step,    setStep]    = useState('status'); // status | setup | verify
  const [err,     setErr]     = useState(null);
  const [ok,      setOk]      = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [otpSent, setOtpSent] = useState(null);

  useEffect(()=>{ api.mfa.status().then(setStatus).catch(()=>{}); },[]);

  const setup = async () => {
    setBusy(true); setErr(null);
    try {
      await api.mfa.setup(method);
      const r = await api.mfa.sendOTP();
      setOtpSent(r);
      setStep('verify');
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!otp||otp.length!==6) { setErr('Enter the 6-digit code'); return; }
    setBusy(true); setErr(null);
    try {
      await api.mfa.verify(otp);
      setOk('MFA enabled successfully! Your account is now more secure.');
      const s = await api.mfa.status(); setStatus(s);
      setStep('status'); setOtp('');
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const disable = async () => {
    if (!confirm('Disable MFA? This will make your account less secure.')) return;
    setBusy(true);
    try { await api.mfa.disable(); const s=await api.mfa.status(); setStatus(s); setOk('MFA disabled.'); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setErr(null);
    try { const r=await api.mfa.sendOTP(); setOtpSent(r); setOk('New code sent.'); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Multi-Factor Authentication" subtitle="Add an extra layer of security to your account."/>
      <div className="max-w-lg space-y-5">
        {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
        {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

        {/* Status card */}
        <Card>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status?.enabled?'bg-emerald/10':'bg-stone-100'}`}>
              <Shield className={`w-6 h-6 ${status?.enabled?'text-emerald':'text-stone-400'}`}/>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-ink">MFA Status</div>
              <div className={`text-sm ${status?.enabled?'text-emerald':'text-stone-400'}`}>
                {status?.enabled ? `Enabled — ${status.method} verification` : 'Not enabled — your account uses password only'}
              </div>
              {user&&<div className="text-xs text-stone-400 mt-0.5">{user.name} · {ROLE_LABELS[user.role]||user.role}</div>}
            </div>
            {status?.enabled&&<div className="text-xs bg-emerald/10 text-emerald px-2 py-1 rounded-full font-semibold">ACTIVE</div>}
          </div>
        </Card>

        {/* Security benefits */}
        <Card>
          <h3 className="font-semibold text-ink mb-3">Why enable MFA?</h3>
          <div className="space-y-2">
            {[
              ['Prevents unauthorized access even if password is stolen','emerald'],
              ['Required for high-security roles (CEO, National Finance)','emerald'],
              ['Protects sensitive financial and caterer data','emerald'],
              ['Compliant with Ghana government security standards','emerald'],
            ].map(([t,c])=>(
              <div key={t} className="flex items-center gap-2 text-sm text-stone-600"><CheckCircle2 className={`w-4 h-4 text-${c} flex-shrink-0`}/>{t}</div>
            ))}
          </div>
        </Card>

        {step==='status'&&!status?.enabled&&(
          <Card>
            <h3 className="font-semibold text-ink mb-4">Enable MFA</h3>
            <Select label="Verification method" value={method} onChange={e=>setMethod(e.target.value)}
              options={[{value:'email',label:'Email OTP — code sent to your registered email'},{value:'sms',label:'SMS OTP — code sent to your phone number'},{value:'totp',label:'Authenticator App (Google / Microsoft)'}]}/>
            <div className="mt-3 p-3 bg-amber/10 rounded-xl text-sm text-amber">
              {method==='email'&&!user?.email&&'⚠ Add your email address in My Profile first.'}
              {method==='sms'&&!user?.phone&&'⚠ Add your phone number in My Profile first.'}
              {method==='email'&&user?.email&&`Code will be sent to: ${user.email}`}
              {method==='sms'&&user?.phone&&`Code will be sent to: ${user.phone}`}
              {method==='totp'&&'Use Google Authenticator or Microsoft Authenticator to scan the QR code.'}
            </div>
            <Button className="w-full mt-4" icon={Shield} onClick={setup} disabled={busy}>{busy?'Setting up...':'Enable MFA'}</Button>
          </Card>
        )}

        {step==='verify'&&(
          <Card>
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-forest"/>Enter Verification Code</h3>
            {otpSent&&<div className="bg-forest/10 rounded-xl p-3 text-sm text-stone-600 mb-4">
              Code sent to: <strong>{otpSent.destination}</strong> via <strong>{otpSent.method}</strong>. Valid for 10 minutes.
            </div>}
            <div className="mb-4">
              <label className="text-xs font-medium text-stone-600 block mb-1.5">6-digit verification code</label>
              <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000" maxLength={6}
                className="w-full px-4 py-4 text-center text-3xl font-bold font-mono tracking-[0.5em] border-2 border-stone-300 rounded-xl focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"/>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={verify} disabled={busy||otp.length!==6}>{busy?'Verifying...':'Verify & Enable MFA'}</Button>
              <Button variant="secondary" onClick={resend} icon={RefreshCw} disabled={busy}>Resend</Button>
            </div>
            <button onClick={()=>setStep('status')} className="w-full text-center text-xs text-stone-400 hover:text-stone-600 mt-3">Cancel</button>
          </Card>
        )}

        {status?.enabled&&(
          <Card>
            <h3 className="font-semibold text-ink mb-3">Manage MFA</h3>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={()=>{ setStep('setup'); setup(); }}>Change method</Button>
              <Button variant="danger" onClick={disable} disabled={busy}>Disable MFA</Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
