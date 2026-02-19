"use client";

import { useEffect } from "react";

type ToastProps = {
  open: boolean;
  message: string;
  variant?: "success" | "error";
  autoDismissMs?: number;
  onClose: () => void;
};

export function Toast({
  open,
  message,
  variant = "success",
  autoDismissMs = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [open, autoDismissMs, onClose]);

  if (!open) return null;

  return (
    <div className="fixed left-1/2 top-6 z-50 w-full max-w-md -translate-x-1/2 px-4">
      <div
        className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
          variant === "error"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
