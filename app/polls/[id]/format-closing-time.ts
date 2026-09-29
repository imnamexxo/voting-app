const parts = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

// Formats a Closing time in Korean time, like "10월 3일 (금) 오후 6:00". 오전/오후 is added by
// hand because some ICU versions print "AM"/"PM" for ko-KR.
export function formatClosingTime(date: Date): string {
  const part = Object.fromEntries(parts.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = Number(part.hour);
  const period = hour < 12 ? "오전" : "오후";
  return `${part.month}월 ${part.day}일 (${part.weekday}) ${period} ${hour % 12 || 12}:${part.minute}`;
}
