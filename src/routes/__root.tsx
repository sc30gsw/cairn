/// <reference types="vite-plus/client" />
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import {
  ColorSchemeScript,
  Container,
  MantineProvider,
  Text,
  Title,
  mantineHtmlProps,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import type { QueryClient } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import "dayjs/locale/ja";
import { Suspense, lazy, type ReactNode } from "react";

import { PendingComponent } from "~/components/pending-component";
import { authClient } from "~/lib/auth-client";
import { getToken } from "~/lib/auth-server";
import { theme } from "~/lib/theme";

import appCss from "~/styles.css?url";

const DEFAULT_COLOR_SCHEME = "dark";

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
    links: [{ href: appCss, rel: "stylesheet" }],
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
        <ColorSchemeScript defaultColorScheme={DEFAULT_COLOR_SCHEME} />
        <HeadContent />
      </head>
      <body>
        <MantineProvider defaultColorScheme={DEFAULT_COLOR_SCHEME} theme={theme}>
          <DatesProvider settings={{ locale: "ja" }}>{children}</DatesProvider>
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

function RootErrorComponent(props: ErrorComponentProps) {
  return (
    <RootDocument>
      <ErrorComponent {...props} />
    </RootDocument>
  );
}

function RootNotFoundComponent() {
  return (
    <RootDocument>
      <NotFoundComponent />
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

function NotFoundComponent() {
  return (
    <Container py="xl">
      <Title order={1}>404</Title>
      <Text mt="sm">ページが見つかりませんでした。</Text>
    </Container>
  );
}

function ErrorComponent({ error }: ErrorComponentProps) {
  return (
    <Container py="xl">
      <Title c="red" order={1}>
        エラー
      </Title>
      <Text mt="sm">{error.message}</Text>
    </Container>
  );
}
