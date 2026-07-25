import {
  getPasswordChecks,
  getPasswordStrength,
  PASSWORD_STRENGTH_LABEL,
  type PasswordStrength,
} from '../utils/password-strength';

type Props = {
  password: string;
};

export function PasswordStrengthMeter({ password }: Props) {
  const strength = getPasswordStrength(password);
  const checks = getPasswordChecks(password);

  if (!password) return null;

  const level: PasswordStrength = strength;
  const fill =
    level === 'weak' ? 1 : level === 'medium' ? 2 : level === 'strong' ? 3 : 0;

  return (
    <div className="sc-pw-meter" aria-live="polite">
      <div className="sc-pw-meter-bars" data-level={level}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`sc-pw-meter-bar${n <= fill ? ' is-on' : ''}`}
          />
        ))}
      </div>
      <div className="sc-pw-meter-row">
        <span className={`sc-pw-meter-label is-${level}`}>
          {PASSWORD_STRENGTH_LABEL[level as 'weak' | 'medium' | 'strong']}
        </span>
        <ul className="sc-pw-meter-rules">
          <li className={checks.length ? 'ok' : ''}>8+ caracteres</li>
          <li className={checks.upper ? 'ok' : ''}>Maiúscula</li>
          <li className={checks.lower ? 'ok' : ''}>Minúscula</li>
          <li className={checks.number ? 'ok' : ''}>Número</li>
        </ul>
      </div>
    </div>
  );
}
