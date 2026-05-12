import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void, intervalMs: number = 60000) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const tick = () => savedCallback.current();
    const start = () => {
      timer = setInterval(tick, intervalMs);
    };
    const stop = () => clearInterval(timer);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);
}
