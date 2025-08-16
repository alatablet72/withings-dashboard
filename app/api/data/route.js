import { NextResponse } from 'next/server';
import { getMeasures } from '../../../lib/withings';

const TYPE_MAP = {
  1:   { name: 'Váha',       unit: 'kg',  dp: 2 },
  6:   { name: 'Tuk (%)',    unit: '%',   dp: 1 },
  8:   { name: 'Svaly (kg)', unit: 'kg',  dp: 2 },
  9:   { name: 'Voda (kg)',  unit: 'kg',  dp: 2 },
  91:  { name: 'PWV',        unit: 'm/s', dp: 2 },
  123: { name: 'Cévní věk',  unit: 'roky',dp: 0 },
};
const ORDER = [1, 6, 8, 9, 91, 123];

function realValue(value, unit) {
  return value * Math.pow(10, unit);
}

export async function GET(req) {
  const url = new URL(req.url);
  const { searchParams } = url;

  const at = searchParams.get('at');
  if (!at) return NextResponse.json({ status: 401, error: 'missing access token' });

  // volitelné filtrování:
  const from = parseInt(searchParams.get('from') || '', 10); // UNIX sec (inclusive)
  const to   = parseInt(searchParams.get('to')   || '', 10); // UNIX sec (inclusive)
  const hasFrom = !Number.isNaN(from);
  const hasTo   = !Number.isNaN(to);

  // limit počtu sloupců (0 = vše)
  const limitParam = parseInt(searchParams.get('limit') || '0', 10);
  const hasLimit = !Number.isNaN(limitParam) && limitParam > 0;

  // Načtení dat z Withings
  const res = await getMeasures(at, ORDER);
  if (res.status !== 0) {
    return NextResponse.json({ status: res.status, error: 'withings error' });
  }

  let grps = res.body?.measuregrps || [];

  // Filtrování na serveru dle času měření (g.date je UNIX sec UTC)
  if (hasFrom) grps = grps.filter(g => g.date >= from);
  if (hasTo)   grps = grps.filter(g => g.date <= to);

  // Unikátní timestampy (nejnovější → starší)
  const seen = new Set();
  const cols = [];
  [...grps].sort((a, b) => b.date - a.date).forEach(g => {
    if (!seen.has(g.date)) {
      cols.push(g.date);
      seen.add(g.date);
    }
  });

  const selectedTs = hasLimit ? cols.slice(0, limitParam) : cols;

  // Časy formátujeme v CZ lokalizaci a CZ časové zóně
  const dates = selectedTs.map(ts =>
    new Date(ts * 1000).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })
  );

  // Přemapovat hodnoty podle typu a času
  const byType = {};
  for (const g of grps) {
    const ts = g.date;
    for (const m of g.measures) {
      const v = realValue(m.value, m.unit);
      (byType[m.type] ||= {})[ts] = v;
    }
  }

  // Řádky v pořadí ORDER; přidáváme type kvůli stabilnímu řazení na klientu
  const rows = ORDER.map(t => {
    const meta = TYPE_MAP[t];
    const vals = selectedTs.map(ts => {
      const v = byType[t]?.[ts];
      return v === undefined ? '' : v.toFixed(meta.dp);
    });
    return { type: t, label: meta.name, unit: meta.unit, values: vals };
  });

  // KPI karty (první hodnota každé metriky, pokud existuje)
  const cards = rows.slice(0, 6).map(r => ({
    label: r.label,
    value: r.values[0],
    unit: r.unit,
  }));

  return NextResponse.json({ status: 0, dates, rows, cards });
}
