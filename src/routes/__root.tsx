/// <reference types="vite-plus/client" />
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import {
  Button,
  Card,
  Center,
  ColorSchemeScript,
  MantineProvider,
  Stack,
  Text,
  Title,
  mantineHtmlProps,
} from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { ShimmerProvider } from "@shimmer-from-structure/react";
import type { QueryClient } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import "dayjs/locale/ja";
import { createServerFn } from "@tanstack/react-start";
import { Suspense, lazy, type ReactNode } from "react";

import { FullPageErrorState } from "~/components/error-state";
import { PendingComponent } from "~/components/pending-component";
import { authClient } from "~/lib/auth-client";
import { getToken } from "~/lib/auth-server";
import { DISPLAY_FONT, cssVariablesResolver, theme } from "~/lib/theme";

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
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      { crossOrigin: "anonymous", href: "https://fonts.gstatic.com", rel: "preconnect" },
      {
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap",
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
    <Center h="100dvh" p="md">
      <Card maw={420} padding="xl" shadow="sm" w="100%">
        <Stack gap="md">
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            学習ログ
          </Text>
          <Title ff={DISPLAY_FONT} fw={500} order={1}>
            ページが見つかりません
          </Title>
          <Text>アドレスが変わったか、削除された可能性があります。</Text>
          <Button component={Link} to="/">
            今日の記録へ戻る
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}

//? 生の error.message は Convex の内部ログやスタックを含むため描画しない(FullPageErrorState が文言を決める)
function ErrorComponent({ error, reset }: ErrorComponentProps) {
  return <FullPageErrorState error={error} onRetry={reset} />;
}
