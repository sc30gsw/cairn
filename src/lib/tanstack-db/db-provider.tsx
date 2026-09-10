import type { DbClient } from "@tanstack/db";
import { DbProvider } from "@tanstack/react-db";
import { useSyncExternalStore, type ReactNode } from "react";

export function TanStackDbProvider({
  client,
  children,
}: {
  client: DbClient;
  children: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!mounted) return children;
  return <DbProvider client={client}>{children}</DbProvider>;
}
