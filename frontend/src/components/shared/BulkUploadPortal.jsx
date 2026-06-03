import { useState, useRef } from 'react';
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { cedis, fmtNum } from '../../utils/format';

export default function BulkUploadPortal() {
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);
  const inputRef = useRef();

  const onFile = (f) => {
    if (!f) return;
    setFile(f); setResult(null); setErr(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(Boolean).slice(0, 6);
      setPreview(lines);
    };
    reader.readAsText(f);
  };

  const upload = async () => {
    if (!file) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await api.bulk.uploadPayments(file);
      setResult(r); setFile(null); setPreview(null);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => { window.open(api.bulk.downloadTemplate(), '_blank'); };

  return (
    <>
      <PageHeader title="Bulk Payment Upload" subtitle="Upload bank payment data (CSV) to auto-populate caterer payment records across all schools."/>

      {/* Instructions */}
      <Card className="mb-5 border-2 border-amber/30 bg-amber/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5"/>
          <div>
            <h4 className="font-semibold text-ink mb-2">How Bulk Upload Works</h4>
            <ul className="text-sm text-stone-600 space-y-1">
              <li><span className="font-medium text-ink">1.</span> Download the CSV template below and fill in payment data from your bank statement</li>
              <li><span className="font-medium text-ink">2.</span> Required columns: <code className="bg-stone-100 px-1 rounded text-xs">school_code, period, days_covered, days_paid, payment_date</code></li>
              <li><span className="font-medium text-ink">3.</span> The system will auto-calculate amounts at <strong>GHS 2.00 per pupil per day</strong></li>
              <li><span className="font-medium text-ink">4.</span> Existing records for the same caterer and period will be updated; new ones created</li>
              <li><span className="font-medium text-ink">5.</span> Arrears are automatically calculated: Days Covered − Days Paid</li>
            </ul>
            <Button icon={Download} variant="secondary" size="sm" className="mt-3" onClick={downloadTemplate}>Download CSV Template</Button>
          </div>
        </div>
      </Card>

      {/* Upload zone */}
      <Card className="mb-5">
        <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-forest"/>Upload Bank Payment Data</h3>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file?'border-forest bg-forest/5':'border-stone-300 hover:border-forest/50 hover:bg-stone-50'}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e=>{e.preventDefault();}}
          onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files[0]);}}
        >
          <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={e=>onFile(e.target.files[0])}/>
          {file ? (
            <div>
              <FileText className="w-10 h-10 mx-auto text-forest mb-2"/>
              <p className="font-semibold text-ink">{file.name}</p>
              <p className="text-sm text-stone-500 mt-1">{(file.size/1024).toFixed(1)} KB — ready to upload</p>
              <button onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);}} className="mt-2 text-xs text-rust hover:underline flex items-center gap-1 mx-auto">
                <X className="w-3 h-3"/>Remove
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-10 h-10 mx-auto text-stone-300 mb-2"/>
              <p className="font-medium text-stone-600">Click to select or drag and drop CSV file</p>
              <p className="text-xs text-stone-400 mt-1">Accepts .csv or .txt — max 10 MB</p>
            </div>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500 mb-2 flex items-center gap-1"><Table className="w-3 h-3"/>File Preview (first 5 rows)</p>
            <div className="bg-stone-900 rounded-xl p-3 overflow-x-auto">
              {preview.map((line, i) => (
                <div key={i} className={`text-xs font-mono ${i===0?'text-amber font-semibold':'text-green-300'} py-0.5 whitespace-nowrap`}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {err && <div className="mt-3 text-sm text-rust bg-rust/10 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

        {file && (
          <div className="mt-4 flex gap-3">
            <Button onClick={upload} disabled={loading} className="flex-1" icon={Upload}>
              {loading ? 'Processing...' : `Upload & Process ${file.name}`}
            </Button>
            <Button variant="ghost" onClick={()=>{setFile(null);setPreview(null);}} disabled={loading}>Cancel</Button>
          </div>
        )}
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <Card className="border-2 border-emerald/30 bg-emerald/5">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald"/>Upload Complete</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Total Rows',   result.summary.total,   'stone'],
                ['Created',      result.summary.created,  'emerald'],
                ['Updated',      result.summary.updated,  'forest'],
                ['Skipped',      result.summary.skipped,  'amber'],
                ['Errors',       result.summary.errors,   result.summary.errors>0?'rust':'stone'],
              ].map(([l,v,t])=>(
                <div key={l} className={`text-center bg-${t}/10 rounded-xl py-3`}>
                  <div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </Card>

          {result.results.created?.length > 0 && (
            <Card>
              <h4 className="font-semibold text-emerald mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>Created ({result.results.created.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-stone-500 uppercase tracking-wider bg-stone-50">
                    <tr><th className="text-left px-3 py-2">School Code</th><th className="text-left px-3 py-2">Caterer</th><th className="text-right px-3 py-2">Days Paid</th><th className="text-right px-3 py-2">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {result.results.created.map((r,i)=>(
                      <tr key={i}><td className="px-3 py-2 font-mono">{r.schoolCode}</td><td className="px-3 py-2">{r.caterer}</td><td className="px-3 py-2 text-right font-mono">{r.daysPaid}</td><td className="px-3 py-2 text-right font-mono font-semibold text-emerald">{cedis(r.amount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {result.results.errors?.length > 0 && (
            <Card className="border-rust/20">
              <h4 className="font-semibold text-rust mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>Errors ({result.results.errors.length})</h4>
              <div className="space-y-1">
                {result.results.errors.map((e,i)=>(
                  <div key={i} className="text-xs bg-rust/5 rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 text-rust flex-shrink-0 mt-0.5"/>
                    <span>{e.schoolCode||'Row'}: {e.reason}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
