import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply to using the UniUnlocker website and its services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 px-5 py-16 leading-relaxed text-muted lg:px-8">
      <h1 className="font-display text-4xl font-bold text-foreground">Terms of Service</h1>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Using this website</h2>
      <p>
        The content on this website is provided for general information about the services on offer. It
        may change at any time without notice.
      </p>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Device ownership</h2>
      <p>
        Unlocking and account recovery work is only carried out on devices you own or are authorized to
        service. Proof of ownership may be requested, and work may be declined without it.
      </p>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Service availability</h2>
      <p>
        Server status is shown for convenience and is updated by hand. Availability is not guaranteed and
        may change without notice.
      </p>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Limitation of liability</h2>
      <p>
        Back up your data before any software work. To the extent the law allows, liability for data loss
        or device issues arising from service work is limited to the fee paid for that work.
      </p>
    </article>
  );
}
