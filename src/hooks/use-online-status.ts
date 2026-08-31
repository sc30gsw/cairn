import { useNetwork } from "@mantine/hooks";

export function useOnlineStatus(): boolean {
  const { online } = useNetwork();
  return online;
}
