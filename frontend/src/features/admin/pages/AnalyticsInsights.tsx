import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { RefreshCw, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { InitialLoadingSkeleton } from '../../../components/feedback/InitialLoadingSkeleton'
import { NetworkErrorFallback } from '../../../components/feedback/NetworkErrorFallback'
import { Button } from '../../../components/ui/Button'
import { adminApi } from '../../sqps/api/adminApi'
import { MetricCard } from '../../sqps/components/MetricCard'

export function PredictionEngineControls() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-model'], queryFn: adminApi.getModelStatus, refetchInterval: 5_000 })
  const [factor, setFactor] = useState('1')
  useEffect(() => { if (query.data) setFactor(String(query.data.congestionFactor)) }, [query.data])
  const train = useMutation({ mutationFn: adminApi.triggerRetraining, onSuccess: () => client.invalidateQueries({ queryKey: ['admin-model'] }) })
  const update = useMutation({ mutationFn: adminApi.updateCongestionFactor, onSuccess: () => { client.invalidateQueries({ queryKey: ['admin-model'] }); client.invalidateQueries({ queryKey: ['prediction-core'] }) } })
  if (query.isLoading) return <InitialLoadingSkeleton />
  if (query.isError) return <NetworkErrorFallback onRetry={() => query.refetch()} />
  const model = query.data!
  return <section aria-labelledby="engine-controls-title"><div className="mb-4"><h2 id="engine-controls-title" className="text-xl font-bold">Prediction Engine Controls</h2><p className="text-sm text-slate-500">Tune the live Little’s Law curve and operate the PyTorch historical-data bridge.</p></div><div className="grid gap-4 md:grid-cols-3"><MetricCard label="Model version" value={model.modelVersion} detail="Active prediction artifact" accent /><MetricCard label="Mean absolute error" value={`${model.meanAbsoluteError} min`} detail={`${model.sampleSize} completed samples`} /><MetricCard label="Training status" value={model.training.status} detail={model.training.completedAt ? `Updated ${format(new Date(model.training.completedAt), 'MMM d, HH:mm')}` : 'No completed run yet'} /></div><div className="card mt-6 grid gap-6 p-6 md:grid-cols-2"><div><h3 className="font-bold">Retrain PyTorch model</h3><p className="mt-1 text-sm text-slate-500">Processes newly archived historical token documents through the isolated Python bridge.</p><Button className="mt-5" icon={<RefreshCw size={17} />} disabled={train.isPending || model.training.status === 'running'} onClick={() => train.mutate()}>{model.training.status === 'running' ? 'Training in progress…' : 'Start retraining'}</Button>{train.isError && <ControlError error={train.error} />}</div><div><h3 className="font-bold">Congestion multiplier factor</h3><p className="mt-1 text-sm text-slate-500">Saved in MongoDB. Use 0.5–3.0 to tune seasonal prediction sensitivity.</p><div className="mt-4 flex gap-2"><input aria-label="Congestion multiplier factor" type="number" min="0.5" max="3" step="0.05" value={factor} onChange={(event) => setFactor(event.target.value)} className="min-h-11 w-32 rounded-xl border border-slate-300 px-3" /><Button icon={<Settings2 size={17} />} disabled={update.isPending} onClick={() => update.mutate(Number(factor))}>Save factor</Button></div>{update.isError && <ControlError error={update.error} />}{update.isSuccess && <p className="mt-3 text-sm font-bold text-emerald-700">Prediction factor saved.</p>}</div></div></section>
}

function ControlError({ error }: { error: unknown }) { const message = typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' ? error.message : 'Prediction operation failed.'; return <p role="alert" className="mt-3 text-sm text-red-700">{message}</p> }
