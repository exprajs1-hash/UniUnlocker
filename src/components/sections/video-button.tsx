"use client";

import { CirclePlay, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { youtubeEmbedUrl } from "@/utils/format";

function VideoPlayer({ url }: { url: string }) {
  const embed = youtubeEmbedUrl(url);
  if (embed) {
    return (
      <iframe
        src={embed}
        title="Introduction video"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="size-full"
      />
    );
  }
  return <video src={url} controls autoPlay className="size-full bg-black" />;
}

export function VideoButton({ url, contactHref }: { url: string; contactHref: string | null }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-neon">
        <CirclePlay aria-hidden className="size-6" /> Watch Video
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Introduction video"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="neon-card m-auto w-[min(56rem,calc(100vw-2rem))] overflow-hidden p-0 text-foreground"
      >
        {open && (
          <>
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-display font-semibold">Introduction video</h2>
              <button type="button" aria-label="Close video" onClick={() => setOpen(false)} className="hover:text-cyan">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            {url ? (
              <div className="aspect-video">
                <VideoPlayer url={url} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-10 text-center">
                <CirclePlay aria-hidden className="size-12 text-cyan" />
                <p className="text-muted">
                  The introduction video is coming soon.{contactHref && " In the meantime, feel free to get in touch."}
                </p>
                {contactHref && (
                  <a
                    href={contactHref}
                    target={contactHref.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="btn-neon"
                  >
                    Contact me
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
