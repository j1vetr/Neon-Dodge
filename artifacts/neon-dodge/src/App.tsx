
/* =========================================================
   APP ROOT
   Mounts the Phaser game into a full-screen container.
   No React UI overlaid — Phaser manages everything.
   ========================================================= */

import { useEffect, useRef, useState, useCallback } from 'react';
import type Phaser from 'phaser';
import { createGame } from './game';
import SplashScreen, { shouldShowSplash } from './SplashScreen';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [showSplash, setShowSplash] = useState(shouldShowSplash);

  useEffect(() => {
    if (showSplash) return;
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = createGame(containerRef.current);

    return () => {
      if (gameRef.current) {
        try {
          const ctx = (gameRef.current.sound as any)?.context as AudioContext | undefined;
          if (ctx && ctx.state !== 'closed') ctx.close();
        } catch (_) { /* ignore */ }
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [showSplash]);

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <div
      ref={containerRef}
      style={{
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
