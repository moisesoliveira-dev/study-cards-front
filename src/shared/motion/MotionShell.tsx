import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { fadeUp, staggerContainer } from './presets';

type ShellProps = HTMLMotionProps<'div'> & {
  className?: string;
  children: React.ReactNode;
};

/** Entrada suave do conteúdo de uma página. */
export function MotionShell({ children, className, ...rest }: ShellProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : fadeUp}
      initial={reduce ? false : 'hidden'}
      animate="show"
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type ListProps = HTMLMotionProps<'div'> & {
  className?: string;
  children: React.ReactNode;
};

/** Container com stagger para grids/listas. */
export function MotionStagger({ children, className, ...rest }: ListProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : staggerContainer}
      initial={reduce ? false : 'hidden'}
      animate="show"
      {...rest}
    >
      {children}
    </motion.div>
  );
}
