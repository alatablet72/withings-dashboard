'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

// 💡 Mock fallback (ukáže se jen když nejsi přihlášený nebo dočasně selže API)
const mockDates = ['15.08.2025 08:12','14.08.2025 08:09','13.08.2025 08:02','12.08.2025 07:58','11.08.2025 08:10','10.08.2025 08:07'];
const mockRows = [
  { label:'Váha', unit:'kg', values:['112.6','112.9','113.1','113.5','113.2','113.8'] },
  { label:'BMI (počítáno)', unit:'', values:['39.0','39.1','39.2','39.3','39.2','39.4'] },
  { label:'Tuk (%)', unit:'%', values:['33.4','33.6','33.8','34.0','33.9','34.1'] },
  { label:'Svaly (kg)', unit:'kg', values:['68.2','68.0','67.9','67.8','67.9','67.7'] },
  { label:'Voda (kg)', unit:'kg', values:['45.1','45.0','44.9','44.8','44.8','44.7'] },
];
const mockCards = [
  { label:'Váha', value:'112.6', unit:'kg' },
  { label:'Tuk (%)', value:'33.4', unit:'%' },
  { label:'Svaly (kg)', value:'68.2', unit:'kg' },
  { label:'PWV', value:'6.8', unit:'m/s' },
  { label:'Cévní věk', value:'49', unit:'roky' },
  { label:'Viscerální tuk', value:'13', unit:'' },
];

// Jednoduché komponenty
function KpiCard({ label, value, unit }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">
        {value} <span className="text-slate-400 text-sm">{unit}</span>
      </div>
    </div>
  );
}

function HistoryTable({ dates, rows }) {
  // vždy dej Váhu (type 1) na první místo
  const ordered = [...rows].sort((a, b) => (a.type === 1 ? -1 : b.type === 1 ? 1 : 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 border-b border-slate-800">Metrika</th>
            <th className="text-left p-3 border-b border-slate-800">Jedn.</th>
            {dates.map((d, i) => (
              <th key={i} className="text-right p-3 border-b border-slate-800 whitespace-nowrap">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-slate-900/40' : ''}>
              <td className="p-3 border-b border-slate-800">{r.label}</td>
              <td className="p-3 border-b border-slate-800 text-slate-400">{r.unit}</td>
              {r.values.map((v, j) => (
                <td key={j} className="p-3 border-b border-slate-800 text-right">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// CSV export helper
function buildCSV(dates, rows) {
  const header = ['Metrika','Jedn.',...dates];
  const lines = rows.map(r=>[r.label, r.unit, ...r.values]);
  return [header, ...lines].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
}

export default function Page() {
  const [dates, setDates] = useState(mockDates);
  const [rows, setRows] = useState(mockRows);
  const [cards, setCards] = useState(mockCards);
  const aRef = useRef(null);

  // A) Uložení tokenů z URL do localStorage (spustí se po návratu z OAuth)
  useEffect(()=>{
    const sp = new URLSearchParams(window.location.search);
    const at = sp.get('at');
    const rt = sp.get('rt');
    if (at && rt) {
      localStorage.setItem('withings_at', at);
      localStorage.setItem('withings_rt', rt);
      // vyčistit URL, ať tam tokeny nezůstávají
      window.history.replaceState({}, '', window.location.pathname);
    }
  },[]);

// B) Načtení dat s automatickým refreshem access tokenu
async function fetchDataWithRefresh() {
  let at = localStorage.getItem('withings_at');
  let rt = localStorage.getItem('withings_rt');
  if (!at) return; // zatím zůstane mock, dokud se nepřihlásíš

  // 1) pokus o načtení dat – VEM VŠECHNA měření (limit=0)
  let r = await fetch('/api/data?at=' + encodeURIComponent(at) + '&limit=0');
  let payload = await r.json().catch(()=>null);

  // 2) když to nevyjde, zkus refresh přes refresh_token
  if (!payload || payload.status !== 0) {
    if (!rt) return;
    const rr = await fetch('/api/withings/refresh', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ refresh_token: rt })
    });
    const refreshed = await rr.json().catch(()=>null);
    if (refreshed && refreshed.status === 0) {
      at = refreshed.access_token;
      rt = refreshed.refresh_token || rt; // někdy přijde nový RT
      localStorage.setItem('withings_at', at);
      localStorage.setItem('withings_rt', rt);
      // zkus znovu data – zase s limit=0 (všechna měření)
      const r2 = await fetch('/api/data?at=' + encodeURIComponent(at) + '&limit=0');
      payload = await r2.json().catch(()=>null);
    }
  }

  if (payload && payload.status === 0) {
    setDates(payload.dates);
    setRows(payload.rows);
    setCards(payload.cards);
  }
}

  // C) Spusť načtení po mountu (a kdykoli stránku znovu otevřeš)
  useEffect(()=>{ fetchDataWithRefresh(); },[]);

  // D) Export CSV (funguje i pro živá data)
  const onExport = ()=>{
    const csv = buildCSV(dates, rows);
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = aRef.current || document.createElement('a');
      a.href = url; a.download = 'withings-data.csv';
      if (!aRef.current) document.body.appendChild(a);
      a.click();
      if (!aRef.current) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      window.open(uri, '_blank');
    }
  };

  const isLive = useMemo(
    ()=> rows?.[0]?.values?.[0] !== mockRows[0].values[0],
    [rows]
  );

  return (
    <div>
      <a ref={aRef} style={{display:'none'}} aria-hidden="true" />
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/80 border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-sky-400/20 flex items-center justify-center">⚖️</div>
          <h1 className="text-lg font-semibold">Withings Body Scan – Alešův osobní dashboard</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400 px-2 py-1 rounded border border-slate-700">
              Zdroj: {isLive ? 'živá data' : 'mock'}
            </span>
            <a href="/api/withings/login" className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">
              Přihlásit Withings
            </a>
            <button onClick={onExport} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {cards.map((c,i)=>(
            <KpiCard key={i} label={c.label} value={c.value} unit={c.unit} />
          ))}
        </section>

        <section className="col-span-12 lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/60">
          
          <HistoryTable dates={dates} rows={rows} />
        </section>

        <section className="col-span-12 lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="font-semibold mb-2">Komentář k vývoji</div>
          <div className="text-sm text-slate-300 leading-relaxed bg-slate-900 border border-slate-800 rounded-xl p-3">
            Váha klesá ~0,5 kg týdně, tělesný tuk % mírně klesá a svalová hmota zůstává stabilní.
          </div>
          
        </section>
      </main>
    </div>
  );
}
