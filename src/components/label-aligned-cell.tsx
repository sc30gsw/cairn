import { Input } from "@mantine/core";
import type { ReactNode } from "react";

type LabelAlignedCellProps = {
  children: ReactNode;
  description?: ReactNode;
};

export function LabelAlignedCell({ children, description }: LabelAlignedCellProps) {
  return (
    <Input.Wrapper description={description} label=" ">
      {children}
    </Input.Wrapper>
  );
}
