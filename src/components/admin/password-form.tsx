"use client";

import { useState, type FormEvent } from "react";
import { PageHeader, TextField } from "@/components/admin/form";
import { useToast } from "@/components/ui/toast";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function PasswordForm() {
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const set = (key: keyof typeof EMPTY, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch("/api/account/password", { method: "PUT", body: draft });
      setDraft(EMPTY);
      toast.success("Password changed. Other devices have been signed out.");
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Change password" description="Changing your password signs you out on every other device." />
      <form onSubmit={submit} noValidate className="admin-card max-w-md space-y-4 p-5">
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={draft.currentPassword}
          error={errors.currentPassword}
          onChange={(value) => set("currentPassword", value)}
          required
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 12 characters."
          value={draft.newPassword}
          error={errors.newPassword}
          onChange={(value) => set("newPassword", value)}
          required
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={draft.confirmPassword}
          error={errors.confirmPassword}
          onChange={(value) => set("confirmPassword", value)}
          required
        />
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </>
  );
}
