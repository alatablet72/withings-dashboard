'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import KpiCard from '../components/KpiCard';
import HistoryTable from '../components/HistoryTable';

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

  useEffect(()=>{
    const sp = new URLSearchParams(window.location.search);
    const at = sp.get('at');
    if (!at) return;
    fetch('/api/data?at='+encodeURIComponent(at))
      .then(r=>r.json())
      .then(payload=>{
        if (payload?.status===0) {
          setDates(payload.dates);
          setRows(payload.rows);
          setCards(payload.cards);
        }
      }).catch(()=>{});
  },[]);

  const tests = useMemo(()=>({
    t1: rows.every(r => r.values.length === dates.length),
    t2: rows.length > 0 && dates.length > 0,
    t3: cards.length === 6,
    t4: rows[0]?.label === 'Váha',
  }),[rows,dates,cards]);

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

  return (
    <div>
      <a ref={aRef} style={{display:'none'}} aria-hidden="true" />
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/80 border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-sky-400/20 flex items-center justify-center">⚖️</div>
          <h1 className="text-lg font-semibold">Withings Body Scan – Alešův osobní dashboard</h1>
          <div className="ml-auto flex items-center gap-3">
            <a href="/api/withings/login" className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Přihlásit Withings</a>
            <button onClick={onExport} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Export CSV</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {cards.map((c,i)=>(
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-400">{c.label}</div>
              <div className="mt-1 text-2xl font-bold">
                {c.value} <span className="text-slate-400 text-sm">{c.unit}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="col-span-12 lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-800">
            <span className="text-xs text-slate-400">Sloupce: nejnovější → starší</span>
            <span className="text-xs text-slate-400 px-2 py-1 rounded-full border border-slate-700">Počet: {dates.length}</span>
          </div>
          <HistoryTable dates={dates} rows={rows} />
        </section>

        <section className="col-span-12 lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="font-semibold mb-2">Komentář k vývoji</div>
          <div className="text-sm text-slate-300 leading-relaxed bg-slate-900 border border-slate-800 rounded-xl p-3">
            Váha klesá ~0,5 kg týdně, tělesný tuk % mírně klesá a svalová hmota zůstává stabilní.
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="font-semibold mb-2">Internal tests</div>
            <ul className="space-y-1 text-sm">
              <li className={tests.t1 ? 'text-emerald-400':'text-rose-400'}>{tests.t1?'✔':'✖'} Row length matches dates length</li>
              <li className={tests.t2 ? 'text-emerald-400':'text-rose-400'}>{tests.t2?'✔':'✖'} Non-empty rows & dates</li>
              <li className={tests.t3 ? 'text-emerald-400':'text-rose-400'}>{tests.t3?'✔':'✖'} KPI cards count == 6</li>
              <li className={tests.t4 ? 'text-emerald-400':'text-rose-400'}>{tests.t4?'✔':'✖'} First row is Váha</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
