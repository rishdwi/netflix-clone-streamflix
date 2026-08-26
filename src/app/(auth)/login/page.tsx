// LOGIN PAGE — the middleware bounces signed-in users to /browse before this renders.
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
