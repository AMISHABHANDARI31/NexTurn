import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/navigation/Navbar'
export function PublicLayout() { return <div className="min-h-screen bg-cream"><Navbar/><main id="main-content"><Outlet/></main><footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500">© 2026 NexTurn. Every minute matters.</footer></div> }
