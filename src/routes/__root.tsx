/// <reference types="vite-plus/client" />
import { ColorSchemeScript, Container, Loader, MantineProvider, Text, Title, mantineHtmlProps } from "@mantine/core";
import type { QueryClient } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { Suspense, lazy, type ReactNode } from "react";

import { theme } from "~/lib/theme";
import appCss from "~/styles.css?url";

const DEFAULT_COLOR_SCHEME = "dark";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const { TanStackRouterDevtools } = await import("~/router-devtools");
      return { default: TanStackRouterDevtools };
    })
  : null;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
  head: () => ({
    links: [{ href: appCss, rel: "stylesheet" }],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "Cairn" },
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
          {children}
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
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
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

function PendingComponent() {
  return (
    <Container py="xl">
      <Loader aria-label="読み込み中" />
    </Container>
  );
}
