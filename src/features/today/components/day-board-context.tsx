import { createContext, use, type ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import type { DayPage } from "~/features/today/types/day";
import type { ItemDto, PresetDto } from "~/types/item";

export type DayBoardContextValue = {
  dateJst: DateJst;
  day: DayPage;
  items: ItemDto[];
  onConfirmedCategory: (category: string) => void;
  presetFromSearch?: DaySearch["preset"];
  presets: PresetDto[];
  remainderMessage: string | null;
  todayJst: DateJst;
};

const DayBoardContext = createContext<DayBoardContextValue | null>(null);

export function DayBoardProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DayBoardContextValue;
}) {
  return <DayBoardContext value={value}>{children}</DayBoardContext>;
}

export function useOptionalDayBoardContext(): DayBoardContextValue | null {
  return use(DayBoardContext);
}
