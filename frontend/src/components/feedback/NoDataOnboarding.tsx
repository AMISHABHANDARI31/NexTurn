import { Inbox } from 'lucide-react'

export function NoDataOnboarding({ title = 'Nothing here yet', message = 'Your first item will appear here once it is created.', action }: { title?: string; message?: string; action?: React.ReactNode }) {
  return <div className="card p-8 text-center"><Inbox className="mx-auto mb-3 h-9 w-9 text-ocean" /><h3 className="text-lg font-bold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{message}</p>{action && <div className="mt-5">{action}</div>}</div>
}
