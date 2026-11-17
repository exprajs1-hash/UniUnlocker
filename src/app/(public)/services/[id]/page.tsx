import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryPage, categoryMetadata } from "@/components/rent/category-page";
import { RentServiceDetail } from "@/components/rent/rent-service-detail";
import { isServiceId } from "@/lib/service-categories";

type Props = PageProps<"/services/[id]">;

/**
 * /services/<24-hex id> is one service; anything else is a category page
 * (/services/rent, /services/imei, /services/remote-service…). Category slugs can
 * never look like an id, so the two never clash.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isServiceId(id)) return categoryMetadata(id);
  return {
    title: "Rent a tool",
    description: "Rent this unlock tool, paid from your UniUnlocker balance. Your login appears in your account once it is ready.",
    alternates: { canonical: `/services/${id}` },
  };
}

/** `params` is request data, so it is read inside Suspense; the page shell still prerenders. */
async function Content({ params }: Pick<Props, "params">) {
  const { id } = await params;
  if (!isServiceId(id)) return <CategoryPage slug={id} />;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 lg:px-8">
      <RentServiceDetail id={id} />
    </div>
  );
}

export default function ServicesEntryPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading" className="mx-auto max-w-7xl space-y-4 px-5 py-10 lg:px-8">
          <div className="skeleton h-48" />
          <div className="skeleton h-96" />
        </div>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
