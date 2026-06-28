import type { ButtonHTMLAttributes, ReactNode } from 'react'
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: ReactNode }
export function Button({ variant = 'primary', icon, className = '', children, ...props }: Props) {
  const styles = { primary: 'bg-navy text-white hover:bg-ink', secondary: 'border border-slate-300 bg-white text-ink hover:bg-slate-50', ghost: 'text-ink hover:bg-slate-100', danger: 'bg-red-600 text-white hover:bg-red-700' }
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{icon}{children}</button>
}
