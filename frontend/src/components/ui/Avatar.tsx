import React, { useCallback, useEffect, useState } from 'react';
import { resolveMediaUrl } from '../../utils/media';
import './avatar.css';

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name, size = 48, className }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const resolvedSrc = resolveMediaUrl(src);

  useEffect(() => {
    setBroken(false);
  }, [resolvedSrc]);

  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || '?';

  const onError = useCallback(() => setBroken(true), []);

  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
  };

  return (
    <div className={`avatar ${className || ''}`} style={wrapperStyle} title={name ?? undefined}>
      {resolvedSrc && !broken ? (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={resolvedSrc} alt={name ? `${name} profile` : 'Profile image'} className="avatar-img" onError={onError} />
      ) : (
        <div className="avatar-fallback">{initials}</div>
      )}
      <span className="avatar-ring" aria-hidden="true" />
    </div>
  );
}
