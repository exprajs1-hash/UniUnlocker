import type { Metadata } from "next";
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

export default async function RentServicePage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 lg:px-8">
      <RentServiceDetail id={id} />
    </div>
  );
}
