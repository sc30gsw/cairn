import { useAppShellUser } from "~/hooks/use-auth-session";

/** Authenticated user for my-page sections rendered under OwnerGate. */
export function useMyPageUser() {
  const user = useAppShellUser();
  if (user === null) {
    throw new Error("My page requires an authenticated user");
  }
  return user;
}
