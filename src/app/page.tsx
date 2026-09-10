'use client';

import dynamic from 'next/dynamic';

// The game is fully client-side (canvas, localStorage, Web Audio API).
// We disable SSR so it only renders in the browser, avoiding hydration
// mismatches and ensuring browser APIs are always available.
const GameApp = dynamic(() => import('@/components/GameApp'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#070a0f',
        color: '#00ffff',
        fontFamily: 'monospace',
        fontSize: '1.5rem',
        letterSpacing: '0.3em',
        textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff',
      }}
    >
      ЗАГРУЗКА СИСТЕМЫ...
    </div>
  ),
});

export default function Home() {
  return <GameApp />;
}
