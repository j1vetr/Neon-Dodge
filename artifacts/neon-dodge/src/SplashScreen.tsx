import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import { hideSplash } from './game/native';


export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    hideSplash();

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: `${import.meta.env.BASE_URL}splash.json`,
    });

    anim.addEventListener('complete', () => {
      onFinish();
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
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
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
  return true;
}
