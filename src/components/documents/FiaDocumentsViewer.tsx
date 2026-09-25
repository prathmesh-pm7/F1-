import React, { useState } from 'react';
import { FIADocument } from '../../types/f1';
import { FileText, ExternalLink, Download, Search } from 'lucide-react';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface Props {
  documents: FIADocument[];
}

export const FiaDocumentsViewer: React.FC<Props> = ({ documents }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const types = Array.from(new Set(documents.map(d => d.type)));

  const filtered = documents.filter((doc) => {
    const matchesType = filterType === 'ALL' || doc.type === filterType;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(doc.docNumber).includes(searchTerm) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      {/* Header and filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242c37] pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            OFFICIAL FIA EVENT DOCUMENTS REPOSITORY
          </h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Decisions, race director notes, technical bulletins, and official classifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search document title or #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111418] border border-[#2d3744] pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-300 w-56"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2 py-1 text-[10px] font-bold tracking-wider transition-colors ${
                filterType === 'ALL'
                  ? 'bg-[#222a36] text-white border border-[#3b4759]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            {types.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 text-[10px] font-bold tracking-wider transition-colors whitespace-nowrap ${
                  filterType === t
                    ? 'bg-[#222a36] text-white border border-[#3b4759]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="border border-[#242c37] bg-[#111418] overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#242c37] bg-[#0e1115] text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              <th className="py-2 px-3 text-center w-14">DOC #</th>
              <th className="py-2 px-3">DOCUMENT TITLE</th>
              <th className="py-2 px-3">TYPE</th>
              <th className="py-2 px-3 text-center">SESSION</th>
              <th className="py-2 px-3 text-right">DATE / TIME</th>
              <th className="py-2 px-3 text-right">SOURCE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c222b]">
            {filtered.map((doc) => (
              <tr key={doc.id} className="hover:bg-[#161a20] transition-colors">
                <td className="py-2.5 px-3 text-center font-bold text-neutral-300 timing-cell">
                  Doc {doc.docNumber}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="font-semibold text-white">{doc.title}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-neutral-300">
                  <span className="text-[11px] text-neutral-300">{doc.type}</span>
                </td>
                <td className="py-2.5 px-3 text-center text-neutral-400">
                  {doc.session || 'General'}
                </td>
                <td className="py-2.5 px-3 text-right text-neutral-400 timing-cell">
                  <span>{doc.date}</span> <span className="text-neutral-500">{doc.time}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <a
                    href={doc.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-neutral-300 hover:text-white underline decoration-neutral-600 transition-colors"
                  >
                    <span>FIA Official</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Provenance */}
      <ProvenanceBadge
        provenance={{
          provider: 'FIA Official',
          sourceUrl: 'https://www.fia.com/documents',
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'Federation Internationale de l Automobile Official Decisions & Bulletins'
        }}
      />
    </div>
  );
};
