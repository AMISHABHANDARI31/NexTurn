import { BrainCircuit, Clock3, Gauge, Users } from 'lucide-react'
import { usePrediction } from '../../sqps/hooks/usePrediction'

export function CounterControl({ locationId }: { locationId?: string }) {
  const prediction = usePrediction(locationId, 'branch')
  if (!locationId) return null
  return <section className="card mb-6 p-5" aria-labelledby="branch-forecast-title"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-ocean">Live prediction engine</p><h2 id="branch-forecast-title" className="mt-1 text-xl font-bold">Branch backlog forecast</h2></div>{prediction.isFetching && <span className="text-xs font-bold text-ocean">Syncing telemetry…</span>}</div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Forecast icon={Clock3} label="Clear waiting room" value={prediction.data ? `${prediction.data.backlogClearanceMinutes} min` : '--'} /><Forecast icon={Users} label="Waiting customers" value={String(prediction.data?.queueLength ?? '--')} /><Forecast icon={Gauge} label="Active counters" value={String(prediction.data?.activeCounters ?? '--')} /><Forecast icon={BrainCircuit} label="AI confidence" value={prediction.data ? `${prediction.data.predictionConfidenceScore}%` : '--'} /></div>{prediction.isError && <p className="mt-4 text-sm text-red-700">Live forecast is temporarily unavailable.</p>}</section>
}

function Forecast({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><Icon size={17} className="text-ocean" /><p className="mt-2 text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div> }
