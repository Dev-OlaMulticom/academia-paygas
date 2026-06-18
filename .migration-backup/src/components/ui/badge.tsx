import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-[10px] border px-2.5 py-0.5 text-[11px] font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#F47C20] text-white [a&]:hover:bg-[#C45E0A]',
        secondary:
          'border-transparent bg-[#F3F4F6] text-[#374151] [a&]:hover:bg-[#E5E7EB]',
        destructive:
          'border-transparent bg-[#DC2626] text-white [a&]:hover:bg-[#B91C1C]',
        outline:
          'border-[#E5E7EB] text-[#4B5563] bg-white [a&]:hover:bg-[#F3F4F6]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
