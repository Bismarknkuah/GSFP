import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const BRAND_COLOR = [21, 73, 59]; // forest green
const GOLD_COLOR  = [201, 136, 44];

// ── PDF helpers ───────────────────────────────────────────────────────────────
function addHeader(doc, title, subtitle='') {
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.width, 22, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(13); doc.setFont('helvetica','bold');
  doc.text('GHANA SCHOOL FEEDING PROGRAMME', 14, 10);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('Republic of Ghana · Ministry of Local Government', 14, 16);
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text(title, 14, 34);
  if (subtitle) { doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100); doc.text(subtitle, 14, 41); }
  doc.setTextColor(0,0,0);
  return subtitle ? 48 : 42;
}

function addFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text(`Generated: ${new Date().toLocaleString('en-GH')}   |   GSFP National Management System   |   Page ${i} of ${pages}`,
      doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align:'center' });
  }
}

export function exportPDF({ title, subtitle='', columns, rows, filename='GSFP_Export.pdf', orientation='portrait', summaryRows=[] }) {
  const doc = new jsPDF({ orientation, unit:'mm', format:'a4' });
  const startY = addHeader(doc, title, subtitle);
  if (summaryRows.length) {
    let y = startY + 2;
    summaryRows.forEach(row => {
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(100,100,100);
      doc.text(row.label + ':', 14, y);
      doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0);
      doc.text(String(row.value), 60, y);
      y += 6;
    });
    autoTable(doc, { startY: y + 2, headStyles:{ fillColor:BRAND_COLOR, textColor:255, fontStyle:'bold' }, alternateRowStyles:{ fillColor:[248,245,239] }, head:[columns], body:rows, styles:{ fontSize:8, cellPadding:2 }, margin:{ left:14, right:14 } });
  } else {
    autoTable(doc, { startY, headStyles:{ fillColor:BRAND_COLOR, textColor:255, fontStyle:'bold' }, alternateRowStyles:{ fillColor:[248,245,239] }, head:[columns], body:rows, styles:{ fontSize:8, cellPadding:2 }, margin:{ left:14, right:14 } });
  }
  addFooter(doc);
  doc.save(filename);
}

// ── Excel helpers ─────────────────────────────────────────────────────────────
export function exportExcel({ sheets, filename='GSFP_Export.xlsx' }) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, columns, rows, summaryRows=[] }) => {
    const data = [];
    if (summaryRows.length) {
      data.push(['GHANA SCHOOL FEEDING PROGRAMME']);
      data.push([name]);
      data.push([`Generated: ${new Date().toLocaleString('en-GH')}`]);
      data.push([]);
      summaryRows.forEach(r => data.push([r.label, r.value]));
      data.push([]);
    }
    data.push(columns);
    rows.forEach(r => data.push(r));
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = columns.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

// ── Combo export ──────────────────────────────────────────────────────────────
export function exportBoth(opts) {
  exportPDF(opts);
  exportExcel({ sheets:[{ name:opts.title, columns:opts.columns, rows:opts.rows, summaryRows:opts.summaryRows }], filename:opts.filename?.replace('.pdf','.xlsx')||'GSFP_Export.xlsx' });
}
