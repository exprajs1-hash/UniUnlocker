import { Smartphone } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-bg flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <Smartphone aria-hidden className="size-14 text-cyan" />
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="max-w-md text-muted">The page you are looking for has moved or no longer exists.</p>
      <Link href="/" className="btn-neon">
        Back to home
      </Link>
    </main>
  );
}
