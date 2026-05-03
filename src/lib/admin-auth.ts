import { timingSafeEqual } from 'node:crypto';

export function verifyAdminPassword(provided: unknown): boolean {
  const expected = import.meta.env.ADMIN_PASSWORD as string | undefined;
  if (!expected || typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
