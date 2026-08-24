import { fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { AppShell } from "~/components/app-shell";
import { renderWithMantine } from "~/test-utils/render";

type LinkProps = { children?: ReactNode; to: string } & Record<string, unknown>;

const { pathnameRef } = vi.hoisted(() => ({ pathnameRef: { current: "/" } }));

vi.mock("@tanstack/react-router", () => ({
  CatchBoundary: ({ children }: Record<"children", ReactNode>) => <>{children}</>,
  Link: ({ children, to, ...rest }: LinkProps) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useRouterState: () => pathnameRef.current,
}));

//? ベル/計測インジケータ/オフラインバナーは Convex 購読や navigator に依存する。ナビの検証には要らない。
vi.mock("~/components/notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("~/components/notification-bell-fallback", () => ({
  NotificationBellFallback: () => null,
}));
vi.mock("~/components/running-timer-indicator", () => ({
  RunningTimerIndicator: () => null,
  RunningTimerIndicatorFallback: () => null,
}));
vi.mock("~/components/offline-banner", () => ({ OfflineBanner: () => null }));

const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 375;

type HappyWindow = { happyDOM?: { setViewport: (viewport: { width: number }) => void } };

//? Mantine の hiddenFrom / visibleFrom は CSS のメディアクエリ。happy-dom は既定 1024px 幅で
//? それを評価するので、幅を変えないと下小口バーが display:none になり、アクセシブル名が空になって
//? role 検索から落ちる。#58 §21.2 の「幅 375px で」と同じ条件を作る。
function setViewportWidth(width: number) {
  (window as unknown as HappyWindow).happyDOM?.setViewport({ width });
}

afterEach(() => {
  setViewportWidth(DESKTOP_WIDTH);
});

function renderShell(pathname: string, width = MOBILE_WIDTH) {
  setViewportWidth(width);
  pathnameRef.current = pathname;
  return renderWithMantine(
    <AppShell accountMenu={null}>
      <div>本文</div>
    </AppShell>,
  );
}

//* #58 §10: モバイルは下小口タブ4本 + 「その他」。項目 / プリセット / ゴミ箱は Menu の中。
test("下小口ナビは 日 / ボード / 履歴 / 目標 の4本で、項目は含まない", () => {
  const { getByRole } = renderShell("/");
  const bottom = getByRole("navigation", { name: /下小口/ });

  for (const href of ["/", "/board", "/history", "/goals"]) {
    expect(bottom.querySelector(`a[href="${href}"]`)).not.toBeNull();
  }
  expect(bottom.textContent).toContain("日");
  expect(bottom.textContent).toContain("ボード");
  expect(bottom.textContent).toContain("履歴");
  expect(bottom.textContent).toContain("目標");
  expect(bottom.textContent).not.toContain("項目");
  expect(bottom.textContent).not.toContain("プリセット");
  expect(bottom.textContent).not.toContain("ゴミ箱");
  expect(bottom.querySelectorAll("a").length).toBe(4);
});

test("「その他」を押すと 項目 / プリセット / ゴミ箱 が出る", async () => {
  const { getByRole } = renderShell("/");

  fireEvent.click(getByRole("button", { name: "その他の画面" }));

  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: "項目" })).toBeDefined();
  });
  expect(getByRole("menuitem", { hidden: true, name: "プリセット" })).toBeDefined();
  expect(getByRole("menuitem", { hidden: true, name: "ゴミ箱" })).toBeDefined();
});

test("デスクトップ幅では右小口レールが残り、下小口は DOM から消えない", () => {
  const { getByRole } = renderShell("/", DESKTOP_WIDTH);

  expect(getByRole("navigation", { name: /右小口/ })).toBeDefined();
  //? 下小口は CSS で消えるだけ(§10.3)。role からは落ちるので DOM を直接見る。
  expect(document.querySelector('nav[aria-label*="下小口"]')).not.toBeNull();
});

test("現在ページのタブに aria-current が付く", () => {
  const { getByRole } = renderShell("/board");
  const bottom = getByRole("navigation", { name: /下小口/ });
  const current = bottom.querySelectorAll('[aria-current="page"]');

  expect(current.length).toBe(1);
  expect(current[0]?.getAttribute("href")).toBe("/board");
});

//* E22: 「その他」側のページに居るときは「その他」自体を active に見せる。
test("項目ページでは 4本に aria-current が付かず、「その他」が強調される", () => {
  const { getByRole } = renderShell("/items");
  const bottom = getByRole("navigation", { name: /下小口/ });
  const other = getByRole("button", { name: "その他の画面" });
  const plainTab = bottom.querySelector<HTMLAnchorElement>('a[href="/"]');

  expect(bottom.querySelectorAll('[aria-current="page"]').length).toBe(0);
  //? active は CSS モジュールのクラス。クラス名はハッシュされるので、素の4本と違うことだけを見る。
  expect(other.className).not.toBe(plainTab?.className);
});
