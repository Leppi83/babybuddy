import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "bb-inline-flex bb-items-center bb-rounded-full bb-border bb-px-2 bb-py-0.5 bb-text-xs bb-font-medium",
  {
    variants: {
      variant: {
        neutral: "bb-border-slate-600/50 bb-bg-slate-900/30 bb-text-slate-200",
        success: "bb-border-emerald-500/40 bb-bg-emerald-500/10 bb-text-emerald-300",
        accent: "bb-border-sky-500/40 bb-bg-sky-500/10 bb-text-sky-200"
      }
    },
    defaultVariants: {
      variant: "neutral"
    }
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
