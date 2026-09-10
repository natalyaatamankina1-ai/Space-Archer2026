import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET() {
  try {
    const entries = await db.leaderboardEntry.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      select: { id: true, name: true, score: true, wave: true, createdAt: true },
    });
    return NextResponse.json({
      entries: entries.map(e => ({
        id: e.id, name: e.name, score: e.score, wave: e.wave, date: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const body = await request.json();
    const name = (body.name || 'Аноним').toString().toUpperCase().slice(0, 10);
    const score = Math.max(0, Math.floor(Number(body.score) || 0));
    const wave = Math.max(1, Math.floor(Number(body.wave) || 1));

    const entry = await db.leaderboardEntry.create({
      data: { userId: sessionUser.id, name, score, wave },
    });

    // Also update user stats
    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { stats: true },
    });
    if (user) {
      const stats = JSON.parse(user.stats);
      const newStats = {
        highScore: Math.max(stats.highScore || 0, score),
        maxWave: Math.max(stats.maxWave || 1, wave),
        gamesPlayed: (stats.gamesPlayed || 0) + 1,
        totalEnemiesKilled: stats.totalEnemiesKilled || 0,
      };
      await db.user.update({
        where: { id: sessionUser.id },
        data: { stats: JSON.stringify(newStats) },
      });
    }

    return NextResponse.json({ ok: true, id: entry.id });
  } catch (err) {
    console.error('Leaderboard POST error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
