import { BadgeCheck, CircleCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { SafeImage } from "@/components/ui/safe-image";
import { getAbout } from "@/lib/data";
import { STATUS_META } from "@/lib/server-status";

export async function AboutSection() {
  const about = await getAbout();
  const [lead, ...rest] = about.title.split(" ");
  const status = STATUS_META[about.online ? "online" : "offline"];
  return (
    <section id="about" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:grid-cols-2 lg:gap-14 lg:px-8">
      <Reveal>
        <div className="neon-card relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden lg:max-w-md">
          <SafeImage
            src={about.image}
            alt={about.title}
            fill
            sizes="(min-width: 1024px) 448px, 384px"
            className="object-cover object-top"
          />
          <div aria-hidden className="photo-tint" />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex items-center gap-4">
          {about.profileImage && (
            <SafeImage src={about.profileImage} alt="" width={64} height={64} className="size-16 rounded-full border-2 border-cyan object-cover" />
          )}
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              {rest.length > 0 ? (
                <>
                  {lead} <span className="text-neon">{rest.join(" ")}</span>
                </>
              ) : (
                <span className="text-neon">{lead}</span>
              )}
            </h2>
            <span aria-hidden className="mt-2 block h-1 w-20 rounded bg-cyan shadow-[0_0_10px_var(--cyan)]" />
          </div>
        </div>

        <p className={`mt-5 inline-flex items-center gap-2 rounded-full border bg-surface/70 px-3 py-1 text-sm font-medium ${status.border} ${status.text}`}>
          <span aria-hidden className="relative flex size-2.5">
            {about.online && <span className={`absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping ${status.dot}`} />}
            <span className={`relative inline-flex size-2.5 rounded-full ${status.dot}`} />
          </span>
          {status.label}
        </p>

        <p className="mt-5 leading-relaxed whitespace-pre-line text-foreground/90">{about.description}</p>

        {about.experience && (
          <p className="mt-4 inline-flex items-center gap-2 font-medium text-cyan">
            <BadgeCheck aria-hidden className="size-5" /> {about.experience}
          </p>
        )}

        {about.features.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {about.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <CircleCheck aria-hidden className="size-5 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        {about.skills.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {about.skills.map((skill) => (
              <li key={skill} className="rounded-full border border-line bg-surface/70 px-3 py-1 text-sm">
                {skill}
              </li>
            ))}
          </ul>
        )}

        {about.signature && (
          <p aria-hidden className="text-neon mt-5 -rotate-3 text-right font-serif text-4xl italic">
            {about.signature}
          </p>
        )}
      </Reveal>
    </section>
  );
}
