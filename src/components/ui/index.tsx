/**
 * Primitivos de interface no padrão shadcn/ui (cva + tailwind-merge),
 * ajustados à direção de arte NEOBAMBU: linhas finas, cantos retos,
 * tipografia leve e animações discretas.
 */
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { cn, initials } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px] font-normal tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:bg-graphite',
        outline: 'border border-line bg-white text-ink hover:border-ink/40',
        ghost: 'text-ink/80 hover:bg-mineral/70 hover:text-ink',
        olive: 'bg-olive text-white hover:bg-olive/90',
        danger: 'border border-st-ajustes/40 text-st-ajustes bg-white hover:bg-st-ajustes/5',
        link: 'text-ink underline-offset-4 hover:underline px-0 h-auto',
      },
      size: { sm: 'h-8 px-3 text-[12px]', md: 'h-10 px-4', lg: 'h-12 px-6 text-[13px] tracking-[0.08em] uppercase', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
)

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>>(
  ({ className, variant, size, ...p }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...p} />,
)

const field = 'w-full border border-line bg-white px-3 text-[13.5px] font-normal text-ink placeholder:text-muted/70 transition-colors focus:border-ink/50 focus:outline-none disabled:bg-paper disabled:text-muted'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, 'h-10', className)} {...p} />
))
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, 'min-h-[96px] py-2.5 leading-relaxed', className)} {...p} />
))
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select
    ref={ref}
    className={cn(field, 'h-10 appearance-none truncate pr-8', className)}
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%237A7871' stroke-width='1.2'/%3E%3C/svg%3E")`,
      backgroundSize: '10px',
      backgroundPosition: 'right 12px center',
      backgroundRepeat: 'no-repeat',
    }}
    {...p}
  >
    {children}
  </select>
))

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="label block">{label}</span>
      {children}
      {hint && <span className="block text-[11.5px] text-muted">{hint}</span>}
    </label>
  )
}

export function Checkbox({ checked, onChange, className, label }: { checked: boolean; onChange: (v: boolean) => void; className?: string; label?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center border transition-colors', checked ? 'border-ink bg-ink' : 'border-ink/30 bg-white hover:border-ink/60', className)}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="h-3 w-3">
          <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#F7F6F2" strokeWidth="1.5" />
        </svg>
      )}
    </button>
  )
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 border border-line bg-white px-2 py-0.5 text-[11px] font-normal text-ink/80', className)}>{children}</span>
}

export function Avatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-[10px] font-medium tracking-wide text-ink', className)} title={name}>
      {name ? initials(name) : '—'}
    </span>
  )
}

export function Dialog({ open, onClose, title, description, children, footer, className }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={cn('relative flex max-h-[92vh] w-full max-w-lg flex-col bg-white shadow-2xl animate-fade-in', className)}>
        <div className="flex items-start justify-between gap-6 border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-light tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="-mr-2 p-2 text-muted hover:text-ink" aria-label="Fechar">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cn('no-scrollbar flex gap-6 overflow-x-auto border-b border-line', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={cn('-mb-px flex items-center gap-2 whitespace-nowrap border-b py-3 text-[13px] transition-colors', value === it.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; title?: string }[]; className?: string }) {
  return (
    <div className={cn('inline-flex border border-line bg-white p-0.5', className)}>
      {items.map((it) => (
        <button
          key={it.id}
          title={it.title}
          onClick={() => onChange(it.id)}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors', value === it.id ? 'bg-ink text-paper' : 'text-muted hover:text-ink')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="mb-4 text-wood">{icon}</div>}
      <p className="font-display text-[15px] font-light">{title}</p>
      {children && <div className="mt-2 max-w-sm text-[13px] text-muted">{children}</div>}
    </div>
  )
}

export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="animate-fade-in">
        {kicker && <p className="label mb-3">{kicker}</p>}
        <h1 className="font-display text-[28px] font-extralight leading-tight tracking-tight md:text-[38px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Progress({ value, className, tone = 'bg-olive' }: { value: number; className?: string; tone?: string }) {
  return (
    <div className={cn('h-[3px] w-full bg-mineral', className)}>
      <div className={cn('h-full transition-all duration-700', tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
