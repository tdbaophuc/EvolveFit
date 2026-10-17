import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Đăng nhập · EvolveFit" };

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
