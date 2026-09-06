import { linkOptions } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

export function dayPageLink(dateJst: DateJst, todayJst: DateJst) {
  if (dateJst === todayJst) {
    return linkOptions({ to: "/" });
  }
  return linkOptions({ params: { dateJst }, to: "/days/$dateJst" });
}

export function boardKanbanLink(dateJst: DateJst, todayJst: DateJst) {
  if (dateJst === todayJst) {
    return linkOptions({ search: { tab: "kanban" }, to: "/board" });
  }
  return linkOptions({ search: { date: dateJst, tab: "kanban" }, to: "/board" });
}

export function dayEditLinkLabel(dateJst: DateJst) {
  return `${dateJst} の記録を編集する`;
}

export function boardKanbanLinkLabel(dateJst: DateJst) {
  return `${dateJst} の記録をカンバンで見る`;
}
