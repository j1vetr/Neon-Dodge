import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

const SPLASH_SHOWN_KEY = 'neonDodge_splashShown';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: `${import.meta.env.BASE_URL}splash.json`,
    });

    anim.addEventListener('complete', () => {
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          sessionStorage.setItem(SPLASH_SHOWN_KEY, '1');
          onFinish();
        }, 500);
      }, 400);
    });

    return () => anim.destroy();
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#050510',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <div
        ref={containerRef}
        style={{ width: '60%', maxWidth: 300 }}
      />
    </div>
  );
}

export function shouldShowSplash(): boolean {
  return sessionStorage.getItem(SPLASH_SHOWN_KEY) !== '1';
}
