export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

export type PasswordChecks = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const c = getPasswordChecks(password);
  return c.length && c.lower && c.upper && c.number;
}

/** Live indicator while typing — scoring beyond the minimum rules. */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'empty';

  const checks = getPasswordChecks(password);
  const baseScore =
    Number(checks.length) +
    Number(checks.lower) +
    Number(checks.upper) +
    Number(checks.number);

  let score = baseScore;
  if (password.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (baseScore < 4 || score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
}

export const PASSWORD_STRENGTH_LABEL: Record<
  Exclude<PasswordStrength, 'empty'>,
  string
> = {
  weak: 'Fraca',
  medium: 'Média',
  strong: 'Forte',
};
