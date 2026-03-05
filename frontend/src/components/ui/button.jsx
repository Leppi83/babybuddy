import { cn } from "../../lib/utils";

export function Button({ className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400",
        className
      )}
      {...props}
    />
  );
}
