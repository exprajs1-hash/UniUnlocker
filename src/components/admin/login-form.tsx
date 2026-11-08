"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TextField } from "@/components/admin/form";
import { apiFetch, errorMessage, fieldErrorsOf } from "@/lib/client-api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
      // Next keeps this page mounted but hidden after navigating, so clear the password.
      setPassword("");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(errorMessage(loginError));
      setFields(fieldErrorsOf(loginError));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="admin-card w-full max-w-sm space-y-4 p-7">
      <div className="flex flex-col items-center gap-2 pb-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <LockKeyhole aria-hidden className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">Admin sign in</h1>
        <p className="text-sm text-admin-muted">Manage your website content.</p>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-status-offline/40 bg-status-offline/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <TextField label="Email" type="email" value={email} onChange={setEmail} error={fields.email} required />
      <TextField label="Password" type="password" value={password} onChange={setPassword} error={fields.password} required />
      <button type="submit" disabled={busy} className="admin-btn admin-btn-primary w-full">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
