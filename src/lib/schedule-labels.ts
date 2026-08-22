import type { ScheduleLabelsOverride } from "@mantine/schedule";

export const SCHEDULE_LABELS_JA: ScheduleLabelsOverride = {
  agenda: "Agenda",
  allDay: "終日",
  day: "日",
  month: "月",
  moreLabel: (hiddenEventsCount) => `+${hiddenEventsCount}件`,
  next: "次",
  previous: "前",
  selectMonth: "月を選択",
  selectYear: "年を選択",
  switchToDayView: "日表示に切り替え",
  switchToMonthView: "月表示に切り替え",
  switchToWeekView: "週表示に切り替え",
  switchToYearView: "年表示に切り替え",
  today: "今日",
  viewSelectLabel: "表示",
  week: "週",
  year: "年",
};
