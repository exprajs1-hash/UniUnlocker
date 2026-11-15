"use client";

import { ArrowLeft, KeyRound, LogIn, MailCheck, RotateCw, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";

type Mode = "login" | "register" | "forgot";

const EMPTY = { name: "", email: "", phone: "", password: "", confirmPassword: "", code: "" };
type Values = typeof EMPTY;

/** Seconds before "Resend code" can be used again; matches the server cooldown. */
const RESEND_SECONDS = 60;

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
  inputMode,
  maxLength,
  className = "neon-input",
  autoFocus,
}: {
  label: string;
  name: keyof Values;
  type?: string;
  autoComplete: string;
  values: Values;
  errors: Record<string, string>;
  onChange: (name: keyof Values, value: string) => void;
  inputMode?: "numeric";
  maxLength?: number;
  className?: string;
  autoFocus?: boolean;
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
        inputMode={inputMode}
        maxLength={maxLength}
        autoFocus={autoFocus}
        value={values[name]}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={className}
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

/** Counts down from `seconds` each time `key` changes; 0 means ready. */
function useCountdown(key: number, seconds: number): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (key === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restarts the timer when a new code is sent
    setLeft(seconds);
    const timer = setInterval(() => setLeft((current) => (current <= 1 ? 0 : current - 1)), 1000);
    return () => clearInterval(timer);
  }, [key, seconds]);
  return left;
}

const COPY: Record<Mode, { title: string; subtitle: string }> = {
  login: { title: "Sign in", subtitle: "Sign in to rent tools and see your orders." },
  register: { title: "Create your account", subtitle: "Register to rent tools with your balance." },
  forgot: { title: "Reset your password", subtitle: "Enter your account email and we will send you a code." },
};

export function CustomerAuthForm({ mode }: { mode: Mode }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Set once a code was emailed: register and forgot then ask for it. */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const resendIn = useCountdown(sendCount, RESEND_SECONDS);

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const codeStep = codeSentTo !== null;

  const onChange = (name: keyof Values, value: string) => {
    const next = name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value;
    setValues((current) => ({ ...current, [name]: next }));
    setErrors((current) => clearFieldError(current, name));
  };

  function fail(submitError: unknown) {
    setError(errorMessage(submitError));
    setErrors(fieldErrorsOf(submitError));
  }

  /** Sends (or re-sends) the code for sign-up or password reset. */
  async function sendCode() {
    const body = isRegister
      ? { name: values.name, email: values.email, phone: values.phone, password: values.password, confirmPassword: values.confirmPassword }
      : { email: values.email };
    const data = await apiFetch<{ email: string }>(`/api/customer-auth/${isRegister ? "register" : "forgot"}`, {
      method: "POST",
      body,
    });
    setCodeSentTo(data.email);
    setSendCount((count) => count + 1);
    setValues((current) => ({ ...current, code: "" }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    setErrors({});
    try {
      if (mode === "login") {
        await apiFetch("/api/customer-auth/login", { method: "POST", body: { email: values.email, password: values.password } });
      } else if (!codeStep) {
        await sendCode();
        setBusy(false);
        return;
      } else if (isRegister) {
        await apiFetch("/api/customer-auth/register/verify", { method: "POST", body: { email: codeSentTo, code: values.code } });
      } else {
        await apiFetch("/api/customer-auth/reset", {
          method: "POST",
          body: { email: codeSentTo, code: values.code, password: values.password, confirmPassword: values.confirmPassword },
        });
      }
      // A full load, so the header and every page pick up the new session.
      window.location.href = safeNext();
    } catch (submitError) {
      fail(submitError);
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendCode();
      setNotice("A new code is on its way.");
    } catch (resendError) {
      fail(resendError);
    }
    setBusy(false);
  }

  function changeEmail() {
    setCodeSentTo(null);
    setError(null);
    setNotice(null);
    setErrors({});
    setValues((current) => ({ ...current, code: "", ...(isForgot ? { password: "", confirmPassword: "" } : {}) }));
  }

  const fieldProps = { values, errors, onChange };
  const { title, subtitle } = codeStep
    ? { title: isRegister ? "Verify your email" : "Set a new password", subtitle: "" }
    : COPY[mode];

  const submitLabel = busy
    ? "Please wait…"
    : mode === "login"
      ? "Sign in"
      : !codeStep
        ? isRegister
          ? "Create account"
          : "Send code"
        : isRegister
          ? "Verify & create account"
          : "Save new password";
  const SubmitIcon = mode === "login" ? LogIn : codeStep ? (isRegister ? MailCheck : KeyRound) : isRegister ? UserPlus : MailCheck;

  return (
    <form onSubmit={submit} noValidate className="neon-card w-full max-w-md space-y-4 p-6 sm:p-8">
      <div className="pb-1 text-center">
        {codeStep && (
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MailCheck aria-hidden className="size-6" />
          </span>
        )}
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        {codeStep ? (
          <p className="mt-1 text-sm text-muted">
            {isForgot ? "If an account uses " : "We sent a 6-digit code to "}
            <span className="font-semibold text-foreground">{codeSentTo}</span>
            {isForgot ? ", we sent it a 6-digit code." : "."} It expires in 10 minutes.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-status-offline/40 bg-status-offline/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-status-online/40 bg-status-online/10 px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      {codeStep ? (
        <>
          <Field
            label="Verification code"
            name="code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            className="neon-input text-center font-display text-2xl font-bold tracking-[0.5em]"
            {...fieldProps}
          />
          {isForgot && (
            <>
              <Field label="New password" name="password" type="password" autoComplete="new-password" {...fieldProps} />
              <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" {...fieldProps} />
            </>
          )}
        </>
      ) : (
        <>
          {isRegister && <Field label="Full name" name="name" autoComplete="name" {...fieldProps} />}
          <Field label="Email" name="email" type="email" autoComplete="email" {...fieldProps} />
          {isRegister && <Field label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" {...fieldProps} />}
          {!isForgot && (
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              {...fieldProps}
            />
          )}
          {isRegister && (
            <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" {...fieldProps} />
          )}
          {mode === "login" && (
            <p className="-mt-2 text-right text-sm">
              <Link href="/forgot-password" className="font-medium text-cyan hover:underline">
                Forgot password?
              </Link>
            </p>
          )}
        </>
      )}

      <button type="submit" disabled={busy} className="btn-neon w-full">
        <SubmitIcon aria-hidden className="size-4" />
        {submitLabel}
      </button>

      {codeStep ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <button type="button" onClick={changeEmail} className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-foreground">
            <ArrowLeft aria-hidden className="size-4" /> Change email
          </button>
          <button
            type="button"
            onClick={() => void resend()}
            disabled={busy || resendIn > 0}
            className="inline-flex items-center gap-1.5 font-medium text-cyan hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          >
            <RotateCw aria-hidden className="size-4" /> {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted">
          {isRegister ? "Already have an account? " : isForgot ? "Remembered it? " : "New here? "}
          <Link href={isRegister || isForgot ? "/login" : "/register"} className="font-medium text-cyan hover:underline">
            {isRegister || isForgot ? "Sign in" : "Create an account"}
          </Link>
        </p>
      )}
    </form>
  );
}
