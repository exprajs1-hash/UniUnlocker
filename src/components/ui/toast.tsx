"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}
interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const stackRef = useRef<HTMLDivElement>(null);

  // Modal dialogs sit in the browser's top layer, above any z-index. Re-showing the
  // stack as a popover places it above them, so errors stay visible during modal saves.
  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    if (stack.matches(":popover-open")) stack.hidePopover();
    if (toasts.length > 0) stack.showPopover();
  }, [toasts]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = (nextId.current += 1);
      setToasts((current) => [...current, { id, tone, message }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={stackRef}
        popover="manual"
        aria-live="polite"
        className="fixed inset-auto right-4 bottom-4 m-0 w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 overflow-visible border-0 bg-transparent p-0 [&:popover-open]:flex"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="flex items-start gap-3 rounded-lg border border-admin-line bg-admin-raised p-3 text-sm text-admin-text shadow-xl"
          >
            {toast.tone === "success" ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-status-online" />
            ) : (
              <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-status-offline" />
            )}
            <p className="flex-1">{toast.message}</p>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="text-admin-muted hover:text-admin-text">
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
