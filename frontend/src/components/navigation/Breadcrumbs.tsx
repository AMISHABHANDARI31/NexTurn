import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
export function Breadcrumbs() { const parts=useLocation().pathname.split('/').filter(Boolean); return <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-xs text-slate-500"><Link to="/app/dashboard" className="hover:text-ink">Home</Link>{parts.slice(1).map((part,i)=><span key={part} className="flex items-center gap-1"><ChevronRight size={13}/><span className={i===parts.length-2?'font-semibold text-ink':''}>{part.replaceAll('-',' ')}</span></span>)}</nav> }
