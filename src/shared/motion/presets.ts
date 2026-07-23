import type { Transition, Variants } from 'framer-motion';

export const easeOut = [0.22, 1, 0.36, 1] as const;

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.85,
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
  hidden: { opacity: 0, scale: 0.92, y: 18 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSoft,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: { duration: 0.18, ease: easeOut },
  },
};

export const docExpand: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 24 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSoft,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.2, ease: easeOut },
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
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSoft,
  },
};

export const cardDeal: Variants = {
  hidden: { opacity: 0, y: 28, rotate: -4, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: springSoft,
  },
};

export const studySlide: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 56 : -56,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: springSnappy,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.2, ease: easeOut },
  }),
};

export const tapScale = { scale: 0.97 };
export const hoverLift = { y: -3, transition: springSnappy };
