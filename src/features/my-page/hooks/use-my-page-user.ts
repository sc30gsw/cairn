import { useAppShellUser } from "~/hooks/use-auth-session";

export function useMyPageUser() {
  const user = useAppShellUser();
  if (user === null) {
    throw new Error("My page requires an authenticated user");
  }
  return user;
}
