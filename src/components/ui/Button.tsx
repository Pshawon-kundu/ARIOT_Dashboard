import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-dark focus-visible:outline-brand disabled:bg-brand/40',
  secondary:
    'bg-white text-ink border border-line hover:border-[#CBD5E1] hover:bg-app focus-visible:outline-brand disabled:text-ink-muted',
  ghost:
    'bg-transparent text-ink-secondary hover:bg-idle-pale hover:text-ink focus-visible:outline-brand',
  danger:
    'bg-danger text-white hover:bg-[#C93A3F] focus-visible:outline-danger disabled:bg-danger/40',
  success:
    'bg-success text-white hover:bg-[#1A8F57] focus-visible:outline-success',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-[10px]',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-[10px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
