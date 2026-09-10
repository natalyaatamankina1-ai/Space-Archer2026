'use client';

/**
 * @fileoverview TreeLightLayer — реалистичное динамическое освещение дерева прокачки.
 *
 * Архитектура зеркалирует игровой движок света (src/game/lightEngine.ts):
 *
 * 1. ЗАПЕЧЁННЫЕ СПРАЙТЫ. Радиальные градиенты света не создаются каждый
 *    кадр — переиспользуется общий кэш lightEngine (getLightSprite/parseColor),
 *    отрисовка — быстрый drawImage.
 *
 * 2. СЛОЙ СВЕТА В ПОЛОВИННОМ РАЗРЕШЕНИИ. Канвас 900×900 (при контенте 1800²)
 *    рисуется с композитом 'lighter', а сам элемент смешивается с деревом
 *    через CSS `mix-blend-mode: screen` — свет реально ОСВЕЩАЕТ сетку фона,
 *    затемнённые линии связей и соседние узлы. Апскейл half-res даёт то же
 *    бесплатное мягкое рассеивание («bloom»), что и в игре.
 *
 * 3. ДИНАМИКА (свет живой, как в бою):
 *    - каждый узел «дышит» (мерцание плазмы с индивидуальной фазой);
 *    - ядро дерева пульсирует золотом; залоченные узлы почти не светят;
 *    - за курсором плавно следует мягкий цианово-белый свет;
 *    - на наведённый узел свет усиливается (интерактивная подсветка);
 *    - покупка улучшения → яркая вспышка света, гаснущая за ~0.9 c;
 *    - по полю медленно дрейфуют две «туманности» (фиолет/циан).
 *
 * 4. ЭКОНОМИЯ БЕЗ ПОТЕРИ КАЧЕСТВА:
 *    - rAF с шагом ~40 FPS (для атмосферного света неотличимо от 60);
 *    - полная остановка цикла при document.hidden;
 *    - пауза, когда канва вне вьюпорта (IntersectionObserver);
 *    - обновление данных через ref — без ре-рендеров React.
 *
 * @see src/game/lightEngine.ts — общий кэш спрайтов
 * @see src/pages/UpgradesScreen.tsx — использование
 */

import { useEffect, useRef } from 'react';
import { getLightSprite, parseColor } from '@/game/lightEngine';

export interface TreeLightNode {
  key: string;
  x: number;
  y: number;
  color: string;
  /** Текущий уровень узла — для вспышки при покупке. */
  level: number;
  maxLevel: number;
  unlocked: boolean;
}

interface TreeLightLayerProps {
  lights: TreeLightNode[];
  /** Размер контента дерева в его собственных координатах (CONTENT_SIZE). */
  size: number;
  /** Позиция курсора в координатах контента — обновляется канвой напрямую, без ре-рендеров. */
  mouseRef: React.RefObject<{ tx: number; ty: number }>;
}

/** Разрешение слоя света — ¼ площади, как в игровом lightEngine. */
const LIGHT_SCALE = 0.5;
/** Шаг кадров: ~40 FPS — атмосферному свету больше не нужно. */
const FRAME_MS = 25;
/** Длительность вспышки при покупке улучшения. */
const FLASH_MS = 900;
/** Радиус «наведения» узла в координатах контента (кольцо узла 48px). */
const HOVER_RADIUS = 62;

interface Flash {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  t0: number;
}

export function TreeLightLayer({ lights, size, mouseRef }: TreeLightLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Свежие данные — через ref (запись только в эффектах): rAF-цикл
  // не перезапускается при покупках.
  const lightsRef = useRef(lights);
  const flashesRef = useRef<Flash[]>([]);
  const prevLevelsRef = useRef<Record<string, number> | null>(null);
  // Сглаженное «наведение» на узел: idx + коэффициент 0..1 (eased).
  const hoverRef = useRef({ idx: -1, k: 0 });
  // Сглаженный свет за курсором: позиция + амплитуда (появление/угасание).
  const cursorRef = useRef({ x: -9999, y: -9999, amp: 0 });

  // ===== Данные для rAF-цикла + покупка → вспышка света на купленном узле =====
  // Обновление — в эффекте (не в рендере): цикл света не перезапускается
  // при покупках, просто читает свежие данные в следующем кадре.
  useEffect(() => {
    lightsRef.current = lights;
    const prev = prevLevelsRef.current;
    if (prev) {
      for (const l of lights) {
        if ((l.level || 0) > (prev[l.key] || 0)) {
          // Смешение с белым — как вспышка попадания у врагов в игре.
          const [r, g, b] = parseColor(l.color);
          flashesRef.current.push({
            x: l.x,
            y: l.y,
            r: r + (((255 - r) * 0.55) | 0),
            g: g + (((255 - g) * 0.55) | 0),
            b: b + (((255 - b) * 0.55) | 0),
            t0: performance.now(),
          });
        }
      }
    }
    const levels: Record<string, number> = {};
    for (const l of lights) levels[l.key] = l.level || 0;
    prevLevelsRef.current = levels;
  }, [lights]);

  // ===== Главный rAF-цикл слоя света =====
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const w = Math.max(1, Math.round(size * LIGHT_SCALE));
    cv.width = w;
    cv.height = w;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let inView = true;

    // Пауза, когда канва (вместе с деревом) вне вьюпорта.
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
      });
      io.observe(cv);
    }

    const drawSprite = (
      r: number, g: number, b: number,
      x: number, y: number, radius: number, intensity: number,
    ) => {
      if (intensity <= 0.015 || radius <= 0) return;
      // Отсечение невидимых источников (за пределами контента)
      if (x + radius < 0 || x - radius > size || y + radius < 0 || y - radius > size) return;
      const spr = getLightSprite(r, g, b);
      const lr = radius * LIGHT_SCALE;
      ctx.globalAlpha = intensity > 1 ? 1 : intensity;
      ctx.drawImage(spr, x * LIGHT_SCALE - lr, y * LIGHT_SCALE - lr, lr * 2, lr * 2);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !inView) {
        last = now; // «замораживаем» таймер, чтобы после паузы не было скачка
        return;
      }
      const dtMs = now - last;
      if (dtMs < FRAME_MS) return;
      const dt = Math.min(64, dtMs) / 1000;
      last = now;

      ctx.clearRect(0, 0, w, w);
      ctx.globalCompositeOperation = 'lighter';

      // ===== 1. Дрейфующие «туманности» — фон живёт своей жизнью =====
      const cx = size / 2;
      const cy = size / 2;
      const nx = cx + Math.sin(now / 5200) * 420;
      const ny = cy + Math.cos(now / 6800) * 380;
      drawSprite(191, 0, 255, nx, ny, 640,
        0.030 + 0.012 * (0.5 + 0.5 * Math.sin(now / 3100)));
      drawSprite(0, 255, 255,
        cx - Math.sin(now / 5600) * 430,
        cy - Math.cos(now / 7400) * 350,
        560, 0.020 + 0.008 * (0.5 + 0.5 * Math.sin(now / 4200 + 2)));

      // ===== 2. Наведённый узел (по позиции курсора, без React-состояния) =====
      const ls = lightsRef.current;
      const m = mouseRef.current;
      let hoverIdx = -1;
      if (m.tx >= 0 && m.ty >= 0) {
        let best = HOVER_RADIUS;
        for (let i = 0; i < ls.length; i++) {
          const dx = ls[i].x - m.tx;
          const dy = ls[i].y - m.ty;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < best) { best = d; hoverIdx = i; }
        }
      }
      hoverRef.current.idx = hoverIdx;
      hoverRef.current.k += ((hoverIdx >= 0 ? 1 : 0) - hoverRef.current.k) * Math.min(1, dt * 9);
      const hoverK = hoverRef.current.k;

      // ===== 3. Свет узлов: дыхание плазмы + фазовое мерцание =====
      for (let i = 0; i < ls.length; i++) {
        const l = ls[i];
        const [r, g, b] = parseColor(l.color);
        // мерцание с индивидуальной фазой — свет «дышит», как у врагов
        const flick = 0.88 + 0.12 * Math.sin(now / 300 + (l.x + l.y) * 0.013);
        let intensity: number;
        let radius: number;
        if (l.key === 'baseNode') {
          const pulse = 0.5 + 0.5 * Math.sin(now / 900);
          intensity = l.unlocked ? 0.24 + pulse * 0.10 : 0.06 + pulse * 0.03;
          radius = 330 + pulse * 46;
        } else if (l.unlocked) {
          const isMax = l.level >= l.maxLevel;
          intensity = (isMax ? 0.185 : 0.135) * flick;
          radius = 205;
        } else {
          // залоченный узел почти не излучает — дерево «читается» светом
          intensity = 0.022 * flick;
          radius = 115;
        }
        if (i === hoverRef.current.idx && hoverK > 0.01) {
          intensity *= 1 + hoverK * 0.95;
          radius *= 1 + hoverK * 0.18;
        }
        drawSprite(r, g, b, l.x, l.y, radius, intensity);
      }

      // ===== 4. Свет за курсором (плавно догоняет, мягко гаснет при уходе) =====
      const cur = cursorRef.current;
      if (m.tx >= 0 && m.ty >= 0) {
        if (cur.x < 0) { cur.x = m.tx; cur.y = m.ty; }
        cur.amp += (1 - cur.amp) * Math.min(1, dt * 7);
        cur.x += (m.tx - cur.x) * Math.min(1, dt * 9);
        cur.y += (m.ty - cur.y) * Math.min(1, dt * 9);
      } else {
        cur.amp += (0 - cur.amp) * Math.min(1, dt * 4);
      }
      if (cur.amp > 0.02) {
        const flick = 0.9 + 0.1 * Math.sin(now / 260);
        drawSprite(190, 245, 255, cur.x, cur.y, 250, 0.10 * cur.amp * flick);
      }

      // ===== 5. Вспышки покупок (яркая волна, гаснет за FLASH_MS) =====
      const fs = flashesRef.current;
      for (let i = fs.length - 1; i >= 0; i--) {
        const f = fs[i];
        const k = (now - f.t0) / FLASH_MS;
        if (k >= 1) { fs.splice(i, 1); continue; }
        const ease = 1 - (1 - k) * (1 - k); // ease-out
        drawSprite(f.r, f.g, f.b, f.x, f.y, 180 + ease * 250, 0.8 * (1 - k));
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (io) io.disconnect();
    };
  }, [size, mouseRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute left-0 top-0 pointer-events-none"
      style={{
        width: size,
        height: size,
        zIndex: 2, // над линиями связей (z=1), под узлами (z=10)
        mixBlendMode: 'screen', // аддитивное «физическое» смешение света
      }}
    />
  );
}
