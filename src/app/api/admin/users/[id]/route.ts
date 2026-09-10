import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.role === 'user' || body.role === 'admin') updateData.role = body.role;
    if (typeof body.cores === 'number') updateData.cores = Math.max(0, Math.floor(body.cores));
    if (body.stats && typeof body.stats === 'object') updateData.stats = JSON.stringify(body.stats);
    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, displayName: true, role: true, cores: true, stats: true },
    });
    return NextResponse.json({ ...updated, stats: JSON.parse(updated.stats) });
  } catch (err) {
    console.error('Admin user PUT error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const { id } = await params;
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin user DELETE error:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
