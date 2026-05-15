/**
 * Lumen — sign-up route. Themed via <ClerkProvider appearance>.
 */

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16">
      <SignUp />
    </main>
  );
}
