"use client";

import { RefreshCw } from "lucide-react";

export default function PublicError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-28 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted">This page could not be loaded. Please try again.</p>
      <button type="button" onClick={reset} className="btn-neon">
        <RefreshCw aria-hidden className="size-4" /> Try again
      </button>
    </div>
  );
}
