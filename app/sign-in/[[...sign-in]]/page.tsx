/**
 * Lumen — sign-in route.
 * Clerk-hosted form themed to Liquid Glass via <ClerkProvider appearance> in root layout.
 */

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16">
      <SignIn />
    </main>
  );
}
