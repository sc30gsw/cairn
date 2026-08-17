//* 実施日 = 確定記録の合計分数がその週の「1日あたり最低分数」に達した暦日。
//? 記録のない日は minutesByDate に現れないので、0分の日を数え上げることはない(CVX-09: 純関数)。
export function qualifyingDays(
  minutesByDate: Readonly<Record<string, number>>,
  dailyFloorMinutes: number,
): number {
  let count = 0;
  for (const minutes of Object.values(minutesByDate)) {
    if (minutes > 0 && minutes >= dailyFloorMinutes) {
      count += 1;
    }
  }
  return count;
}
