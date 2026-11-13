import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/rent/customer-auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default function CustomerLoginPage() {
  return (
    <div className="flex justify-center px-5 py-16">
      <CustomerAuthForm mode="login" />
    </div>
  );
}
