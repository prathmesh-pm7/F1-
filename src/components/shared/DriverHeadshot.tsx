import React, { useState } from 'react';

interface Props { src?: string; alt: string; className?: string; fallback?: React.ReactNode; loading?: 'lazy' | 'eager'; }

export const DriverHeadshot: React.FC<Props> = ({ src, alt, className, fallback, loading = 'lazy' }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback ?? <span aria-label={alt}>{alt}</span>}</>;
  return <img src={src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
};
