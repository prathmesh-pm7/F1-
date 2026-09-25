import React from 'react';
import { DataProvenance } from '../../types/f1';
import { ExternalLink, ShieldCheck, Database, History } from 'lucide-react';

interface Props {
  provenance: DataProvenance;
  className?: string;
  showLink?: boolean;
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance, className = '', showLink = true }) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 font-mono text-[11px] text-neutral-400 ${className}`}>
      <span className="flex items-center gap-1 text-neutral-300">
        {provenance.isFixture ? (
          <History className="w-3 h-3 text-amber-400" />
        ) : (
          <Database className="w-3 h-3 text-emerald-400" />
        )}
        <span className="font-medium text-neutral-200">{provenance.provider}</span>
      </span>

      <span className="text-neutral-600" aria-hidden="true">·</span>

      {provenance.isFixture ? (
        <span className="text-amber-400 font-semibold tracking-wide">
          DEMO / FIXTURE DATA
        </span>
      ) : provenance.isLive ? (
        <span className="text-emerald-400 font-semibold tracking-wide">
          LIVE VERIFIED STREAM
        </span>
      ) : (
        <span className="text-neutral-400">
          OFFICIAL RECORD
        </span>
      )}

      {provenance.notes && (
        <>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <span className="text-neutral-400 hidden sm:inline">{provenance.notes}</span>
        </>
      )}

      {showLink && provenance.sourceUrl && (
        <>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <a
            href={provenance.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-neutral-400 hover:text-white underline decoration-neutral-600 transition-colors"
          >
            <span>Source</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </>
      )}
    </div>
  );
};
