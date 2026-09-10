import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const users = await db.user.findMany({
      select: { id: true, email: true, displayName: true, role: true, cores: true, stats: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      users: users.map(u => ({
        id: u.id, email: u.email, displayName: u.displayName, role: u.role, cores: u.cores,
        stats: JSON.parse(u.stats), createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Admin users GET error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
