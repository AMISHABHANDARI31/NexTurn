import { forwardRef, type InputHTMLAttributes } from 'react'
type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }
export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, hint, id, className = '', ...props }, ref) => {
  const fieldId = id || props.name
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  return <div><label htmlFor={fieldId} className="field-label">{label}</label><input ref={ref} id={fieldId} aria-invalid={!!error} aria-describedby={describedBy} className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 ${error ? 'border-red-500' : 'border-slate-300 hover:border-slate-400'} ${className}`} {...props}/>{error ? <p id={`${fieldId}-error`} role="alert" className="mt-1.5 text-sm text-red-700">{error}</p> : hint ? <p id={`${fieldId}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}</div>
})
Input.displayName = 'Input'
