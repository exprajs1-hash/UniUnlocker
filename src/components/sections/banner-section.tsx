import { BannerSlider } from "@/components/sections/banner-slider";
import { Reveal } from "@/components/ui/reveal";
import { getEnabledBanners } from "@/lib/data";

/** Home page banner slider. Renders nothing until the admin shows at least one banner. */
export async function BannerSection() {
  const banners = await getEnabledBanners();
  if (banners.length === 0) return null;
  return (
    <section id="banners" aria-label="Featured" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <Reveal>
        <BannerSlider banners={banners} />
      </Reveal>
    </section>
  );
}
