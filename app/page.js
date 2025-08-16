'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

// Mock fallback (pouze když nejsi přihlášen)
const mockDates = ['15.08.2025 08:12','14.08.2025 08:09','13.08.2025 08:02','12.08.2025 07:58','11.08.2025 08:10','10.08.2025 08:07'];
const mockRows = [
  { type: 1, label:'Váha', unit:'kg', values:['112.6','112.9','113.1','113.5','113.2','113.8'] },
  { type: 6, label:'Tuk (%)', unit:'%', values:['33.4','33.6','33.8','34.0','33.9','34.1'] },
  { type: 8, label:'Svaly (kg)', unit:'kg', values:['68.2','68.0','67.9','67.8','67.9','67.7'] },
  { type: 9, label:'Voda (kg)', unit:'kg', values:['45.1','45.0','44.9','44.8','44.8','44.7'] },
];
const mockCards = [
  { label:'Váha', value:'112.6', unit:'kg' },
  { label:'Tuk (%)', value:'33.4', unit:'%' },
  { label:'Svaly (kg)', value:'68.2', unit:'kg' },
  { label:'PWV', value:'6.8', unit:'m/s' },
  { label:'Cévní věk', value:'49', unit:'roky' },
  { label:'Viscerální tuk', value:'13', unit:'' },
];

// Milník – začátek Mounjaro
const baseline = {
  ts: Math.floor(Date.UTC(2025, 0, 18) / 1000), // 18.1.2025 00:00:00 UTC
  weightKg: 126.3,
  bmi: 43.7,
};

// UI komponenty
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

// Pomocné převody: 'YYYY-MM-DD' → UNIX sec (Od = 00:00:00, Do = 23:59:59 lokální čas)
function dateStrToStartTs(d) { if (!d) return null; const dt = new Date(`${d}T00:00:00`); return Math.floor(dt.getTime()/1000); }
function dateStrToEndTs(d)   { if (!d) return null; const dt = new Date(`${d}T23:59:59`); return Math.floor(dt.getTime()/1000); }

// Analýza trendu a komentář
function analyzeProgress(timestamps, rows) {
  if (!timestamps?.length || !rows?.length) return 'Zatím nemám dostatek dat pro komentář.';
  const weightRow = rows.find(r => r.type === 1);
  const fatRow    = rows.find(r => r.type === 6);
  const muscleRow = rows.find(r => r.type === 8);

  // nejnovější vlevo => index 0
  const nowTs = timestamps[0];
  const thenTs = timestamps[timestamps.length - 1];

  const parseFloatSafe = v => (v === '' || v == null ? NaN : parseFloat(String(v).replace(',', '.')));

  const wNow = weightRow ? parseFloatSafe(weightRow.values[0]) : NaN;
  const wThen = weightRow ? parseFloatSafe(weightRow.values[weightRow.values.length - 1]) : NaN;

  const days = Math.max(1, (nowTs - thenTs) / 86400);
  const kgPerWeek = isFinite(wNow - wThen) ? ((wNow - wThen) / days) * 7 * -1 : NaN; // záporný = hubnutí

  // proti baseline (Mounjaro)
  const sinceBaselineKg = isFinite(wNow) ? (baseline.weightKg - wNow) : NaN;
  const weeksSinceBaseline = (nowTs - baseline.ts) / (86400 * 7);

  const fatNow = fatRow ? parseFloatSafe(fatRow.values[0]) : NaN;
  const fatThen = fatRow ? parseFloatSafe(fatRow.values[fatRow.values.length - 1]) : NaN;
  const fatTrend = isFinite(fatNow - fatThen) ? (fatNow - fatThen) : NaN;

  const musNow = muscleRow ? parseFloatSafe(muscleRow.values[0]) : NaN;
  const musThen = muscleRow ? parseFloatSafe(muscleRow.values[muscleRow.values.length - 1]) : NaN;
  const musTrend = isFinite(musNow - musThen) ? (musNow - musThen) : NaN;

  const bits = [];

  if (isFinite(kgPerWeek)) {
    const dir = kgPerWeek > 0 ? 'klesá' : 'stoupá';
    bits.push(`Váha ${dir} tempem ~${Math.abs(kgPerWeek).toFixed(2)} kg/týden.`);
  }

  if (isFinite(sinceBaselineKg) && isFinite(weeksSinceBaseline) && weeksSinceBaseline > 0) {
    bits.push(`Od startu Mounjaro (18. 1. 2025) je změna −${sinceBaselineKg.toFixed(1)} kg (≈ ${(sinceBaselineKg/weeksSinceBaseline).toFixed(2)} kg/týden).`);
  }

  if (isFinite(fatTrend)) {
    bits.push(`Tělesný tuk % za zvolené období ${fatTrend <= 0 ? 'klesl' : 'stoupl'} o ${Math.abs(fatTrend).toFixed(1)} p.b.`);
  }

  if (isFinite(musTrend)) {
    bits.push(`Svalová hmota (kg) za zvolené období ${musTrend >= 0 ? 'vzrostla' : 'klesla'} o ${Math.abs(musTrend).toFixed(2)} kg.`);
  }

  // Doporučení (jednoduchá pravidla)
  const rec = [];
  if (isFinite(kgPerWeek) && kgPerWeek < -1.0) rec.push('Úbytek je rychlý; zvaž vyšší příjem bílkovin a kontrolu kalorického deficitu.');
  if (isFinite(kgPerWeek) && kgPerWeek > 0.0)  rec.push('Váha nestagnuje? Zvaž menší kalorický deficit nebo více pohybu.');
  if (isFinite(fatTrend) && fatTrend > 0.5)    rec.push('Roste % tělesného tuku – zkontroluj příjem cukrů a časování jídel.');
  if (isFinite(musTrend) && musTrend < -0.5)   rec.push('Klesá svalová hmota – přidej silový trénink a bílkoviny (1.6–2.2 g/kg).');

  if (rec.length) bits.push('Co zlepšit: ' + rec.join(' '));

  return bits.join(' ');
}

export default function Page() {
  const [dates, setDates] = useState(mockDates);
  const [rows, setRows] = useState(mockRows);
  const [cards, setCards] = useState(mockCards);
  const [timestamps, setTimestamps] = useState([]); // ← nové
  const [comment, setComment] = useState('');       // ← nové

  const [fromStr, setFromStr] = useState(''); // 'YYYY-MM-DD'
  const [toStr, setToStr] = useState('');     // 'YYYY-MM-DD'
  const aRef = useRef(null);

  // Uložení tokenů z URL do localStorage
  useEffect(()=>{
    const sp = new URLSearchParams(window.location.search);
    const at = sp.get('at');
    const rt = sp.get('rt');
    if (at && rt) {
      localStorage.setItem('withings_at', at);
      localStorage.setItem('withings_rt', rt);
      window.history.replaceState({}, '', window.location.pathname);
    }
  },[]);

  // Načtení dat s automatickým refreshem access tokenu
  async function fetchDataWithRefresh(opts = {}) {
    let at = localStorage.getItem('withings_at');
    let rt = localStorage.getItem('withings_rt');
    if (!at) return;

    const params = new URLSearchParams({ at, limit: '0' });
    const f = opts.from ?? (fromStr ? dateStrToStartTs(fromStr) : null);
    const t = opts.to   ?? (toStr   ? dateStrToEndTs(toStr)   : null);
    if (f) params.set('from', String(f));
    if (t) params.set('to',   String(t));

    let r = await fetch('/api/data?' + params.toString());
    let payload = await r.json().catch(()=>null);

    if (!payload || payload.status !== 0) {
      if (!rt) return;
      const rr = await fetch('/api/withings/refresh', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ refresh_token: rt })
      });
      const refreshed = await rr.json().catch(()=>null);
      if (refreshed && refreshed.status === 0) {
        at = refreshed.access_token;
        rt = refreshed.refresh_token || rt;
        localStorage.setItem('withings_at', at);
        localStorage.setItem('withings_rt', rt);
        const params2 = new URLSearchParams({ at, limit: '0' });
        if (f) params2.set('from', String(f));
        if (t) params2.set('to',   String(t));
        const r2 = await fetch('/api/data?' + params2.toString());
        payload = await r2.json().catch(()=>null);
      }
    }

    if (payload && payload.status === 0) {
      setDates(payload.dates);
      setRows(payload.rows);
      setCards(payload.cards);
      setTimestamps(payload.timestamps || []);
      setComment(analyzeProgress(payload.timestamps || [], payload.rows || []));
    }
  }

  // Načti data při otevření
  useEffect(()=>{ fetchDataWithRefresh(); },[]);

  // Export CSV
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

  const isLive = useMemo(()=> rows?.[0]?.values?.[0] !== mockRows[0].values[0], [rows]);

  // Rychlé volby – přepočítají from/to a zavolají fetch
  const quick = {
    last7: () => {
      const to = Math.floor(Date.now()/1000);
      const from = to - 7*86400;
      setFromStr('');
      setToStr('');
      fetchDataWithRefresh({ from, to });
    },
    last30: () => {
      const to = Math.floor(Date.now()/1000);
      const from = to - 30*86400;
      setFromStr('');
      setToStr('');
      fetchDataWithRefresh({ from, to });
    },
    thisMonth: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()/1000|0;
      const end = Math.floor(Date.now()/1000);
      setFromStr('');
      setToStr('');
      fetchDataWithRefresh({ from: start, to: end });
    },
    all: () => {
      setFromStr('');
      setToStr('');
      fetchDataWithRefresh({ from: null, to: null });
    }
  };

  const applyDateFilter = () => { fetchDataWithRefresh(); };
  const clearDateFilter = () => { quick.all(); };

  return (
    <div>
      <a ref={aRef} style={{display:'none'}} aria-hidden="true" />
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/80 border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-sky-400/20 flex items-center justify-center">⚖️</div>
          <h1 className="text-lg font-semibold">Withings Body Scan – Alešův osobní dashboard</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400 px-2 py-1 rounded border border-slate-700">Zdroj: {isLive ? 'živá data' : 'mock'}</span>
            <a href="/api/withings/login" className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Přihlásit Withings</a>
            <button onClick={onExport} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Export CSV</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {cards.map((c,i)=>(<KpiCard key={i} label={c.label} value={c.value} unit={c.unit} />))}
        </section>

        <section className="col-span-12 lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/60">
          {/* Filtry */}
          <div className="p-4 flex flex-wrap items-end gap-3 border-b border-slate-800">
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1">Od (datum)</label>
              <input
                type="date"
                value={fromStr}
                onChange={e=>setFromStr(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-400
                           focus:bg-slate-800 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-600/40
                           caret-slate-100"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1">Do (datum)</label>
              <input
                type="date"
                value={toStr}
                onChange={e=>setToStr(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-400
                           focus:bg-slate-800 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-600/40
                           caret-slate-100"
              />
            </div>
            <button onClick={applyDateFilter} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Použít</button>
            <button onClick={clearDateFilter} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Zrušit filtr</button>

            {/* Rychlé volby */}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={quick.last7} className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs">Posledních 7 dní</button>
              <button onClick={quick.last30} className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs">Posledních 30 dní</button>
              <button onClick={quick.thisMonth} className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs">Tento měsíc</button>
              <button onClick={quick.all} className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs">Vše</button>
            </div>
          </div>

          <HistoryTable dates={dates} rows={rows} />
        </section>

        <section className="col-span-12 lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="font-semibold mb-2">Komentář k vývoji</div>
          <div className="text-sm text-slate-300 leading-relaxed bg-slate-900 border border-slate-800 rounded-xl p-3">
            {comment || 'Zatím sbírám data…'}
          </div>
        </section>
      </main>
    </div>
  );
}
