const SHORT_SLEEP_HOURS = 7;

function hmToMinutes(hm: string): number {
  const [hoursText, minutesText] = hm.split(":");
  return Number(hoursText) * 60 + Number(minutesText);
}

export function sleepHours(bedHm: string, wakeHm: string): number {
  const bed = hmToMinutes(bedHm);
  let wake = hmToMinutes(wakeHm);
  if (wake <= bed) {
    wake += 24 * 60;
  }
  return (wake - bed) / 60;
}

export function isShortSleep(hours: number): boolean {
  return hours < SHORT_SLEEP_HOURS;
}
