import type { authClient } from "~/lib/auth-client";

export type SessionUser = typeof authClient.$Infer.Session.user;
export type AppShellUser = Pick<SessionUser, "email" | "image" | "name">;
