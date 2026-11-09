import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";

export const metadata: Metadata = { title: "Change password" };

export default function PasswordPage() {
  return <PasswordForm />;
}
