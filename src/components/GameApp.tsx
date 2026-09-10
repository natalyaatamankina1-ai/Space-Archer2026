'use client';

/**
 * @fileoverview GameApp — корневой компонент игры.
 *
 * Обёртка, предоставляющая провайдеры:
 * - AuthProvider: контекст аутентификации (user, loading, progress, refreshAuth)
 * - QueryClientProvider: TanStack Query (для серверного состояния, если понадобится)
 * - TooltipProvider: shadcn/ui тултипы
 *
 * Внутри рендерит Index — главный оркестратор экранов.
 * Используется через динамический импорт с ssr: false в src/app/page.tsx,
 * потому что игра полностью клиентская (canvas, localStorage, Web Audio).
 *
 * @see app/page.tsx — где GameApp импортируется
 * @see pages/Index.tsx — главный компонент экранов
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Index from '@/pages/Index';

const queryClient = new QueryClient();

export default function GameApp() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Index />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
