import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { cleanup, render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import "dayjs/locale/ja";
import { afterEach, vi } from "vite-plus/test";

import { theme } from "~/lib/theme";

Object.defineProperty(window, "matchMedia", {
  value: (query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }),
  writable: true,
});

class ResizeObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(window, "ResizeObserver", {
  value: ResizeObserverStub,
  writable: true,
});

afterEach(() => {
  cleanup();
});

function Wrapper({ children }: Record<"children", ReactNode>) {
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <DatesProvider settings={{ locale: "ja" }}>{children}</DatesProvider>
    </MantineProvider>
  );
}

export function renderWithMantine(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Wrapper, ...options });
}
