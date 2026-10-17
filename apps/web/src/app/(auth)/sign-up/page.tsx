import { Suspense } from "react";
import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Tạo tài khoản · EvolveFit" };

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
