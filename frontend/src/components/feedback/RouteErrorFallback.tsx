import { AlertTriangle, RefreshCw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '../ui/Button'

export function RouteErrorFallback() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? error.statusText || 'This page could not be loaded.'
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return <main className="grid min-h-screen place-items-center bg-cream p-6"><section role="alert" className="card max-w-lg p-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-700"><AlertTriangle /></span><h1 className="mt-5 text-2xl font-bold">NexTurn hit a snag</h1><p className="mt-2 text-sm text-slate-600">{message}</p><Button className="mt-6" icon={<RefreshCw size={17} />} onClick={() => window.location.reload()}>Reload application</Button></section></main>
}
