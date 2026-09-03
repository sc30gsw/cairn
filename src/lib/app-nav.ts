import {
  IconBulb,
  IconCalendarEvent,
  IconChartBar,
  IconColumns3,
  IconLayoutKanban,
  IconNotebook,
  IconTarget,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";

type NavIcon = typeof IconCalendarEvent;

const NAV_ROUTES = [
  "/",
  "/board",
  "/history",
  "/review",
  "/items",
  "/presets",
  "/goals",
  "/methods",
  "/trash",
] as const;

export type NavRoute = (typeof NAV_ROUTES)[number];

export type NavEntry = {
  Icon: NavIcon;
  label: string;
  match: (path: string) => boolean;
  to: NavRoute;
};

//? 小口レール・下小口タブ・コマンドパレットが読む唯一のナビ定義
export const NAV: NavEntry[] = [
  {
    Icon: IconCalendarEvent,
    label: "日",
    match: (path) => path === "/" || path.startsWith("/days/"),
    to: "/",
  },
  {
    Icon: IconColumns3,
    label: "ボード",
    match: (path) => path.startsWith("/board"),
    to: "/board",
  },
  {
    Icon: IconChartBar,
    label: "履歴",
    match: (path) => path.startsWith("/history"),
    to: "/history",
  },
  {
    Icon: IconNotebook,
    label: "レビュー",
    match: (path) => path.startsWith("/review"),
    to: "/review",
  },
  {
    Icon: IconLayoutKanban,
    label: "項目",
    match: (path) => path.startsWith("/items"),
    to: "/items",
  },
  {
    Icon: IconTemplate,
    label: "プリセット",
    match: (path) => path.startsWith("/presets"),
    to: "/presets",
  },
  {
    Icon: IconTarget,
    label: "目標",
    match: (path) => path.startsWith("/goals"),
    to: "/goals",
  },
  {
    Icon: IconBulb,
    label: "方法",
    match: (path) => path.startsWith("/methods"),
    to: "/methods",
  },
  {
    Icon: IconTrash,
    label: "ゴミ箱",
    match: (path) => path.startsWith("/trash"),
    to: "/trash",
  },
];

//? 下小口タブに出す4本。ほかは「その他」メニューへ回す
const MOBILE_PRIMARY = ["/", "/board", "/history", "/goals"] as const satisfies readonly NavRoute[];

export function isMobilePrimary(to: NavRoute): boolean {
  return MOBILE_PRIMARY.some((route) => route === to);
}
