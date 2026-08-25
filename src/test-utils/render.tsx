import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { ShimmerProvider } from "@shimmer-from-structure/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Suspense, useSyncExternalStore } from "react";
import "dayjs/locale/ja";
import { afterEach, vi } from "vite-plus/test";

import { PresetSearchSchema } from "~/features/catalog/schemas/preset-search-schema";
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

//? happy-dom has no FontFaceSet. Mantine's autosizing Textarea (react-textarea-autosize)
//? listens for `document.fonts.loadingdone` unconditionally, which otherwise throws on mount.
(document as unknown as { fonts: Document["fonts"] }).fonts ??= {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
} as unknown as Document["fonts"];

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
        <DatesProvider settings={{ locale: "ja" }}>
          <ShimmerProvider>
            <Suspense fallback={null}>{children}</Suspense>
          </ShimmerProvider>
        </DatesProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export function renderWithMantine(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Wrapper, ...options });
}

//? rerender は RouterProvider ごと差し替える必要がある(素の要素を render し直すと
//? ルーター外になり getRouteApi().useSearch() が null store で落ちる)。外部ストアに
//? 現在の要素を持たせ、Page がそれを購読することで memo 化に関係なく更新が届く。
function createElementStore(initial: ReactElement) {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next: ReactElement) {
      current = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export async function renderWithMemoryRouter(
  ui: ReactElement,
  initialEntry = "/",
  options?: Omit<RenderOptions, "wrapper">,
) {
  const store = createElementStore(ui);
  const rootRoute = createRootRoute({
    component: function Root() {
      return <Outlet />;
    },
  });
  function Page() {
    return useSyncExternalStore(store.subscribe, store.get, store.get);
  }
  const indexRoute = createRoute({
    component: Page,
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const presetsRoute = createRoute({
    component: Page,
    getParentRoute: () => rootRoute,
    path: "/presets",
    validateSearch: PresetSearchSchema,
  });
  const routeTree = rootRoute.addChildren([indexRoute, presetsRoute]);
  const router = createRouter({
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree,
  });
  await router.load();

  const result = render(<RouterProvider router={router} />, { wrapper: Wrapper, ...options });

  return {
    ...result,
    rerender(next: ReactElement) {
      act(() => {
        store.set(next);
      });
    },
  };
}
