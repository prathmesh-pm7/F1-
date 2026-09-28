import React, { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { TechnicalUpdate } from '../../types/f1';

interface Props { updates: TechnicalUpdate[]; }

export const TechnicalUpdatesFeed: React.FC<Props> = ({ updates }) => {
  const [filterTeam, setFilterTeam] = useState('ALL');
  const teams = Array.from(new Set(updates.map(update => update.team)));
  const filtered = filterTeam === 'ALL' ? updates : updates.filter(update => update.team === filterTeam);

  return (
    <div className="f1-info-page">
      <div className="f1-page-hero"><div><span className="f1-page-kicker">CAR DEVELOPMENT / FIA SUBMISSIONS</span><h1>TECHNICAL</h1><p>Aerodynamic, chassis, cooling and power-unit changes recorded through the season.</p></div><div className="f1-live-badge">TECHNICAL FEED</div></div>
      <div className="f1-chip-row">
        <button type="button" onClick={() => setFilterTeam('ALL')} className={filterTeam === 'ALL' ? 'is-active' : ''} aria-pressed={filterTeam === 'ALL'}>ALL</button>
        {teams.map(team => <button type="button" key={team} onClick={() => setFilterTeam(team)} className={filterTeam === team ? 'is-active' : ''} aria-pressed={filterTeam === team}>{team}</button>)}
      </div>
      <div className="f1-tech-grid">
        {filtered.map((item, index) => (
          <article key={item.id} className="f1-tech-card" style={{ '--tech-color': item.teamColor } as React.CSSProperties}>
            <div className="f1-tech-card-top"><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.team}</strong><em>{item.updateType}</em></div>
            <h2>{item.component}</h2><p>{item.summary}</p><div className="f1-tech-description">{item.technicalDescription}</div>
            <div className="f1-tech-footer"><span>{item.weekend}</span><span>{item.submissionDate}</span>{item.status === 'VERIFIED' ? <b className="verified"><CheckCircle2 /> FIA VERIFIED</b> : <b className="reported"><AlertCircle /> REPORTED</b>}</div>
          </article>
        ))}
      </div>
    </div>
  );
};
