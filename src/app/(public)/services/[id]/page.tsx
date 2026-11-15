import type { Metadata } from "next";
import { Suspense } from "react";
import { RentServiceDetail } from "@/components/rent/rent-service-detail";

type Props = PageProps<"/rent/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Rent a tool",
    description: "Rent this unlock tool, paid from your UniUnlocker balance. Your login appears in your account once it is ready.",
    alternates: { canonical: `/rent/${id}` },
  };
}

/** `params` is request data, so it is read inside Suspense; the page shell still prerenders. */
async function Detail({ params }: Pick<Props, "params">) {
  const { id } = await params;
  return <RentServiceDetail id={id} />;
}

export default function RentServicePage({ params }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 lg:px-8">
      <Suspense
        fallback={
          <div role="status" aria-label="Loading" className="space-y-4">
            <div className="skeleton h-48" />
            <div className="skeleton h-96" />
          </div>
        }
      >
        <Detail params={params} />
      </Suspense>
    </div>
  );
}
