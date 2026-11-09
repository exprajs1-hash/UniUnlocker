"use client";

import { useState } from "react";
import { Toggle } from "@/components/admin/form";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { AboutDTO } from "@/types";

/** Saves immediately, and sets the Online/Offline badge in the website's About section. */
export function OnlineToggle() {
  const { data, setData } = useResource<{ about: AboutDTO }>("/api/about");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!data) return null;
  const online = data.about.online;

  async function change(value: boolean) {
    const apply = (next: boolean) =>
      setData((current) => current && { about: { ...current.about, online: next } });
    apply(value);
    setBusy(true);
    try {
      await apiFetch("/api/about", { method: "PATCH", body: { online: value } });
      toast.success(value ? "You are now Online on the website." : "You are now Offline on the website.");
    } catch (error) {
      apply(!value);
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return <Toggle label={online ? "Online" : "Offline"} checked={online} disabled={busy} onChange={(value) => void change(value)} />;
}
