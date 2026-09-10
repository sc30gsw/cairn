import type { DbClient } from "@tanstack/db";
import { DbProvider } from "@tanstack/react-db";
import type { ReactNode } from "react";

type TanStackDbProviderProps = {
  children: ReactNode;
  client: DbClient;
};

export function TanStackDbProvider({ children, client }: TanStackDbProviderProps) {
  return <DbProvider client={client}>{children}</DbProvider>;
}
