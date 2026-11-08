"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ListSkeleton, LoadError, PageHeader, TextAreaField, TextField } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { SocialLinks, WebsiteSettingsDTO } from "@/types";

const SOCIAL_FIELDS: Array<{ key: keyof SocialLinks; label: string }> = [
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "x", label: "X" },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="admin-card space-y-4 p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-admin-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SettingsEditor({ initial }: { initial: WebsiteSettingsDTO }) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const set = <K extends keyof WebsiteSettingsDTO>(key: K, value: WebsiteSettingsDTO[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch("/api/settings", { method: "PUT", body: draft });
      toast.success("Settings saved.");
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const text = (key: Exclude<keyof WebsiteSettingsDTO, "social" | "usdToBdtRate">, label: string, hint?: string, placeholder?: string) => (
    <TextField label={label} value={draft[key]} error={errors[key]} hint={hint} placeholder={placeholder} onChange={(value) => set(key, value)} />
  );

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-5">
      <Section title="Branding">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("siteName", "Website name")}
          {text("tagline", "Tagline")}
        </div>
        <ImageField label="Logo" value={draft.logo} error={errors.logo} hint="Leave blank to use the built-in neon mark." onChange={(value) => set("logo", value)} />
        <ImageField label="Favicon" value={draft.favicon} error={errors.favicon} hint="Leave blank to use the default icon." onChange={(value) => set("favicon", value)} />
      </Section>

      <Section title="Hero section">
        {text("heroEyebrow", "Small heading")}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("heroTitle", "Hero title")}
          {text("heroHighlight", "Highlighted title")}
        </div>
        {text("heroSubtitle", "Subtitle")}
        <TextAreaField label="Hero description" rows={3} value={draft.heroDescription} error={errors.heroDescription} onChange={(value) => set("heroDescription", value)} />
        {text("heroVideoUrl", "Watch Video link", "A YouTube link, or a direct link to a video file.", "https://")}
      </Section>

      <Section title="Contact information" description="Blank fields are hidden on the website.">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("contactEmail", "Email")}
          {text("contactPhone", "Phone")}
        </div>
        {text("contactAddress", "Address")}
        {text("whatsappNumber", "WhatsApp number", "International format, e.g. +8801700000000. Blank hides the WhatsApp button.")}
        {text("telegramUsername", "Telegram username", "Your username without @, or a t.me link. Blank hides the Telegram button.", "uniunlocker")}
      </Section>

      <Section title="Server prices" description="Each server price is entered in one currency; the other is calculated from this rate.">
        <TextField
          label="1 USD = ? BDT"
          type="number"
          placeholder="130"
          hint="Example: 130 means $1 shows as ৳130 and ৳260 shows as $2. When the dollar rate changes, update it here and every server updates."
          value={Number.isFinite(draft.usdToBdtRate) ? String(draft.usdToBdtRate) : ""}
          onChange={(value) => set("usdToBdtRate", value === "" ? Number.NaN : Number(value))}
          error={errors.usdToBdtRate}
        />
      </Section>

      <Section title="Header buttons">
        {text("driverUrl", "Get Driver link", "Where the Get Driver button goes (e.g. a Google Drive or download page). Blank hides the button.", "https://")}
      </Section>

      <Section title="Social links" description="Only networks with a link are shown on the website.">
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map(({ key, label }) => (
            <TextField
              key={key}
              label={label}
              value={draft.social[key]}
              error={errors[`social.${key}`]}
              placeholder="https://"
              onChange={(value) => {
                set("social", { ...draft.social, [key]: value });
                setErrors((current) => clearFieldError(current, `social.${key}`));
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="Footer">
        {text("footerText", "Footer text", "Shown after the copyright notice.")}
      </Section>

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

export function SettingsForm() {
  const { data, error, loading, reload } = useResource<{ settings: WebsiteSettingsDTO }>("/api/settings");
  return (
    <>
      <PageHeader title="Website settings" description="Changes go live on the website as soon as you save." />
      {loading ? (
        <ListSkeleton rows={3} />
      ) : data ? (
        <SettingsEditor initial={data.settings} />
      ) : (
        <LoadError message={error ?? "Could not load settings."} onRetry={reload} />
      )}
    </>
  );
}
