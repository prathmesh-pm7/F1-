import React from 'react';
import { EmptyState } from './EmptyState';

interface Props { isLoading?: boolean; error?: string | null; empty?: boolean; loadingLabel?: string; emptyTitle?: string; emptyMessage?: string; children: React.ReactNode; }

export const LoadState: React.FC<Props> = ({ isLoading, error, empty, loadingLabel = 'LOADING DATA…', emptyTitle = 'NO DATA', emptyMessage = 'No published data is available.', children }) => {
  if (isLoading) return <div className="f1-empty-card">{loadingLabel}</div>;
  if (error) return <EmptyState type="not-found" title="DATA UNAVAILABLE" message={error} />;
  if (empty) return <EmptyState type="no-data" title={emptyTitle} message={emptyMessage} />;
  return <>{children}</>;
};
