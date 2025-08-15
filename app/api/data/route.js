import { NextResponse } from 'next/server';
import { getMeasures } from '../../../lib/withings';

const TYPE_MAP = {
  1: { name: 'Váha', unit: 'kg', dp: 2 },
  6: { name: 'Tuk (%)', unit: '%', dp: 1 },
  8: { name: 'Svaly (kg)', unit: 'kg', dp: 2 },
  9: { name: 'Voda (kg)', unit: 'kg', dp: 2 },
  91:{ name: 'PWV', unit: 'm/s', dp: 2 },
  123:{ name: 'Cévní věk', unit: 'roky', dp: 0 },
};
const ORDER = [1,6,8,9,91,123];

function realValue(value, unit){ return value * Math.pow(10, unit); }

export async function GET(req){
  const { searchParams } = new URL(req.url);
  const at = searchParams.get('at');
  if(!at) return NextResponse.json({ status: 401, error: 'missing access token' });

  const res = await getMeasures(at, ORDER);
  if(res.status !== 0) return NextResponse.json({ status: res.status, error: 'withings error' });

  const grps = res.body?.measuregrps || [];
  const seen = new Set(); const cols = [];
  [...grps].sort((a,b)=>b.date-a.date).forEach(g=>{ if(!seen.has(g.date)){ cols.push(g.date); seen.add(g.date); }});
  const limited = cols.slice(0, 10);
  const dates = limited.map(ts => new Date(ts*1000).toLocaleString('cs-CZ'));

  const byType = {};
  for(const g of grps){
    const ts = g.date;
    for(const m of g.measures){
      const v = realValue(m.value, m.unit);
      (byType[m.type] ||= {})[ts] = v;
    }
  }

  const rows = ORDER.map(t=>{
    const meta = TYPE_MAP[t];
    const vals = limited.map(ts=>{
      const v = byType[t]?.[ts];
      return v === undefined ? '' : v.toFixed(meta.dp);
    });
    return { label: meta.name, unit: meta.unit, values: vals };
  });

  const cards = rows.slice(0,6).map(r=>({ label:r.label, value:r.values[0], unit:r.unit }));
  return NextResponse.json({ status: 0, dates, rows, cards });
}
