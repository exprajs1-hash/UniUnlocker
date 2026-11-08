"use client";

import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/toast";
import { contactSchema } from "@/lib/validations";

type Errors = Record<string, string>;

function Field({
  label,
  name,
  error,
  required,
  type = "text",
  autoComplete,
  textarea,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  textarea?: boolean;
}) {
  const id = `contact-${name}`;
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    required,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    className: "neon-input",
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span aria-hidden className="text-cyan"> *</span>}
      </label>
      {textarea ? <textarea rows={5} {...shared} /> : <input type={type} autoComplete={autoComplete} {...shared} />}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-status-offline">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const parsed = contactSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      const fields: Errors = {};
      for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
      setErrors(fields);
      return;
    }

    setErrors({});
    setSent(false);
    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Errors;
      };
      if (!response.ok) {
        setErrors(body.fieldErrors ?? {});
        toast.error(body.error ?? "Your message could not be sent. Please try again.");
        return;
      }
      form.reset();
      setSent(true);
      toast.success("Thanks! Your message has been sent.");
    } catch {
      toast.error("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" name="name" required autoComplete="name" error={errors.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={errors.email} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" error={errors.phone} />
      <Field label="Subject" name="subject" required error={errors.subject} />
      <div className="sm:col-span-2">
        <Field label="Message" name="message" required textarea error={errors.message} />
      </div>
      {/* Honeypot: invisible to people and skipped by keyboards, but tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={sending} className="btn-neon">
          <Send aria-hidden className="size-4" /> {sending ? "Sending…" : "Send Message"}
        </button>
        {sent && (
          <p role="status" className="text-sm text-status-online">
            Message sent. I will get back to you soon.
          </p>
        )}
      </div>
    </form>
  );
}
