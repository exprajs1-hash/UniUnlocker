import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/rent/customer-auth-form";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex justify-center px-5 py-16">
      <CustomerAuthForm mode="forgot" />
    </div>
  );
}
