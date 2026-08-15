import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { cleanup, render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import "dayjs/locale/ja";
import { afterEach, vi } from "vite-plus/test";

import { cssVariablesResolver, theme } from "~/lib/theme";

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

HTMLElement.prototype.hasPointerCapture ??= () => false;
HTMLElement.prototype.releasePointerCapture ??= () => undefined;
HTMLElement.prototype.scrollIntoView ??= () => undefined;
HTMLElement.prototype.setPointerCapture ??= () => undefined;

afterEach(() => {
  cleanup();
});

function Wrapper({ children }: Record<"children", ReactNode>) {
  return (
    <MantineProvider
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
      forceColorScheme="light"
      theme={theme}
    >
      <ModalsProvider labels={{ cancel: "キャンセル", confirm: "見送りにする" }}>
        <DatesProvider settings={{ locale: "ja" }}>{children}</DatesProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export function renderWithMantine(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Wrapper, ...options });
}
