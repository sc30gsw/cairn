//? capability URL のトークン。暗号学的に安全な乱数 32 バイトを base64url で 43 文字に
export const CALENDAR_FEED_TOKEN_BYTES = 32;

export const CALENDAR_FEED_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const CALENDAR_FEED_PATH_PREFIX = "/calendar/";

export const CALENDAR_FEED_EXTENSION = ".ics";

export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCalendarFeedToken(): string {
  const bytes = new Uint8Array(CALENDAR_FEED_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

//? "/calendar/<token>.ics" からトークンを取り出す。形が違えば null（404 にする）
export function calendarFeedTokenFromPath(pathname: string): string | null {
  if (
    !pathname.startsWith(CALENDAR_FEED_PATH_PREFIX) ||
    !pathname.endsWith(CALENDAR_FEED_EXTENSION)
  ) {
    return null;
  }
  const token = pathname.slice(CALENDAR_FEED_PATH_PREFIX.length, -CALENDAR_FEED_EXTENSION.length);
  return CALENDAR_FEED_TOKEN_PATTERN.test(token) ? token : null;
}

export function calendarFeedPath(token: string): string {
  return `${CALENDAR_FEED_PATH_PREFIX}${token}${CALENDAR_FEED_EXTENSION}`;
}
