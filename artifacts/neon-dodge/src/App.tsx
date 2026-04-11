
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
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#050510',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
      }}
    />
  );
}
