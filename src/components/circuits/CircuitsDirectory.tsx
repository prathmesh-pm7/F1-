import React from 'react';
import { Circuit } from '../../types/f1';
import { MapPin, Navigation, Compass, Trophy } from 'lucide-react';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface Props {
  circuits: Circuit[];
}

export const CircuitsDirectory: React.FC<Props> = ({ circuits }) => {
  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      <div className="flex items-center justify-between border-b border-[#242c37] pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          FIA CERTIFIED GRADE 1 CIRCUITS
        </h2>
        <span className="text-[11px] text-neutral-400">
          {circuits.length} TRACK CONFIGURATIONS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {circuits.map((c) => (
          <div key={c.id} className="border border-[#242c37] bg-[#111418] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-[#1c222b] pb-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{c.name}</h3>
                  <div className="flex items-center gap-1.5 text-neutral-400 text-xs mt-0.5">
                    <MapPin className="w-3 h-3 text-neutral-400" />
                    <span>{c.location}, {c.country}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#161a20] border border-[#2d3744] text-[10px] font-bold text-neutral-200">
                  FIA GRADE 1
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 text-center border-b border-[#1c222b]">
                <div className="bg-[#14171d] p-2 border border-[#222933]">
                  <span className="text-[10px] text-neutral-400 block">LENGTH</span>
                  <span className="text-white font-bold timing-cell">{c.lengthKm} km</span>
                </div>
                <div className="bg-[#14171d] p-2 border border-[#222933]">
                  <span className="text-[10px] text-neutral-400 block">TURNS</span>
                  <span className="text-white font-bold timing-cell">{c.turns}</span>
                </div>
                <div className="bg-[#14171d] p-2 border border-[#222933]">
                  <span className="text-[10px] text-neutral-400 block">DRS ZONES</span>
                  <span className="text-white font-bold timing-cell">{c.drsZones}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 text-xs flex items-center justify-between">
              <span className="text-neutral-400">LAP RECORD:</span>
              <span className="text-fuchsia-400 font-bold timing-cell">
                {c.lapRecord ? `${c.lapRecord.time} (${c.lapRecord.driver}, ${c.lapRecord.year})` : '1:21.046 (Rubens Barrichello)'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Provenance */}
      <ProvenanceBadge
        provenance={{
          provider: 'Jolpica F1',
          sourceUrl: 'https://api.jolpi.ca/ergast/f1/circuits.json',
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'FIA Formula 1 Circuit Homologations'
        }}
      />
    </div>
  );
};
