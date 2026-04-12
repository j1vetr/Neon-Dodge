
/* =========================================================
   APP ROOT
   Mounts the Phaser game into a full-screen container.
   No React UI overlaid — Phaser manages everything.
   ========================================================= */

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGame } from './game';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = createGame(containerRef.current);

    return () => {
      if (gameRef.current) {
        /* Close AudioContext first so visibility-change events can't fire
           on an already-destroyed context after HMR remounts. */
        try {
          const ctx = (gameRef.current.sound as any)?.context as AudioContext | undefined;
          if (ctx && ctx.state !== 'closed') ctx.close();
        } catch (_) { /* ignore */ }
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        /* 100% — html/body zaten position:fixed ile tam ekran,
           dvh/svh kullanmıyoruz: viewport resize olunca Phaser
           ScaleManager tetiklenip canvas kayıyor */
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#050510',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
        overscrollBehavior: 'none',
      }}
    />
  );
}
