type Props = {
  /** Compact brand row above the form (logo slot + name) */
  compact?: boolean;
};

/** Logo slot — swap the placeholder when you have an asset. */
export function AuthBrand({ compact = true }: Props) {
  if (!compact) return null;

  return (
    <div className="sc-auth-brand-block sc-auth-brand-block--panel">
      <div className="sc-auth-logo" aria-hidden="true">
        {/* Coloque sua logo aqui (ex.: <img src="/logo.svg" alt="" />) */}
        <span className="sc-auth-logo-mark">SC</span>
      </div>
      <div className="sc-auth-brand-text">
        <div className="sc-auth-brand-name">Study Cards</div>
      </div>
    </div>
  );
}
