import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetail } from "@/components/rent/order-detail";

type Props = PageProps<"/account/orders/[id]">;

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

/** `params` is request data, so it is read inside Suspense; the page shell still prerenders. */
async function Detail({ params }: Pick<Props, "params">) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}

export default function OrderDetailPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 lg:px-8">
      <Suspense
        fallback={
          <div role="status" aria-label="Loading" className="space-y-4">
            <div className="skeleton h-80" />
            <div className="skeleton h-56" />
          </div>
        }
      >
        <Detail params={params} />
      </Suspense>
    </div>
  );
}
