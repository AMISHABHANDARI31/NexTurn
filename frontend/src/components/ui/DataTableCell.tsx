export function DataTableCell({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <td data-label={label} className={`block border-b border-slate-100 px-4 py-3 before:mr-3 before:text-xs before:font-bold before:uppercase before:text-slate-400 before:content-[attr(data-label)] md:table-cell md:border-0 md:before:hidden ${className}`}>{children}</td>
}
