import { Loader } from "@mantine/core";
import type { ReactNode } from "react";

import { AppShell } from "~/components/app-shell";
import { LoginScreen } from "~/features/auth/components/login-screen";
import { authClient } from "~/lib/auth-client";

export function OwnerGate({ children }: Record<"children", ReactNode>) {
  const session = authClient.useSession();

  if (session.isPending) {
    return <Loader aria-label="読み込み中" />;
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
    >
      {children}
    </AppShell>
  );
}
