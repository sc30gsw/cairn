import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { expect, test } from "vite-plus/test";

import { useIsTextTruncated } from "~/hooks/use-is-text-truncated";

function mockElement(partial: Partial<HTMLElement>): HTMLElement {
  return {
    clientHeight: 20,
    clientWidth: 100,
    scrollHeight: 20,
    scrollWidth: 100,
    ...partial,
  } as HTMLElement;
}

test("useIsTextTruncated は空文字では false", () => {
  const ref = createRef<HTMLElement>();
  ref.current = mockElement({ scrollWidth: 200, clientWidth: 50 });

  const { result } = renderHook(() => useIsTextTruncated(ref, ""));

  expect(result.current).toBe(false);
});

test("useIsTextTruncated は横方向の省略を検知する", () => {
  const ref = createRef<HTMLElement>();
  ref.current = mockElement({ scrollWidth: 200, clientWidth: 50 });

  const { result } = renderHook(() => useIsTextTruncated(ref, "長いテキスト"));

  expect(result.current).toBe(true);
});

test("useIsTextTruncated は縦方向の省略を検知する", () => {
  const ref = createRef<HTMLElement>();
  ref.current = mockElement({ scrollHeight: 40, clientHeight: 20 });

  const { result } = renderHook(() => useIsTextTruncated(ref, "複数行\nテキスト"));

  expect(result.current).toBe(true);
});

test("useIsTextTruncated は省略されていなければ false", () => {
  const ref = createRef<HTMLElement>();
  ref.current = mockElement({});

  const { result } = renderHook(() => useIsTextTruncated(ref, "短い"));

  expect(result.current).toBe(false);
});
