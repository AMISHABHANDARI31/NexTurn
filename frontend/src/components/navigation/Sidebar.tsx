import { Activity, AlertTriangle, BarChart3, Bell, BrainCircuit, Building2, Gauge, ListChecks, LogOut, PanelLeftClose, PanelLeftOpen, Search, Settings2, Users, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth/AuthContext'
import type { Role } from '../../lib/auth/auth'

const navigationItems: Array<{ to: string; label: string; icon: typeof Gauge; roles: Role[] }> = [
  { to: '/app/dashboard', label: 'Overview', icon: Gauge, roles: ['User'] },
  { to: '/app/services', label: 'Find a service', icon: Search, roles: ['User'] },
  { to: '/app/queue', label: 'My live token', icon: ListChecks, roles: ['User'] },
  { to: '/app/notifications', label: 'Notifications', icon: Bell, roles: ['User'] },
  { to: '/app/manager/counters', label: 'Counter desk', icon: Activity, roles: ['Manager'] },
  { to: '/app/manager/queue', label: 'Live queue', icon: Users, roles: ['Manager'] },
  { to: '/app/manager/settings', label: 'Branch settings', icon: Settings2, roles: ['Manager'] },
  { to: '/app/manager/analytics', label: 'Local analytics', icon: BarChart3, roles: ['Manager'] },
  { to: '/app/manager/alerts', label: 'Operational alerts', icon: AlertTriangle, roles: ['Manager'] },
  { to: '/app/admin/dashboard', label: 'Global overview', icon: Activity, roles: ['SystemAdmin'] },
  { to: '/app/admin/locations', label: 'New center', icon: Building2, roles: ['SystemAdmin'] },
  { to: '/app/admin/users', label: 'User access', icon: Users, roles: ['SystemAdmin'] },
  { to: '/app/admin/model', label: 'AI model', icon: BrainCircuit, roles: ['SystemAdmin'] },
  { to: '/app/admin/analytics', label: 'Analytics', icon: BarChart3, roles: ['SystemAdmin'] },
]

interface SidebarProps {
  open: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapsed: () => void
}

export function Sidebar({ open, collapsed, onClose, onToggleCollapsed }: SidebarProps) {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const visibleItems = navigationItems.filter((item) => session && item.roles.includes(session.role))

  return <>
    <div onClick={onClose} className={`fixed inset-0 z-30 bg-ink/40 lg:hidden ${open ? 'block' : 'hidden'}`} aria-hidden="true" />
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white p-4 transition-[width,transform] duration-200 lg:sticky lg:top-16 lg:z-10 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${collapsed ? 'lg:w-20' : 'lg:w-72'} ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-5 flex items-center justify-between">
        <p className={`px-3 text-xs font-bold uppercase tracking-wider text-slate-400 ${collapsed ? 'lg:sr-only' : ''}`}>Workspace</p>
        <button className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-ink lg:inline-flex" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand workspace navigation' : 'Collapse workspace navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
        <button className="rounded-lg p-2 lg:hidden" onClick={onClose} aria-label="Close navigation"><X /></button>
      </div>
      <nav className="space-y-1" aria-label="Workspace navigation">
        {visibleItems.map(({ to, label, icon: Icon }) => <NavLink key={to} onClick={onClose} to={to} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => `flex min-h-12 items-center rounded-xl px-3 py-3 text-sm font-semibold ${collapsed ? 'lg:justify-center' : 'gap-3'} ${isActive ? 'bg-mint text-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`}><Icon size={19} className="shrink-0" /><span className={collapsed ? 'lg:sr-only' : ''}>{label}</span></NavLink>)}
      </nav>
      <div className="mt-auto border-t border-slate-100 pt-4"><button onClick={() => { signOut(); onClose(); navigate('/login', { replace: true }) }} title={collapsed ? 'Logout' : undefined} className={`flex min-h-12 w-full items-center rounded-xl px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 ${collapsed ? 'lg:justify-center' : 'gap-3'}`}><LogOut size={19} className="shrink-0" /><span className={collapsed ? 'lg:sr-only' : ''}>Logout</span></button></div>
    </aside>
  </>
}
