import { useEffect, useState } from 'react';
import { authApi } from '../api/auth.api';
import type { AuthUser } from '../types/auth.types';

type Props = {
  user: AuthUser | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

export function UserAvatar({ user, size = 'md', className = '' }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const initials = (user?.username || user?.email || '?')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      if (!user?.hasAvatar) {
        setSrc(null);
        return;
      }
      try {
        const blob = await authApi.avatarBlob(user.updatedAt);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setSrc(url);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [user?.hasAvatar, user?.updatedAt, user?.id]);

  return (
    <div
      className={`sc-user-avatar is-${size}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {src ? <img src={src} alt="" /> : <span>{initials}</span>}
    </div>
  );
}
