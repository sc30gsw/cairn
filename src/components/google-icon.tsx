import type { ComponentPropsWithoutRef } from "react";

import { cn } from "~/lib/utils";

export function GoogleIcon({
  className,
  size = 18,
}: Pick<ComponentPropsWithoutRef<"img">, "className"> & { size?: number }) {
  return (
    <img
      alt=""
      aria-hidden
      className={cn("shrink-0 rounded-full bg-white object-contain p-px", className)}
      draggable={false}
      height={size}
      src="/icons/google-g.png"
      width={size}
    />
  );
}
