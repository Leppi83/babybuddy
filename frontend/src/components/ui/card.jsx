import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <article
      className={cn(
        "bb-rounded-xl bb-border bb-border-slate-600/40 bb-bg-slate-900/45 bb-backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <header className={cn("bb-flex bb-items-center bb-gap-2 bb-p-3", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("bb-m-0 bb-text-base bb-font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("bb-px-3 bb-pb-3", className)} {...props} />;
}
