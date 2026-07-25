import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ThemeToggle } from '../../../shared/theme/ThemeToggle';
import { AuthScene } from './AuthScene';

type Props = {
  /** Headline on the visual panel */
  sceneHeadline: string;
  /** Short line under the brand on the visual panel */
  sceneLine: string;
  children: ReactNode;
};

export function AuthShell({ sceneHeadline, sceneLine, children }: Props) {
  const reduce = useReducedMotion();

  return (
    <div className="sc-auth-shell">
      <div className="sc-auth-theme">
        <ThemeToggle compact />
      </div>

      <aside className="sc-auth-stage" aria-hidden={false}>
        <AuthScene headline={sceneHeadline} line={sceneLine} reduce={!!reduce} />
      </aside>

      <section className="sc-auth-panel">
        <motion.div
          className="sc-auth-panel-inner"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </section>
    </div>
  );
}
