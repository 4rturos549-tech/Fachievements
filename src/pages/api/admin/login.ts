import type { APIRoute } from 'astro';
import { verifyAdminPassword } from '../../../lib/admin-auth';

const COOKIE_NAME = 'fach_admin';
const MAX_AGE_SECONDS = 60 * 60 * 8;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!verifyAdminPassword(body.password)) {
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  cookies.set(COOKIE_NAME, '1', {
    httpOnly: true,
    sameSite: 'strict',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
};

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete(COOKIE_NAME, { path: '/' });
  return Response.json({ ok: true });
};
