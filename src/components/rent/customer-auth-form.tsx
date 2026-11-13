"use client";

import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";

type Mode = "login" | "register";

const EMPTY = { name: "", email: "", phone: "", password: "", confirmPassword: "" };
type Values = typeof EMPTY;

/** Only same-site paths, so `?next=` cannot send people to another website. */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/account";
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  values,
  errors,
  onChange,
}: {
  label: string;
  name: keyof Values;
  type?: string;
  autoComplete: string;
  values: Values;
  errors: Record<string, string>;
  onChange: (name: keyof Values, value: string) => void;
}) {
  const id = useId();
  const error = errors[name];
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={values[name]}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="neon-input"
        required
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-status-offline">
          {error}
        </p>
      )}
    </div>
  );
}

export function CustomerAuthForm({ mode }: { mode: Mode }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  const onChange = (name: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => clearFieldError(current, name));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      await apiFetch(`/api/customer-auth/${mode}`, {
        method: "POST",
        body: isRegister ? values : { email: values.email, password: values.password },
      });
      // A full load, so the header and every page pick up the new session.
      window.location.href = safeNext();
    } catch (submitError) {
      setError(errorMessage(submitError));
      setErrors(fieldErrorsOf(submitError));
      setBusy(false);
    }
  }

  const fieldProps = { values, errors, onChange };

  return (
    <form onSubmit={submit} noValidate className="neon-card w-full max-w-md space-y-4 p-6 sm:p-8">
      <div className="pb-1 text-center">
        <h1 className="font-display text-2xl font-bold">{isRegister ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isRegister ? "Register to rent tools with your balance." : "Sign in to rent tools and see your orders."}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-status-offline/40 bg-status-offline/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {isRegister && <Field label="Full name" name="name" autoComplete="name" {...fieldProps} />}
      <Field label="Email" name="email" type="email" autoComplete="email" {...fieldProps} />
      {isRegister && <Field label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" {...fieldProps} />}
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        {...fieldProps}
      />
      {isRegister && (
        <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" {...fieldProps} />
      )}

      <button type="submit" disabled={busy} className="btn-neon w-full">
        {isRegister ? <UserPlus aria-hidden className="size-4" /> : <LogIn aria-hidden className="size-4" />}
        {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        {isRegister ? "Already have an account? " : "New here? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-medium text-cyan hover:underline">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
