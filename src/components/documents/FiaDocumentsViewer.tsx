import React,{useState} from 'react';
import { FIADocument } from '../../types/f1';
import { FileText,ExternalLink,Search } from 'lucide-react';
interface Props {documents:FIADocument[]}
export const FiaDocumentsViewer:React.FC<Props>=({documents})=>{const [filterType,setFilterType]=useState('ALL');const [searchTerm,setSearchTerm]=useState('');const types=Array.from(new Set(documents.map(d=>d.type)));const filtered=documents.filter(d=>(filterType==='ALL'||d.type===filterType)&&[d.title,String(d.docNumber),d.type].some(v=>v.toLowerCase().includes(searchTerm.toLowerCase())));return <div className="f1-info-page">
 <div className="f1-page-hero"><div><span className="f1-page-kicker">FIA OFFICIAL DOCUMENT CONTROL</span><h1>DOCUMENTS</h1><p>Decisions, race director notes, technical bulletins and official classifications.</p></div><div className="f1-live-badge">FIA</div></div>
 <div className="f1-filterbar"><div className="f1-search-field"><Search/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="SEARCH DOCUMENT OR NUMBER"/></div><div className="f1-chip-row">{['ALL',...types].map(t=><button key={t} onClick={()=>setFilterType(t)} className={filterType===t?'is-active':''}>{t}</button>)}</div></div>
 <div className="f1-doc-grid">{filtered.map(doc=><article key={doc.id} className="f1-doc-card"><div className="f1-doc-icon"><FileText/></div><div className="f1-doc-number">DOC {doc.docNumber}</div><h2>{doc.title}</h2><div className="f1-doc-meta"><span>{doc.type}</span><span>{doc.session||'GENERAL'}</span><span>{doc.date} {doc.time}</span></div><a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">OPEN OFFICIAL DOCUMENT <ExternalLink/></a></article>)}</div>
 </div>};
