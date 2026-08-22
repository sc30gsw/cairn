import { authClient } from "~/lib/auth-client";
import type { AppShellUser } from "~/types/session";

export function useAuthSession() {
  return authClient.useSession();
}

function selectAppShellUser(
  session: ReturnType<typeof authClient.useSession>["data"],
): AppShellUser | null {
  if (session === null || session === undefined) {
    return null;
  }

  return {
    email: session.user.email,
    image: session.user.image,
    name: session.user.name,
  };
}

export function useAppShellUser(): AppShellUser | null {
  const session = useAuthSession();
  return selectAppShellUser(session.data);
}
