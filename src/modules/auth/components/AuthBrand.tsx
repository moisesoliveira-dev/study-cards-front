type Props = {
  /** Optional tagline under the brand */
  tagline?: string;
};

/** Logo slot — swap the placeholder when you have an asset. */
export function AuthBrand({ tagline }: Props) {
  return (
    <div className="sc-auth-brand-block">
      <div className="sc-auth-logo" aria-hidden="true">
        {/* Coloque sua logo aqui (ex.: <img src="/logo.svg" alt="" />) */}
        <span className="sc-auth-logo-mark">SC</span>
      </div>
      <div className="sc-auth-brand-text">
        <div className="sc-auth-brand-name">Study Cards</div>
        {tagline ? <p className="sc-auth-brand-tagline">{tagline}</p> : null}
      </div>
    </div>
  );
}
