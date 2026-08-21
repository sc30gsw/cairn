import type { ReactNode } from "react";

import { AppShell } from "~/components/app-shell";
import { PendingComponent } from "~/components/pending-component";
import { LoginScreen } from "~/features/auth/components/login-screen";
import { authClient } from "~/lib/auth-client";
import { devEmailAuthEnabled } from "~/lib/dev-auth";
import { notionOAuthConfigured } from "~/lib/notion-auth";
import type { AppShellUser } from "~/types/session";

export function OwnerGate({ children }: Record<"children", ReactNode>) {
  const session = authClient.useSession();
  const showDevEmailAuth = devEmailAuthEnabled;

  if (session.isPending) {
    return <PendingComponent />;
  }

  if (!session.data) {
    return (
      <LoginScreen
        onNotionSignIn={() => {
          void authClient.signIn.social({ provider: "notion" });
        }}
        showDevEmailAuth={showDevEmailAuth}
        showNotionSignIn={notionOAuthConfigured}
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
      user={
        {
          email: session.data.user.email,
          image: session.data.user.image,
          name: session.data.user.name,
        } satisfies AppShellUser
      }
    >
      {children}
    </AppShell>
  );
}
