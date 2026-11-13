import type { Metadata } from "next";
import { RentOrdersManager } from "@/components/admin/rent-orders-manager";

export const metadata: Metadata = { title: "Rent orders" };

export default function Page() {
  return <RentOrdersManager />;
}
