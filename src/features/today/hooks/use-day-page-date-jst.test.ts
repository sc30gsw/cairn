import { renderHook } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { useDayPageDateJst } from "~/features/today/hooks/use-day-page-date-jst";

const matchRoute = vi.fn<() => false | { dateJst: string }>(() => false);

vi.mock("@tanstack/react-router", () => ({
  useMatchRoute: () => matchRoute,
}));

vi.mock("~domain/jst", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~domain/jst")>();
  return {
    ...actual,
    todayJst: () => "2026-08-17",
  };
});

test("useDayPageDateJst は /days/$dateJst の params を返す", () => {
  matchRoute.mockReturnValue({ dateJst: "2026-08-15" });

  const { result } = renderHook(() => useDayPageDateJst());

  expect(result.current).toBe("2026-08-15");
});

test("useDayPageDateJst は / では todayJst を返す", () => {
  matchRoute.mockReturnValue(false);

  const { result } = renderHook(() => useDayPageDateJst());

  expect(result.current).toBe("2026-08-17");
});
