import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--accent)] text-white',
        secondary: 'border-white/10 bg-white/6 text-[var(--text2)]',
        outline: 'border-white/12 text-[var(--text2)]',
        success: 'border-[rgba(76,175,80,0.28)] bg-[rgba(76,175,80,0.14)] text-[#9be3a0]',
        danger: 'border-[rgba(244,67,54,0.28)] bg-[rgba(244,67,54,0.14)] text-[#ffb3ad]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
