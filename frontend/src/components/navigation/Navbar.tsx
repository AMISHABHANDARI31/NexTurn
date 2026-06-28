import { Bell, Menu, Sparkles, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthContext'
import { Button } from '../ui/Button'

export function Brand() {
  return <Link to="/" className="flex items-center gap-2 font-bold text-ink"><span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white"><Sparkles size={18} /></span><span className="display text-xl">NexTurn</span></Link>
}

export function Navbar({ onMenu, showNotifications = false }: { onMenu?: () => void; showNotifications?: boolean }) {
  const { session } = useAuth()
  const isDashboard = Boolean(onMenu)

  return <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-cream/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3">{onMenu && <button onClick={onMenu} className="shrink-0 rounded-lg p-2 lg:hidden" aria-label="Open navigation"><Menu /></button>}<Brand /></div>{isDashboard && session ? <div className="flex min-w-0 items-center gap-3">{showNotifications && <Link to="/app/notifications" className="relative shrink-0 rounded-xl p-2.5 text-slate-600 hover:bg-white" aria-label="Notifications"><Bell size={20} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral" /></Link>}<div className="h-8 w-px bg-slate-200" aria-hidden="true" /><div className="min-w-0 text-right"><p className="truncate text-sm font-bold text-ink">{session.name}</p><p className="hidden max-w-52 truncate text-xs text-slate-500 sm:block">{session.email}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy text-white" aria-hidden="true"><UserRound size={19} /></span></div> : <div className="flex items-center gap-2"><Link to="/register"><Button variant="secondary">Register</Button></Link><Link to="/login"><Button>Sign in</Button></Link></div>}</div></header>
}
