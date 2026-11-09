"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-admin-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Receives the id and ARIA props for the control, so label and errors stay linked. */
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error || hint ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} className="mt-1 text-xs text-status-offline">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="mt-1 text-xs text-admin-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type TextProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
};

export function TextField({ label, value, onChange, error, hint, type = "text", placeholder, required, autoComplete }: TextProps) {
  return (
    <FormField label={label} error={error} hint={hint}>
      {(props) => (
        <input
          {...props}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className="admin-input"
        />
      )}
    </FormField>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  rows = 4,
}: Omit<TextProps, "type" | "placeholder" | "required" | "autoComplete"> & { rows?: number }) {
  return (
    <FormField label={label} error={error} hint={hint}>
      {(props) => (
        <textarea
          {...props}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="admin-input"
        />
      )}
    </FormField>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  error?: string;
}) {
  return (
    <FormField label={label} error={error}>
      {(props) => (
        <select {...props} value={value} onChange={(event) => onChange(event.target.value as T)} className="admin-input">
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
  hideLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-2.5 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-5 w-9 shrink-0 rounded-full bg-admin-line transition peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4"
      />
      <span className={hideLabel ? "sr-only" : ""}>{label}</span>
    </label>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="admin-card flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle aria-hidden className="size-7 text-status-maintenance" />
      <p className="text-sm text-admin-muted">{message}</p>
      <button type="button" onClick={onRetry} className="admin-btn admin-btn-secondary">
        <RefreshCw aria-hidden className="size-4" /> Try again
      </button>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export function AdminEmpty({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="admin-card flex flex-col items-center gap-2 p-10 text-center">
      <h2 className="font-medium">{title}</h2>
      <p className="text-sm text-admin-muted">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
