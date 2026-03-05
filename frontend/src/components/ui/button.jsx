import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "bb-inline-flex bb-items-center bb-justify-center bb-whitespace-nowrap bb-rounded-md bb-text-sm bb-font-medium bb-transition-colors focus-visible:bb-outline-none focus-visible:bb-ring-2 focus-visible:bb-ring-sky-400 disabled:bb-pointer-events-none disabled:bb-opacity-50",
  {
    variants: {
      variant: {
        default: "bb-bg-sky-500 bb-text-slate-950 hover:bb-bg-sky-400",
        secondary:
          "bb-border bb-border-slate-600/60 bb-bg-slate-900/30 bb-text-slate-100 hover:bb-bg-slate-800/70",
        ghost: "bb-text-slate-200 hover:bb-bg-slate-800/60"
      },
      size: {
        default: "bb-h-10 bb-px-4 bb-py-2",
        icon: "bb-h-9 bb-w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
