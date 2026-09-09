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
    querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
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

test("useIsTextTruncated は操作要素内で省略された子要素を検知する", () => {
  const child = mockElement({ clientWidth: 50, scrollWidth: 200 });
  const ref = createRef<HTMLElement>();
  ref.current = mockElement({
    querySelectorAll: () => [child] as unknown as NodeListOf<HTMLElement>,
  });

  const { result } = renderHook(() => useIsTextTruncated(ref, "長い予定名"));

  expect(result.current).toBe(true);
});
