import React, { useEffect } from "react";
import { X } from "lucide-react";

export function TailwindDrawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-slate-900 border-l border-sky-500/20 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-base font-bold text-slate-100 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body — min-h-0 is required for overflow-y-auto to work in a flex child */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
