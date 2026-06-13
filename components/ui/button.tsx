import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-black text-white shadow-[0_18px_44px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 hover:bg-slate-900',
        outline:
          'border border-slate-200 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50',
        ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-13 px-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export function buttonClassName({
  className,
  size,
  variant,
}: ButtonVariants & { className?: string } = {}) {
  return cn(buttonVariants({ size, variant }), className);
}
