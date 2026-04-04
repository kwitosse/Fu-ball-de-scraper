import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(233,69,96,0.28)] hover:bg-[#f15e78]',
        secondary: 'bg-[rgba(255,255,255,0.06)] text-[var(--text)] border border-white/10 hover:bg-white/10',
        outline: 'border border-white/12 bg-transparent text-[var(--text2)] hover:bg-white/6 hover:text-[var(--text)]',
        ghost: 'bg-transparent text-[var(--text2)] hover:bg-white/6 hover:text-[var(--text)]',
        destructive: 'bg-[rgba(244,67,54,0.16)] text-[#ffb3ad] border border-[rgba(244,67,54,0.3)] hover:bg-[rgba(244,67,54,0.22)]',
      },
      size: {
        default: 'min-h-11 px-4 py-2.5',
        sm: 'min-h-9 rounded-lg px-3 text-xs',
        lg: 'min-h-12 rounded-2xl px-5 text-sm',
        icon: 'size-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
