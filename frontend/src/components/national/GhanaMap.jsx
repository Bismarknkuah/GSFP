import { useState } from 'react';

// Simplified Ghana region shapes as SVG paths (proportional positions)
const REGIONS = [
  { id:'rgn-gar', name:'Greater Accra', code:'GAR', cx:220, cy:340, r:18 },
  { id:'rgn-ash', name:'Ashanti',       code:'ASH', cx:155, cy:270, r:24 },
  { id:'rgn-wes', name:'Western',       code:'WES', cx:80,  cy:310, r:20 },
  { id:'rgn-wnr', name:'Western North', code:'WNR', cx:90,  cy:230, r:20 },
  { id:'rgn-eas', name:'Eastern',       code:'EAS', cx:200, cy:280, r:20 },
  { id:'rgn-cen', name:'Central',       code:'CEN', cx:150, cy:330, r:18 },
  { id:'rgn-vol', name:'Volta',         code:'VOL', cx:275, cy:295, r:18 },
  { id:'rgn-oti', name:'Oti',           code:'OTI', cx:265, cy:235, r:17 },
  { id:'rgn-nor', name:'Northern',      code:'NOR', cx:175, cy:175, r:24 },
  { id:'rgn-sav', name:'Savannah',      code:'SAV', cx:110, cy:155, r:20 },
  { id:'rgn-ner', name:'North East',    code:'NER', cx:240, cy:155, r:18 },
  { id:'rgn-upe', name:'Upper East',    code:'UPE', cx:230, cy:100, r:18 },
  { id:'rgn-upw', name:'Upper West',    code:'UPW', cx:120, cy:95,  r:18 },
  { id:'rgn-bon', name:'Bono',          code:'BON', cx:135, cy:215, r:20 },
  { id:'rgn-boe', name:'Bono East',     code:'BOE', cx:185, cy:220, r:18 },
  { id:'rgn-ahf', name:'Ahafo',         code:'AHF', cx:118, cy:255, r:17 },
];

function getColor(value, max) {
  if (!value || !max) return '#e5e7eb';
  const pct = Math.min(value / max, 1);
  // Green gradient: light → dark forest
  const r = Math.round(229 - pct * 208);
  const g = Math.round(231 - pct * 158);
  const b = Math.round(235 - pct * 176);
  return `rgb(${r},${g},${b})`;
}

export default function GhanaMap({ data = [], metric = 'meals', onRegionClick }) {
  const [hovered, setHovered] = useState(null);

  const dataMap = {};
  data.forEach(d => { if (d.code) dataMap[d.code] = d; });
  const max = Math.max(...data.map(d => d[metric] || 0), 1);

  return (
    <div className="relative">
      <svg viewBox="0 0 360 420" className="w-full max-w-xs mx-auto" style={{ filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>
        {/* Background */}
        <rect width="360" height="420" fill="#f8f5ef" rx="12"/>

        {/* Region bubbles */}
        {REGIONS.map(reg => {
          const d = dataMap[reg.code] || {};
          const val = d[metric] || 0;
          const color = val > 0 ? getColor(val, max) : '#e5e7eb';
          const isHov = hovered === reg.id;
          const scale = isHov ? 1.15 : 1;
          return (
            <g key={reg.id}
              transform={`translate(${reg.cx},${reg.cy}) scale(${scale})`}
              style={{ transformOrigin:`${reg.cx}px ${reg.cy}px`, transition:'transform 0.2s', cursor:'pointer' }}
              onMouseEnter={() => setHovered(reg.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onRegionClick && onRegionClick(reg)}>
              <circle r={reg.r + 2} fill="white" opacity={0.6}/>
              <circle r={reg.r} fill={color} stroke={isHov ? '#15493B' : '#d1d5db'} strokeWidth={isHov ? 2 : 1}/>
              <text textAnchor="middle" dominantBaseline="central" fontSize={reg.r > 20 ? 8 : 7} fontWeight="600" fill={val>max*0.5?'white':'#374151'}>
                {reg.code}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {hovered && (() => {
          const reg = REGIONS.find(r => r.id === hovered);
          const d = dataMap[reg?.code] || {};
          return (
            <g>
              <rect x={reg.cx - 50} y={reg.cy - reg.r - 44} width={100} height={38} rx={6} fill="#1a1a2e" opacity={0.92}/>
              <text x={reg.cx} y={reg.cy - reg.r - 30} textAnchor="middle" fill="white" fontSize={9} fontWeight="700">{reg.name}</text>
              <text x={reg.cx} y={reg.cy - reg.r - 18} textAnchor="middle" fill="#C9882C" fontSize={8}>
                {metric==='meals' ? `${(d.meals||0).toLocaleString()} meals` : metric==='districts' ? `${d.districts||0} districts` : `${d[metric]||0}`}
              </text>
              <text x={reg.cx} y={reg.cy - reg.r - 9} textAnchor="middle" fill="#9ca3af" fontSize={7}>{d.schools||0} schools</text>
            </g>
          );
        })()}

        {/* Legend */}
        <g transform="translate(14,390)">
          <text fontSize={8} fill="#9ca3af" fontWeight="600">Performance:</text>
          {[0,0.25,0.5,0.75,1].map((p,i) => (
            <rect key={i} x={60 + i*22} y={-6} width={20} height={8} rx={2}
              fill={`rgb(${Math.round(229-p*208)},${Math.round(231-p*158)},${Math.round(235-p*176)})`}/>
          ))}
          <text x={60} y={10} fontSize={7} fill="#9ca3af">Low</text>
          <text x={160} y={10} fontSize={7} fill="#9ca3af" textAnchor="end">High</text>
        </g>
      </svg>
    </div>
  );
}
