"use client";

import { Mail, MailOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader } from "@/components/admin/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, errorMessage } from "@/lib/client-api";
import { formatDateTimeUtc } from "@/utils/format";
import type { ContactMessageDTO } from "@/types";

export function MessagesManager() {
  const { data, error, loading, reload, setData } = useResource<{ messages: ContactMessageDTO[] }>("/api/messages");
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ContactMessageDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const messages = data?.messages ?? [];
  const open = messages.find((message) => message.id === openId) ?? null;
  const unread = messages.filter((message) => !message.read).length;

  const setRead = (id: string, read: boolean) =>
    setData((current) =>
      current && { messages: current.messages.map((m) => (m.id === id ? { ...m, read } : m)) },
    );

  async function markRead(message: ContactMessageDTO, read: boolean, notify: boolean) {
    setRead(message.id, read);
    try {
      await apiFetch(`/api/messages/${message.id}`, { method: "PATCH", body: { read } });
      if (notify) toast.success(read ? "Marked as read." : "Marked as unread.");
    } catch (markError) {
      setRead(message.id, message.read);
      toast.error(errorMessage(markError));
    }
  }

  function view(message: ContactMessageDTO) {
    setOpenId(message.id);
    if (!message.read) void markRead(message, true, false);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/messages/${deleting.id}`, { method: "DELETE" });
      toast.success("Message deleted.");
      setDeleting(null);
      setOpenId(null);
      reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Messages" description={unread > 0 ? `${unread} unread` : "Enquiries sent from the contact form."} />

      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : messages.length === 0 ? (
        <AdminEmpty title="No messages yet" message="Messages sent from the contact form will appear here." />
      ) : (
        <ul className="admin-card divide-y divide-admin-line overflow-hidden">
          {messages.map((message) => (
            <li key={message.id} className="flex items-center gap-1 pr-2">
              <button type="button" onClick={() => view(message)} className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left hover:bg-admin-raised">
                {message.read ? (
                  <MailOpen aria-label="Read" className="mt-0.5 size-4 shrink-0 text-admin-muted" />
                ) : (
                  <Mail aria-label="Unread" className="mt-0.5 size-4 shrink-0 text-primary" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={message.read ? "" : "font-semibold"}>{message.name}</span>
                    <RelativeTime iso={message.createdAt} className="text-xs text-admin-muted" />
                  </span>
                  <span className={`block truncate text-sm ${message.read ? "text-admin-muted" : ""}`}>{message.subject}</span>
                </span>
              </button>
              <button type="button" aria-label={`Delete message from ${message.name}`} onClick={() => setDeleting(message)} className="admin-icon-btn hover:text-status-offline!">
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open !== null} onClose={() => setOpenId(null)} title={open?.subject ?? "Message"}>
        {open && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[4.5rem_1fr] gap-y-1">
              <dt className="text-admin-muted">From</dt>
              <dd>{open.name}</dd>
              <dt className="text-admin-muted">Email</dt>
              <dd className="break-all">
                <a href={`mailto:${open.email}`} className="text-primary hover:underline">
                  {open.email}
                </a>
              </dd>
              {open.phone && (
                <>
                  <dt className="text-admin-muted">Phone</dt>
                  <dd>
                    <a href={`tel:${open.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
                      {open.phone}
                    </a>
                  </dd>
                </>
              )}
              <dt className="text-admin-muted">Received</dt>
              <dd>{formatDateTimeUtc(open.createdAt)}</dd>
            </dl>
            <p className="rounded-lg bg-admin-bg p-4 break-words whitespace-pre-wrap">{open.message}</p>
            <div className="flex justify-between gap-2">
              <button type="button" onClick={() => void markRead(open, !open.read, true)} className="admin-btn admin-btn-secondary">
                {open.read ? "Mark as unread" : "Mark as read"}
              </button>
              <button type="button" onClick={() => setDeleting(open)} className="admin-btn admin-btn-danger">
                <Trash2 aria-hidden className="size-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete message?"
        message={`The message from ${deleting?.name} will be permanently removed.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
