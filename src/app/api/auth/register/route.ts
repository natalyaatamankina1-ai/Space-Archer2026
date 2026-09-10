import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSessionToken, getSessionCookieName } from '@/lib/auth';

const ADMIN_EMAIL = 'natalya.atamankina1@yandex.ru';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || '').toString().trim().toLowerCase();
    const password = (body.password || '').toString();
    const displayName = (body.displayName || '').toString().trim() || 'Пилот';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Введите корректный email' }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 4 символов' }, { status: 400 });
    }
    if (displayName.length > 30) {
      return NextResponse.json({ error: 'Имя слишком длинное (макс. 30 символов)' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Пользователь с этим email уже зарегистрирован' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const role = email === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';

    const user = await db.user.create({
      data: { email, passwordHash, displayName: displayName.slice(0, 30), role },
    });

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({
      id: user.id, email: user.email, displayName: user.displayName, role: user.role,
    });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
    });
    return response;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Ошибка сервера при регистрации' }, { status: 500 });
  }
}
