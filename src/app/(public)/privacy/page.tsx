import type { Metadata } from "next";
import { DynamicMarker } from "@/components/ui/dynamic-marker";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How this website handles the information you share through it.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 px-5 py-16 leading-relaxed text-muted lg:px-8">
      <DynamicMarker />
      <h1 className="font-display text-4xl font-bold text-foreground">Privacy Policy</h1>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Information you send</h2>
      <p>
        When you use the contact form, the name, email address, phone number, subject and message you
        enter are stored so your enquiry can be answered. They are used only for that purpose and are
        not sold.
      </p>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Abuse prevention</h2>
      <p>
        To limit spam, a one-way hash of your IP address is kept for a few minutes after you submit the
        form. The original address is not stored with it.
      </p>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Cookies</h2>
      <p>
        Public pages set no tracking cookies. A single secure cookie is used to keep site administrators
        signed in to the admin panel.
      </p>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Third-party content</h2>
      <p>
        Images are served through Pexels and Cloudinary. If an introduction video is shown, it loads from
        YouTube only after you choose to play it.
      </p>
      <h2 className="pt-3 font-display text-xl font-semibold text-foreground">Your requests</h2>
      <p>To ask for your message to be corrected or deleted, get in touch using the contact form.</p>
    </article>
  );
}
