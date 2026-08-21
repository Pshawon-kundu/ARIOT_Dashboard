import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hoverable?: boolean
  padded?: boolean
}

export function Card({
  children,
  className = '',
  hoverable = false,
  padded = true,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-card shadow-card ${
        padded ? 'p-5 sm:p-6' : ''
      } ${hoverable ? 'transition-all duration-150 hover:shadow-card-hover' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
