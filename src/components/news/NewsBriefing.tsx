import React from 'react';
import { NewsItem } from '../../types/f1';
import { ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { ProvenanceBadge } from '../shared/ProvenanceBadge';

interface Props {
  news: NewsItem[];
}

export const NewsBriefing: React.FC<Props> = ({ news }) => {
  return (
    <div className="space-y-4 font-mono text-xs text-neutral-300 pb-8">
      <div className="flex items-center justify-between border-b border-[#242c37] pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          VERIFIED FORMULA 1 INTELLIGENCE BRIEFING
        </h2>
        <span className="text-[11px] text-neutral-400">
          SOURCE-ATTRIBUTED ONLY
        </span>
      </div>

      <div className="space-y-3">
        {news.map((item) => (
          <article
            key={item.id}
            className="border border-[#242c37] bg-[#111418] p-4 hover:border-[#3b4759] transition-colors"
          >
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-2">
              <span className="font-bold text-neutral-200 uppercase">{item.category}</span>
              <span className="text-neutral-600">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-300">{item.source}</span>
              {item.verified && (
                <>
                  <span className="text-neutral-600">·</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3 h-3" />
                    <span>VERIFIED SOURCE</span>
                  </span>
                </>
              )}
            </div>

            <h3 className="text-sm font-bold text-white mb-2 leading-snug">
              {item.title}
            </h3>

            <p className="text-xs text-neutral-300 leading-relaxed font-sans mb-3">
              {item.summary}
            </p>

            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white underline decoration-neutral-600 transition-colors"
            >
              <span>Read official release at {item.source}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </article>
        ))}
      </div>

      {/* Provenance */}
      <ProvenanceBadge
        provenance={{
          provider: 'Curated Technical',
          sourceUrl: 'https://www.fia.com/news',
          retrievedAt: new Date().toISOString(),
          isLive: false,
          isFixture: false,
          notes: 'Source-attributed official FIA & F1 communications'
        }}
      />
    </div>
  );
};
