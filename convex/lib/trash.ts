export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isPurgeDue(deletedAt: number, now: number): boolean {
  return now - deletedAt >= TRASH_TTL_MS;
}
