export function calendarsToPull(plan: {
  isOutput?: boolean;
  calendarId: string;
  visibleCalendarIds: readonly string[];
}): string[] {
  return [
    ...new Set([...plan.visibleCalendarIds, ...(plan.isOutput === false ? [] : [plan.calendarId])]),
  ];
}
