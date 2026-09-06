import type { ReactNode } from "react";

import { GoogleIcon } from "~/components/google-icon";

export function GoogleLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <GoogleIcon />
      <span>{children}</span>
    </span>
  );
}
