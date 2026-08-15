import type { ReactNode } from "react";

import { AppShell } from "~/components/app-shell";
import { PendingComponent } from "~/components/pending-component";
import { LoginScreen } from "~/features/auth/components/login-screen";
import { authClient } from "~/lib/auth-client";

export function OwnerGate({ children }: Record<"children", ReactNode>) {
  const session = authClient.useSession();

  if (session.isPending) {
    return <PendingComponent />;
  }

  if (!session.data) {
    return (
      <LoginScreen
        onSignIn={() => {
          void authClient.signIn.social({ provider: "notion" });
        }}
      />
    );
  }

  return (
    <AppShell
      onSignOut={() => {
        void authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              location.reload();
            },
          },
        });
      }}
      user={{
        email: session.data.user.email,
        image: session.data.user.image,
        name: session.data.user.name,
      }}
    >
      {children}
    </AppShell>
  );
}
