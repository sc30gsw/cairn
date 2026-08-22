import type { DateJst } from "~domain/jst";

export function dayPageLink(dateJst: DateJst, todayJst: DateJst) {
  if (dateJst === todayJst) {
    return { to: "/" as const };
  }
  return { params: { dateJst }, to: "/days/$dateJst" as const };
}

export function boardKanbanLink(dateJst: DateJst, todayJst: DateJst) {
  if (dateJst === todayJst) {
    return { search: { tab: "kanban" as const }, to: "/board" as const };
  }
  return { search: { date: dateJst, tab: "kanban" as const }, to: "/board" as const };
}

export function dayEditLinkLabel(dateJst: DateJst) {
  return `${dateJst} の記録を編集する`;
}

export function boardKanbanLinkLabel(dateJst: DateJst) {
  return `${dateJst} の記録をカンバンで見る`;
}
