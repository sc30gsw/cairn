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
