/// <reference types="vite-plus/client" />
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { ShimmerProvider } from "@shimmer-from-structure/react";
import type { QueryClient } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import "dayjs/locale/ja";
import { createServerFn } from "@tanstack/react-start";
import { Suspense, lazy, type ReactNode } from "react";

import { FullPageErrorState } from "~/components/error-state";
import { NotFoundState } from "~/components/not-found-state";
import { PendingComponent } from "~/components/pending-component";
import { authClient } from "~/lib/auth-client";
import { getToken } from "~/lib/auth-server";
import { cssVariablesResolver, theme } from "~/lib/theme";

import appCss from "~/styles.css?url";

const DEFAULT_COLOR_SCHEME = "light";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const { TanStackRouterDevtools } = await import("~/router-devtools");
      return { default: TanStackRouterDevtools };
    })
  : null;

export const Route = createRootRouteWithContext<{
  convexQueryClient: ConvexQueryClient;
  queryClient: QueryClient;
}>()({
  beforeLoad: async (ctx) => {
    const token = await getAuth();
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return { isAuthenticated: Boolean(token), token };
  },
  component: RootComponent,
  errorComponent: RootErrorComponent,
  head: () => ({
    links: [
      { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      { crossOrigin: "anonymous", href: "https://fonts.gstatic.com", rel: "preconnect" },
      {
        href: "https://fonts.googleapis.com/css2?family=Yomogi&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap",
        rel: "stylesheet",
      },
      { href: appCss, rel: "stylesheet" },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "学習ログ" },
    ],
  }),
  notFoundComponent: RootNotFoundComponent,
  pendingComponent: RootPendingComponent,
});

function RootDocument({ children }: Record<"children", ReactNode>) {
  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme={DEFAULT_COLOR_SCHEME} forceColorScheme="light" />
        <HeadContent />
      </head>
      <body>
        <MantineProvider
          cssVariablesResolver={cssVariablesResolver}
          defaultColorScheme={DEFAULT_COLOR_SCHEME}
          forceColorScheme="light"
          theme={theme}
        >
          <ShimmerProvider
            config={{
              backgroundColor: "var(--inset)",
              duration: 2,
              fallbackBorderRadius: 8,
              shimmerColor: "var(--bd2)",
            }}
          >
            <ModalsProvider labels={{ cancel: "キャンセル", confirm: "見送りにする" }}>
              <DatesProvider settings={{ locale: "ja" }}>{children}</DatesProvider>
            </ModalsProvider>
            <Notifications position="top-right" />
          </ShimmerProvider>
          {TanStackRouterDevtools ? (
            <Suspense fallback={null}>
              <TanStackRouterDevtools position="bottom-right" />
            </Suspense>
          ) : null}
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      //? Better Auth の client ジェネリクスと Provider の AuthClient が食い違う。
      authClient={authClient as unknown as AuthClient}
      client={context.convexQueryClient.convexClient}
      initialToken={context.token}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ConvexBetterAuthProvider>
  );
}

//? 生の error.message は Convex の内部ログやスタックを含むため描画しない(FullPageErrorState が文言を決める)
function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <RootDocument>
      <FullPageErrorState error={error} onRetry={reset} />
    </RootDocument>
  );
}

function RootNotFoundComponent() {
  return (
    <RootDocument>
      <NotFoundState />
    </RootDocument>
  );
}

function RootPendingComponent() {
  return (
    <RootDocument>
      <PendingComponent />
    </RootDocument>
  );
}
