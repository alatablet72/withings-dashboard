'use client';
export default function KpiCard({label,value,unit}){return(<div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-bold">{value} <span className="text-slate-400 text-sm">{unit}</span></div></div>);} 
