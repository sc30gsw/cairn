import type { ReactNode } from "react";

import { AppShell } from "~/components/app-shell";
import { PendingComponent } from "~/components/pending-component";
import { AuthAccountMenu } from "~/features/auth/components/auth-account-menu";
import { LoginScreen } from "~/features/auth/components/login-screen";
import { PasskeySignupPromptGate } from "~/features/auth/components/passkey-signup-prompt-gate";
import { useAuthSession } from "~/hooks/use-auth-session";

export function OwnerGate({ children }: Record<"children", ReactNode>) {
  const session = useAuthSession();

  if (session.isPending) {
    return <PendingComponent />;
  }

  if (!session.data) {
    return <LoginScreen />;
  }

  return (
    <>
      <AppShell accountMenu={<AuthAccountMenu />}>{children}</AppShell>
      <PasskeySignupPromptGate />
    </>
  );
}
