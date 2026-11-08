import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/sections/contact-form";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { BrandIcon, SocialLinkList } from "@/components/ui/social-icons";
import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/utils/format";

export async function ContactSection() {
  const { contactEmail, contactPhone, contactAddress, whatsappNumber, social, siteName } = await getSettings();
  return (
    <section id="contact" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <Reveal>
        <SectionHeading lead="Get In" highlight="Touch" subtitle="Tell me about your device or project" />
      </Reveal>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_1.5fr]">
        <Reveal className="neon-card flex flex-col gap-5 p-6 sm:p-8">
          <div>
            <h3 className="font-display text-xl font-semibold">Let&apos;s work together</h3>
            <p className="mt-2 text-sm text-muted">Send a message and I will reply as soon as I can.</p>
          </div>
          <ul className="space-y-3 text-sm">
            {contactEmail && (
              <li>
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 break-all hover:text-cyan">
                  <Mail aria-hidden className="size-5 shrink-0 text-cyan" /> {contactEmail}
                </a>
              </li>
            )}
            {contactPhone && (
              <li>
                <a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 hover:text-cyan">
                  <Phone aria-hidden className="size-5 shrink-0 text-cyan" /> {contactPhone}
                </a>
              </li>
            )}
            {contactAddress && (
              <li className="flex items-center gap-3">
                <MapPin aria-hidden className="size-5 shrink-0 text-cyan" /> {contactAddress}
              </li>
            )}
          </ul>
          {whatsappNumber && (
            <a
              href={whatsappLink(whatsappNumber, `Hello ${siteName}, I would like to ask about your services.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline self-start border-status-online/70! hover:shadow-[0_0_20px_rgb(43_234_92/0.45)]!"
            >
              <BrandIcon name="whatsapp" className="size-5 text-status-online" /> Chat on WhatsApp
            </a>
          )}
          <div className="mt-auto">
            <SocialLinkList social={social} />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="neon-card p-6 sm:p-8">
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
