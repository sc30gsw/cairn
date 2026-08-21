export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function notionOAuthConfigured(): boolean {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  return (
    clientId !== undefined && clientId !== "" && clientSecret !== undefined && clientSecret !== ""
  );
}

export function trustedOriginsFromEnv(siteUrl: string | undefined): string[] {
  const origins = new Set<string>();
  if (siteUrl !== undefined && siteUrl !== "") {
    origins.add(siteUrl);
  }
  const extra = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (extra !== undefined && extra !== "") {
    for (const origin of extra.split(",")) {
      const trimmed = origin.trim();
      if (trimmed !== "") {
        origins.add(trimmed);
      }
    }
  }
  return [...origins];
}
