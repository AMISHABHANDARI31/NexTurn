import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Breadcrumbs } from '../components/navigation/Breadcrumbs'
import { Navbar } from '../components/navigation/Navbar'
import { Sidebar } from '../components/navigation/Sidebar'
import { useAuth } from '../lib/auth/AuthContext'

export function DashboardLayout() {
  const [isNavigationOpen, setNavigationOpen] = useState(false)
  const [isNavigationCollapsed, setNavigationCollapsed] = useState(false)
  const { session } = useAuth()
  const showNotifications = session?.role === 'User' || session?.role === 'Manager' || session?.role === 'SystemAdmin'
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onMenu={() => setNavigationOpen(true)} showNotifications={showNotifications} />
      <div className="mx-auto flex max-w-[1600px]">
        <Sidebar open={isNavigationOpen} collapsed={isNavigationCollapsed} onClose={() => setNavigationOpen(false)} onToggleCollapsed={() => setNavigationCollapsed((value) => !value)} />
        <main id="main-content" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
