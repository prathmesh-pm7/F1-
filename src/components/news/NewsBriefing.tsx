import React from 'react';
import { NewsItem } from '../../types/f1';
import { ExternalLink,Clock,CheckCircle } from 'lucide-react';
interface Props {news:NewsItem[]}
export const NewsBriefing:React.FC<Props>=({news})=><div className="f1-info-page">
 <div className="f1-page-hero"><div><span className="f1-page-kicker">FORMULA 1 INTELLIGENCE</span><h1>LATEST</h1><p>Source-attributed updates from official Formula 1 and FIA communications.</p></div><div className="f1-live-badge">VERIFIED FEED</div></div>
 {news.length===0?<div className="f1-empty-card">NO VERIFIED NEWS AVAILABLE</div>:<div className="f1-news-grid">{news.map((item,i)=><article key={item.id} className={'f1-news-card '+(i===0?'is-featured':'')}><div className="f1-news-index">0{String(i+1).slice(-1)}</div><div className="f1-news-body"><div className="f1-news-meta"><span>{item.category}</span><span><Clock/> {new Date(item.publishedAt).toLocaleDateString()}</span><span>{item.source}</span>{item.verified&&<b><CheckCircle/> VERIFIED</b>}</div><h2>{item.title}</h2><p>{item.summary}</p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">READ SOURCE <ExternalLink/></a></div></article>)}</div>}
 </div>;
};
