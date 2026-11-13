import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/rent/customer-auth-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free UniUnlocker account to rent mobile unlock tools.",
  alternates: { canonical: "/register" },
};

export default function CustomerRegisterPage() {
  return (
    <div className="flex justify-center px-5 py-16">
      <CustomerAuthForm mode="register" />
    </div>
  );
}
