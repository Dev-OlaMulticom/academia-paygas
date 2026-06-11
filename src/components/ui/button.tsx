import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-[13px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-[#F47C20] text-white hover:bg-[#C45E0A] shadow-sm',
        destructive:
          'bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#374151] shadow-xs',
        secondary:
          'bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] hover:bg-[#E5E7EB]',
        ghost:
          'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]',
        link:
          'text-[#F47C20] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2 has-[>svg]:px-4',
        sm: 'h-8 rounded-[6px] gap-1.5 px-3 text-[12px] has-[>svg]:px-2.5',
        lg: 'h-11 rounded-[6px] px-7 text-[14px] has-[>svg]:px-5',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
