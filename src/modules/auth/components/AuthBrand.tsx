import { BRAND_LOGO_SRC } from '../brand';

type Props = {
  /** Compact brand row above the form (logo slot + name) */
  compact?: boolean;
};

export function AuthBrand({ compact = true }: Props) {
  if (!compact) return null;

  return (
    <div className="sc-auth-brand-block sc-auth-brand-block--panel">
      <div className="sc-auth-logo" aria-hidden="true">
        <img
          className="sc-auth-logo-img"
          src={BRAND_LOGO_SRC}
          alt=""
        />
      </div>
      <div className="sc-auth-brand-text">
        <div className="sc-auth-brand-name">Study Cards</div>
      </div>
    </div>
  );
}
