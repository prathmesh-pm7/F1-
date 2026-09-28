import React from 'react';

interface Props { title: string; kicker: string; description: string; children?: React.ReactNode; }

export const PageHero: React.FC<Props> = ({ title, kicker, description, children }) => (
  <div className="f1-page-hero">
    <div>
      <span className="f1-page-kicker">{kicker}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {children}
  </div>
);
