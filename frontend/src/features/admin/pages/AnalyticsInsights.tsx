import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { BrainCircuit, RefreshCw, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { InitialLoadingSkeleton } from '../../../components/feedback/InitialLoadingSkeleton'
import { NetworkErrorFallback } from '../../../components/feedback/NetworkErrorFallback'
import { Button } from '../../../components/ui/Button'
import { adminApi } from '../../sqps/api/adminApi'
import { MetricCard } from '../../sqps/components/MetricCard'

export function PredictionEngineControls() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-model'], queryFn: adminApi.getModelStatus })
  const accuracy = useQuery({ queryKey: ['admin-model-accuracy'], queryFn: adminApi.getPredictionAccuracy })
  const [factor, setFactor] = useState('1')

  useEffect(() => { if (query.data) setFactor(String(query.data.congestionFactor)) }, [query.data])

  const train = useMutation({
    mutationFn: adminApi.triggerRetraining,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-model'] })
      client.invalidateQueries({ queryKey: ['admin-model-accuracy'] })
    },
  })
  const update = useMutation({
    mutationFn: adminApi.updateCongestionFactor,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-model'] })
      client.invalidateQueries({ queryKey: ['prediction-core'] })
    },
  })

  if (query.isLoading || accuracy.isLoading) return <InitialLoadingSkeleton />
  if (query.isError || accuracy.isError) return <NetworkErrorFallback onRetry={() => { query.refetch(); accuracy.refetch() }} />

  const model = query.data!
  const chart = (model.accuracyHistory ?? []).map((point) => ({
    label: format(new Date(point.date), 'MMM d'),
    accuracy: point.accuracyPercentage,
    mae: point.mae,
  }))

  return <section aria-labelledby="engine-controls-title">
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-ocean">AI prediction engine</p>
      <h2 id="engine-controls-title" className="mt-1 text-xl font-bold">Model Management & Accuracy</h2>
      <p className="text-sm text-slate-500">Learns from completed queue transactions and compares predicted vs actual wait times.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      <MetricCard label="Model version" value={model.modelVersion} detail={model.modelType} accent />
      <MetricCard label="Accuracy" value={`${model.metrics?.accuracyPercentage ?? 0}%`} detail={`${model.sampleSize} historical samples`} />
      <MetricCard label="MAE / RMSE" value={`${model.metrics?.mae ?? 0} / ${model.metrics?.rmse ?? 0}`} detail="Prediction error in minutes" />
      <MetricCard label="Training status" value={model.training.status} detail={model.trainedAt ? `Trained ${format(new Date(model.trainedAt), 'MMM d, HH:mm')}` : 'No trained model yet'} />
    </div>

    <div className="card mt-6 grid gap-6 p-6 lg:grid-cols-2">
      <div>
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-mint text-ocean"><BrainCircuit size={22} /></span>
          <div>
            <h3 className="font-bold">Retrain data-driven model</h3>
            <p className="mt-1 text-sm text-slate-500">Builds anonymized historical rows from completed tokens, trains a linear regression model, and stores the active version in MongoDB.</p>
          </div>
        </div>
        <Button className="mt-5" icon={<RefreshCw size={17} />} disabled={train.isPending || model.training.status === 'running'} onClick={() => train.mutate()}>
          {model.training.status === 'running' ? 'Training in progress…' : 'Start retraining'}
        </Button>
        {model.training.output && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{model.training.output}</p>}
        {train.isError && <ControlError error={train.error} />}
      </div>

      <div>
        <h3 className="font-bold">Congestion multiplier factor</h3>
        <p className="mt-1 text-sm text-slate-500">Saved in MongoDB. Use 0.5-3.0 to tune seasonal prediction sensitivity.</p>
        <div className="mt-4 flex gap-2">
          <input aria-label="Congestion multiplier factor" type="number" min="0.5" max="3" step="0.05" value={factor} onChange={(event) => setFactor(event.target.value)} className="min-h-11 w-32 rounded-xl border border-slate-300 px-3" />
          <Button icon={<Settings2 size={17} />} disabled={update.isPending} onClick={() => update.mutate(Number(factor))}>Save factor</Button>
        </div>
        {update.isError && <ControlError error={update.error} />}
        {update.isSuccess && <p className="mt-3 text-sm font-bold text-emerald-700">Prediction factor saved.</p>}
      </div>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_440px]">
      <section className="card p-5">
        <h3 className="font-bold">Accuracy history</h3>
        <p className="mb-4 text-sm text-slate-500">Daily accuracy and mean absolute error from stored prediction history.</p>
        {chart.length ? <ResponsiveContainer width="100%" height={300}><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#176b87" strokeWidth={3} /><Line type="monotone" dataKey="mae" name="MAE min" stroke="#f97316" strokeWidth={3} /></LineChart></ResponsiveContainer> : <p className="grid h-[300px] place-items-center text-sm text-slate-500">Accuracy graph appears after completed tokens are recorded.</p>}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-bold">Predicted vs actual</h3>
          <p className="text-sm text-slate-500">Latest completed-token comparison samples.</p>
        </div>
        <div className="max-h-[340px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Service</th><th className="p-3">Predicted</th><th className="p-3">Actual</th><th className="p-3">Error</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {accuracy.data?.comparisons.map((row) => <tr key={row.tokenId}><td className="p-3 font-bold">{row.serviceType}</td><td className="p-3">{Math.round(row.predictedWaitTime)} min</td><td className="p-3">{Math.round(row.actualWaitTime)} min</td><td className="p-3">{row.predictionError > 0 ? '+' : ''}{row.predictionError.toFixed(1)} min</td></tr>)}
              {!accuracy.data?.comparisons.length && <tr><td colSpan={4} className="p-5 text-center text-slate-500">Complete tokens to compare prediction performance.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
}

function ControlError({ error }: { error: unknown }) {
  const message = typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' ? error.message : 'Prediction operation failed.'
  return <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>
}
