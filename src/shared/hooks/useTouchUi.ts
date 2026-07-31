import { useEffect, useState } from 'react';

const TOUCH_MQ = '(hover: none), (max-width: 820px)';

/** UI compacta / touch: sem hover fino ou viewport ≤820px. */
export function useTouchUi() {
  const [touchUi, setTouchUi] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia(TOUCH_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(TOUCH_MQ);
    const sync = () => setTouchUi(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return touchUi;
}
