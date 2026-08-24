import { useEffect, useRef, useState } from 'react';

export function useAudioAnalyser(isActive: boolean) {
  const [levels, setLevels] = useState<number[]>(
    new Array(32).fill(0)
  );

  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      setLevels(new Array(32).fill(0));
      return;
    }

    const animate = () => {
      setLevels(
        Array.from({ length: 32 }, (_, index) => {
          const center = Math.abs(index - 16) / 16;
          const base = Math.max(0.15, 1 - center);
          const variation = Math.random() * 0.5;

          return Math.min(1, base * variation + 0.1);
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      setLevels(new Array(32).fill(0));
    };
  }, [isActive]);

  return levels;
}