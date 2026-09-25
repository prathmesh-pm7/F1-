import React, { useState } from 'react';
import { TechnicalUpdate } from '../../types/f1';
import { Wrench, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface Props {
  updates: TechnicalUpdate[];
}

export const TechnicalUpdatesFeed: React.FC<Props> = ({ updates }) => {
  const [filterTeam, setFilterTeam] = useState<string>('ALL');

  const teams = Array.from(new Set(updates.map(u => u.team)));
  const filtered = filterTeam === 'ALL' ? updates : updates.filter(u => u.team === filterTeam);

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      {/* Header and filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242c37] pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            FIA CAR PRESENTATION & TECHNICAL UPGRADES
          </h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Aerodynamic, cooling and chassis specifications submitted to the FIA Technical Delegate
          </p>
        </div>

        {/* Team filter buttons */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTeam('ALL')}
            className={`px-2 py-1 text-[10px] font-bold tracking-wider transition-colors ${
              filterTeam === 'ALL'
                ? 'bg-[#222a36] text-white border border-[#3b4759]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            ALL
          </button>
          {teams.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterTeam(t)}
              className={`px-2 py-1 text-[10px] font-bold tracking-wider transition-colors ${
                filterTeam === t
                  ? 'bg-[#222a36] text-white border border-[#3b4759]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Upgrades List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="border border-[#242c37] bg-[#111418] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c222b] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-4 inline-block"
                  style={{ backgroundColor: item.teamColor }}
                />
                <span className="text-sm font-black text-white">{item.team}</span>
                <span className="text-neutral-600">·</span>
                <span className="font-bold text-neutral-200">{item.component}</span>
                <span className="text-neutral-600">·</span>
                <span className="text-neutral-400">{item.updateType}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.status === 'VERIFIED' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 bg-emerald-950/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>VERIFIED FIA SUBMISSION</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 border border-amber-500/40 px-1.5 py-0.2 bg-amber-950/20">
                    <AlertCircle className="w-3 h-3" />
                    <span>REPORTED / PADDOCK</span>
                  </span>
                )}
                {item.sourceDocNumber && (
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {item.sourceDocNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-2">
              <h4 className="text-xs font-bold text-white mb-1">
                {item.summary}
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                {item.technicalDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400 pt-2 border-t border-[#1c222b]">
              <span>WEEKEND: <strong className="text-neutral-300">{item.weekend}</strong></span>
              <span>SUBMISSION DATE: <strong className="text-neutral-300">{item.submissionDate}</strong></span>
              <span>SOURCE: <strong className="text-neutral-300">{item.source}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Provenance */}
      <ProvenanceBadge
        provenance={{
          provider: 'Curated Technical',
          sourceUrl: 'https://www.fia.com',
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'FIA Technical Delegate Car Display Document Registry'
        }}
      />
    </div>
  );
};
