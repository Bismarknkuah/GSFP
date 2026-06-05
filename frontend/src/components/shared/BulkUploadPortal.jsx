import { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Clock, BarChart3, Users, School, FileText, CreditCard, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import { fmtNum, fmtDate, fmtDateTime, ROLE_LABELS } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

const UPLOAD_TYPES = [
  {
    id: 'payments', label: 'Payment Records', icon: CreditCard, color: 'emerald',
    desc: 'Upload historical payment data — periods, days covered, amounts paid, arrears.',
    columns: ['school_code','caterer_username','period','days_covered','days_paid','amount_paid','payment_date','reference'],
    example: [['AKT-001','caterer1','2024/2025 - Term 1','60','45','54000','2025-04-15','GCB-TXN-001'],['AKT-002','caterer2','2024/2025 - Term 1','60','60','41040','2025-04-15','GCB-TXN-002']],
    endpoint: '/api/bulk/payments',
  },
  {
    id: 'reports', label: 'Feeding Reports', icon: FileText, color: 'forest',
    desc: 'Upload historical daily feeding reports — dates, food types, pupils fed.',
    columns: ['school_code','caterer_username','date','food_type','students_fed','time_ready','time_served','status'],
    example: [['AKT-001','caterer1','2025-01-06','Jollof Rice with Chicken','400','11:00','12:30','approved'],['AKT-002','caterer2','2025-01-06','Banku with Okro Stew','275','10:45','12:00','approved']],
    endpoint: '/api/bulk/reports',
  },
  {
    id: 'schools', label: 'Schools Data', icon: School, color: 'navy',
    desc: 'Upload school records — names, towns, enrollment figures, district codes.',
    columns: ['code','name','town','district_code','enrolled','headmaster_name','caterer_name'],
    example: [['AKT-009','New D/A Primary','Akontombra','WNR-AKT','287','Mr. Kwame Asante','Madam Akua Mensah'],['AKT-010','Community JHS','Asempaneye','WNR-AKT','445','Mrs. Grace Owusu','Madam Yaa Amoah']],
    endpoint: '/api/bulk/schools',
  },
  {
    id: 'users', label: 'Users / Staff', icon: Users, color: 'amber',
    desc: 'Upload staff accounts — caterers, headmasters, coordinators.',
    columns: ['username','name','role','district_code','school_code','email','phone'],
    example: [['head9','Mr. Kofi Mensah','headmaster','WNR-AKT','AKT-009','','0244000001'],['caterer9','Madam Abena Asare','caterer','WNR-AKT','AKT-009','','0244000002']],
    endpoint: '/api/bulk/users',
  },
];

function CsvPreviewTable({ headers, rows, maxRows=5 }) {
  const visible = rows.slice(0, maxRows);
  return (
    <div className="overflow-x-auto border border-stone-200 rounded-xl">
      <table className="w-full text-xs">
        <thead className="bg-stone-100">
          <tr>{headers.map(h=><th key={h} className="text-left px-3 py-2 font-semibold text-stone-600 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {visible.map((row,i)=><tr key={i} className="hover:bg-stone-50">{row.map((cell,j)=><td key={j} className="px-3 py-2 text-stone-700 whitespace-nowrap max-w-[140px] truncate">{cell}</td>)}</tr>)}
        </tbody>
      </table>
      {rows.length>maxRows&&<div className="px-3 py-2 text-xs text-stone-400 bg-stone-50">+{rows.length-maxRows} more rows not shown</div>}
    </div>
  );
}

function UploadPanel({ type, onResult }) {
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [busy,     setBusy]     = useState(false);
  const [result,   setResult]   = useState(null);
  const [err,      setErr]      = useState(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').map(l=>l.split(',').map(c=>c.trim().replace(/^"|"$/g,'')));
    return { headers:lines[0], rows:lines.slice(1).filter(r=>r.some(c=>c)) };
  };

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f); setResult(null); setErr(null); setPreview(null);
    const reader = new FileReader();
    reader.onload = ev => {
      try { setPreview(parseCSV(ev.target.result)); }
      catch { setErr('Could not parse file — make sure it is a valid CSV'); }
    };
    reader.readAsText(f);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true); setErr(null); setProgress(0);
    const fd = new FormData(); fd.append('file', file);
    try {
      const prog = setInterval(()=>setProgress(p=>Math.min(p+10,85)),200);
      const res  = await fetch(BASE+type.endpoint, {
        method:'POST', headers:{ Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` }, body:fd,
      });
      clearInterval(prog); setProgress(100);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Upload failed');
      setResult(data); onResult?.({ type:type.id, ...data });
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const csv = [type.columns.join(','), ...type.example.map(r=>r.join(','))].join('\n');
    const a   = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download=`gsfp_${type.id}_template.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      {/* Download template */}
      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
        <div><div className="text-sm font-medium text-ink">CSV Template</div><div className="text-xs text-stone-400">Download and fill in your data, then upload</div></div>
        <Button icon={Download} variant="secondary" size="sm" onClick={downloadTemplate}>Template</Button>
      </div>

      {/* Upload zone */}
      <div
        onClick={()=>inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file?'border-forest/40 bg-forest/5':'border-stone-200 hover:border-forest/30 hover:bg-stone-50'}`}>
        <Upload className="w-8 h-8 text-stone-300 mx-auto mb-2"/>
        {file
          ? <div><div className="font-medium text-ink">{file.name}</div><div className="text-xs text-stone-400 mt-0.5">{(file.size/1024).toFixed(1)} KB · Click to change</div></div>
          : <div><div className="text-sm font-medium text-stone-500">Click to upload CSV file</div><div className="text-xs text-stone-400 mt-1">Comma-separated values (.csv)</div></div>}
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFileChange} className="hidden"/>
      </div>

      {/* Preview */}
      {preview&&(
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink">Preview ({fmtNum(preview.rows.length)} rows)</span>
            <button onClick={()=>{ setFile(null); setPreview(null); setResult(null); if(inputRef.current) inputRef.current.value=''; }} className="text-xs text-stone-400 hover:text-rust flex items-center gap-1"><Trash2 className="w-3 h-3"/>Clear</button>
          </div>
          <CsvPreviewTable headers={preview.headers} rows={preview.rows}/>
        </div>
      )}

      {/* Error */}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      {/* Progress */}
      {busy&&(
        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1"><span>Uploading...</span><span>{progress}%</span></div>
          <div className="h-2 bg-stone-100 rounded-full"><div className="h-full bg-forest rounded-full transition-all" style={{width:`${progress}%`}}/></div>
        </div>
      )}

      {/* Result */}
      {result&&(
        <div className="p-4 bg-emerald/10 border border-emerald/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald"/><span className="font-semibold text-emerald">Upload successful!</span></div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[['Processed',result.processed||result.total||0],['Inserted',result.inserted||result.created||0],['Errors',result.errors||0]].map(([l,v])=>(
              <div key={l} className="bg-white rounded-lg p-2 text-center"><div className="font-bold text-lg text-ink">{fmtNum(v)}</div><div className="text-stone-400">{l}</div></div>
            ))}
          </div>
          {result.error_details?.length>0&&(
            <div className="mt-2 text-xs text-rust"><strong>Errors:</strong> {result.error_details.slice(0,3).join(', ')}{result.error_details.length>3?` +${result.error_details.length-3} more`:''}</div>
          )}
        </div>
      )}

      {/* Upload button */}
      {file&&!result&&(
        <Button onClick={upload} disabled={busy} icon={Upload} className="w-full" size="lg">
          {busy?'Uploading...':'Upload & Import Data'}
        </Button>
      )}
    </div>
  );
}

export default function BulkUploadPortal() {
  const { user } = useAuth();
  const [activeType, setActiveType] = useState('payments');
  const [uploadLog,  setUploadLog]  = useState([]);
  const [detModal,   setDetModal]   = useState(null);

  const canAccess = ['super_admin','national_admin','national_director','national_finance','ceo','national_monitoring','regional_coordinator','district_director','district_coordinator','coordinator'].includes(user.role);

  const onResult = useCallback((r)=>{
    setUploadLog(l=>[{ ...r, by:user.name, at:new Date().toISOString() }, ...l.slice(0,19)]);
  },[user.name]);

  const type = UPLOAD_TYPES.find(t=>t.id===activeType);

  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Upload className="w-12 h-12 text-stone-300"/>
      <p className="font-semibold text-stone-500">Access Restricted</p>
      <p className="text-sm text-stone-400">National or District Director access required for bulk uploads.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#1a1200 0%,#2d1e00 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><FileSpreadsheet className="w-4 h-4 text-amber/70"/><span className="text-[10px] font-bold tracking-widest text-amber/60 uppercase">Data Management</span></div>
          <h1 className="font-serif text-2xl font-bold text-white">Bulk Data Upload</h1>
          <p className="text-white/50 text-sm mt-1">Import historical data from CSV files — payments, reports, schools, users</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left — type selector */}
        <div className="space-y-3">
          <h3 className="font-semibold text-ink text-sm">Select Data Type</h3>
          {UPLOAD_TYPES.map(t=>{
            const Icon = t.icon;
            const active = activeType===t.id;
            return (
              <button key={t.id} onClick={()=>setActiveType(t.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${active?`border-${t.color}/50 bg-${t.color}/5`:'border-stone-200 hover:border-stone-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${t.color}/10`}><Icon className={`w-4 h-4 text-${t.color}`}/></div>
                  <div>
                    <div className="font-semibold text-ink text-sm">{t.label}</div>
                    <div className="text-xs text-stone-400 mt-0.5 leading-relaxed">{t.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Column reference */}
          {type&&(
            <Card>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Required Columns</h4>
              <div className="space-y-1">
                {type.columns.map(col=>(
                  <div key={col} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-forest flex-shrink-0"/>
                    <code className="text-xs text-stone-600">{col}</code>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right — upload panel */}
        <div className="lg:col-span-2 space-y-5">
          {type&&(
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${type.color}/10`}>
                  <type.icon className={`w-5 h-5 text-${type.color}`}/>
                </div>
                <div>
                  <h3 className="font-semibold text-ink">{type.label}</h3>
                  <p className="text-xs text-stone-400">{type.desc}</p>
                </div>
              </div>
              <UploadPanel type={type} onResult={onResult}/>
            </Card>
          )}

          {/* Upload history */}
          {uploadLog.length>0&&(
            <Card noPadding>
              <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-semibold text-ink text-sm">Upload History</h3>
                <Pill tone="stone">{uploadLog.length} upload{uploadLog.length!==1?'s':''}</Pill>
              </div>
              <div className="divide-y divide-stone-50">
                {uploadLog.map((l,i)=>(
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-paper cursor-pointer" onClick={()=>setDetModal(l)}>
                    <div>
                      <div className="text-sm font-medium text-ink capitalize">{l.type} upload</div>
                      <div className="text-xs text-stone-400">{l.by} · {fmtDateTime(l.at)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-stone-500">{fmtNum(l.inserted||l.created||0)} imported · {fmtNum(l.errors||0)} errors</div>
                      <Pill tone={(l.errors||0)===0?'emerald':'amber'}>{(l.errors||0)===0?'Success':'Partial'}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <Modal open={!!detModal} onClose={()=>setDetModal(null)} title="Upload Details" size="sm">
        {detModal&&(
          <div className="space-y-3 text-sm">
            {[['Type',detModal.type],['Uploaded by',detModal.by],['Time',fmtDateTime(detModal.at)],['Processed',fmtNum(detModal.processed||0)],['Inserted',fmtNum(detModal.inserted||detModal.created||0)],['Errors',fmtNum(detModal.errors||0)]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-2 border-b border-stone-50 last:border-0">
                <span className="text-stone-500">{l}</span><span className="font-semibold text-ink">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
