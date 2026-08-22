import type { AppShellUser } from "~/types/session";

export function userLabel(user: AppShellUser): string {
  if (user.name !== null && user.name !== undefined && user.name !== "") {
    return user.name;
  }
  if (user.email !== null && user.email !== undefined && user.email !== "") {
    return user.email;
  }
  return "アカウント";
}
