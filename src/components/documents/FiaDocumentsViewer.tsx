import React, { useState } from 'react';
import { FileText, ExternalLink, Search } from 'lucide-react';
import { FIADocument } from '../../types/f1';

interface Props { documents: FIADocument[]; }

export const FiaDocumentsViewer: React.FC<Props> = ({ documents }) => {
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const types = Array.from(new Set(documents.map(document => document.type)));
  const filtered = documents.filter(document => (filterType === 'ALL' || document.type === filterType) && [document.title, String(document.docNumber), document.type].some(value => value.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="f1-info-page">
      <div className="f1-page-hero"><div><span className="f1-page-kicker">FIA OFFICIAL DOCUMENT CONTROL</span><h1>DOCUMENTS</h1><p>Decisions, race director notes, technical bulletins and official classifications.</p></div><div className="f1-live-badge">FIA</div></div>
      <div className="f1-filterbar"><div className="f1-search-field"><Search aria-hidden="true" /><input aria-label="Search FIA documents" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="SEARCH DOCUMENT OR NUMBER" /></div><div className="f1-chip-row">{['ALL', ...types].map(type => <button type="button" key={type} onClick={() => setFilterType(type)} className={filterType === type ? 'is-active' : ''} aria-pressed={filterType === type}>{type}</button>)}</div></div>
      <div className="f1-doc-grid">
        {filtered.map(document => <article key={document.id} className="f1-doc-card"><div className="f1-doc-icon"><FileText aria-hidden="true" /></div><div className="f1-doc-number">DOC {document.docNumber}</div><h2>{document.title}</h2><div className="f1-doc-meta"><span>{document.type}</span><span>{document.session || 'GENERAL'}</span><span>{document.date} {document.time}</span></div><a href={document.documentUrl} target="_blank" rel="noopener noreferrer">OPEN OFFICIAL DOCUMENT <ExternalLink aria-hidden="true" /></a></article>)}
      </div>
    </div>
  );
};
