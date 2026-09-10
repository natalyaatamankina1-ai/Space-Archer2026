import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { GameProgress } from '@/types/game';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { cores: true, upgrades: true, stats: true },
    });
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    return NextResponse.json({
      cores: user.cores, upgrades: JSON.parse(user.upgrades), stats: JSON.parse(user.stats),
    });
  } catch (err) {
    console.error('Get progress error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const body = await request.json();
    const progress: Partial<GameProgress> = body;
    const updateData: Record<string, unknown> = {};

    if (typeof progress.cores === 'number' && progress.cores >= 0) updateData.cores = progress.cores;
    if (progress.upgrades && typeof progress.upgrades === 'object') updateData.upgrades = JSON.stringify(progress.upgrades);
    if (progress.stats && typeof progress.stats === 'object') updateData.stats = JSON.stringify(progress.stats);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: { cores: true, upgrades: true, stats: true },
    });

    return NextResponse.json({
      cores: updated.cores, upgrades: JSON.parse(updated.upgrades), stats: JSON.parse(updated.stats),
    });
  } catch (err) {
    console.error('Update progress error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
