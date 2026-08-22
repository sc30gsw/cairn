const JST_DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

export function formatJstDateLabel(dateJst: string): string {
  return JST_DATE_LABEL_FORMATTER.format(new Date(`${dateJst}T12:00:00+09:00`));
}
