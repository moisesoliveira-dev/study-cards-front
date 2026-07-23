import { IonIcon } from '@ionic/react';
import {
  desktopOutline,
  moonOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { tapScale } from '../motion';
import { useTheme, type ThemeMode } from './ThemeContext';

const LABEL: Record<ThemeMode, string> = {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
};

const ICON = {
  light: sunnyOutline,
  dark: moonOutline,
  system: desktopOutline,
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, cycle } = useTheme();
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      className={`sc-theme-toggle${compact ? ' is-compact' : ''}`}
      onClick={cycle}
      whileTap={reduce ? undefined : tapScale}
      aria-label={`Tema: ${LABEL[mode]}. Alternar`}
      title={`Tema: ${LABEL[mode]}`}
    >
      <IonIcon icon={ICON[mode]} />
      {!compact ? <span>{LABEL[mode]}</span> : null}
    </motion.button>
  );
}
