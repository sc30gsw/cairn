import { calendarFeedPath } from "~domain/calendarFeedToken";

//? Convex の HTTP action は <deployment>.convex.cloud ではなく <deployment>.convex.site で配信される
export function convexSiteUrl(convexUrl: string): string {
  return convexUrl.replace(/\.convex\.cloud\/?$/, ".convex.site");
}

export function calendarFeedUrl(convexUrl: string, token: string): string {
  return `${convexSiteUrl(convexUrl)}${calendarFeedPath(token)}`;
}

//? webcal: はカレンダーアプリに「購読」の意図を伝えるスキーム。https の URL と残りは同一
export function webcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:\/\//, "webcal://");
}
