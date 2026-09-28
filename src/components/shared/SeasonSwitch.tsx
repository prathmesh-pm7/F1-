import React from 'react';

interface Props { seasons: number[]; selectedSeason: number; onSelect: (season: number) => void; }

export const SeasonSwitch: React.FC<Props> = ({ seasons, selectedSeason, onSelect }) => (
  <div className="f1-season-switch" aria-label="Season">
    {seasons.map(season => (
      <button key={season} type="button" onClick={() => onSelect(season)} className={selectedSeason === season ? 'is-active' : ''} aria-pressed={selectedSeason === season}>
        {season}
      </button>
    ))}
  </div>
);
