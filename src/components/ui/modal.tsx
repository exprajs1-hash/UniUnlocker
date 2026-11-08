"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Native <dialog>, which brings focus trapping and Escape-to-close with it. */
export function Modal({
  open,
  onClose,
  title,
  children,
  className = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100vw-2rem)] rounded-xl border border-admin-line bg-admin-panel p-0 text-admin-text shadow-2xl ${className}`}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" aria-label="Close" onClick={onClose} className="admin-icon-btn -mt-1 -mr-1">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} className="max-w-md">
      <p className="text-sm text-admin-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className="admin-btn admin-btn-danger">
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
