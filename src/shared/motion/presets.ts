import type { Transition, Variants } from 'framer-motion';

export const easeOut = [0.22, 1, 0.36, 1] as const;

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.85,
};

/** Layout de cartas (reorder / Hall ↔ deck) — mais rápido. */
export const springLayout: Transition = {
  type: 'spring',
  stiffness: 900,
  damping: 42,
  mass: 0.4,
};

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 32,
  mass: 0.7,
};

export const tweenFast: Transition = {
  duration: 0.28,
  ease: easeOut,
};

export const tweenMed: Transition = {
  duration: 0.4,
  ease: easeOut,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: tweenMed,
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.18, ease: easeOut },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: tweenMed },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    // Sem scale: scale fracionário (e overshoot de spring) embaca tipografia no Chrome
    transition: tweenMed,
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.18, ease: easeOut },
  },
};

export const docExpand: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: tweenMed,
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: 0.16, ease: easeOut },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: tweenMed,
  },
};

export const cardDeal: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: tweenMed,
  },
};

export const studySlide: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 56 : -56,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: springSnappy,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
    transition: { duration: 0.2, ease: easeOut },
  }),
};

export const tapScale = { scale: 0.97 };
export const hoverLift = { y: -3, transition: springSnappy };
